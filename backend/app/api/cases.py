from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import CaseFileModel
from app.models.schemas import CaseAnalysis
from app.services.document_processor import DocumentProcessorService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/cases", tags=["Expedientes"])
llm_service = LLMService()


@router.post("/upload")
async def upload_case_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Fase 2 y 3: Carga y extracción del expediente judicial (PDF, DOCX, TXT).
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        raw_text, pages_data, page_count = DocumentProcessorService.process_file(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el documento: {str(e)}")

    case_file = CaseFileModel(
        filename=file.filename,
        file_type=file.filename.split(".")[-1].lower(),
        file_size=len(content),
        page_count=page_count,
        raw_text=raw_text,
        extracted_text_by_pages=pages_data
    )
    db.add(case_file)
    db.commit()
    db.refresh(case_file)

    return {
        "id": case_file.id,
        "filename": case_file.filename,
        "page_count": case_file.page_count,
        "char_count": len(raw_text),
        "pages_preview": pages_data[:3],  # Primeras 3 páginas para vista previa
        "status": "cargado_y_extraido"
    }


@router.post("/{case_id}/analyze")
def analyze_case(
    case_id: str,
    db: Session = Depends(get_db)
):
    """
    Fase 4: Análisis jurídico estructurado con OpenAI.
    Extrae hechos, pruebas, participantes y roles respetando el expediente.
    """
    case_file = db.query(CaseFileModel).filter(CaseFileModel.id == case_id).first()
    if not case_file:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    if not case_file.raw_text:
        raise HTTPException(status_code=400, detail="El expediente no posee texto extraído para analizar.")

    try:
        analysis: CaseAnalysis = llm_service.analyze_case(case_file.raw_text)
        case_file.analysis = analysis.model_dump()
        db.commit()
        db.refresh(case_file)
        return case_file.analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis de IA: {str(e)}")


@router.get("/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene los datos del expediente y su análisis si ya fue ejecutado.
    """
    case_file = db.query(CaseFileModel).filter(CaseFileModel.id == case_id).first()
    if not case_file:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    return {
        "id": case_file.id,
        "filename": case_file.filename,
        "file_type": case_file.file_type,
        "file_size": case_file.file_size,
        "page_count": case_file.page_count,
        "extracted_text_by_pages": case_file.extracted_text_by_pages,
        "analysis": case_file.analysis,
        "created_at": case_file.created_at
    }


@router.put("/{case_id}/analysis")
def update_case_analysis(
    case_id: str,
    analysis_update: CaseAnalysis,
    db: Session = Depends(get_db)
):
    """
    Permite al usuario revisar, corregir o enriquecer manualmente
    el análisis jurídico antes de iniciar la simulación.
    """
    case_file = db.query(CaseFileModel).filter(CaseFileModel.id == case_id).first()
    if not case_file:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    case_file.analysis = analysis_update.model_dump()
    db.commit()
    db.refresh(case_file)

    return {"message": "Análisis actualizado correctamente", "analysis": case_file.analysis}

