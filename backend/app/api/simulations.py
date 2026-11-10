import uuid
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import (
    CaseFileModel, SimulationSessionModel, InterventionModel,
    UserDecisionModel, AcademicEvaluationModel
)
from app.models.schemas import (
    LegalRole, ProceduralStage, SimulationStatus, CaseAnalysis,
    Participant, UserDecisionInput
)
from app.services.llm_service import LLMService

router = APIRouter(prefix="/simulations", tags=["Simulaciones"])
llm_service = LLMService()


def resolve_speaker_gender(speaker_name: str, speaker_role: str = "", participants: list = None) -> str:
    """
    Determina si la voz del orador debe ser femenina o masculina basándose en los metadatos del caso o rasgos lingüísticos.
    """
    if participants:
        for p in participants:
            p_name = p.name if hasattr(p, 'name') else p.get('name', '')
            if p_name and (p_name.lower() in speaker_name.lower() or speaker_name.lower() in p_name.lower()):
                g = getattr(p, 'gender', None) or (p.get('gender') if isinstance(p, dict) else None)
                if g in ("male", "female"):
                    return g

    combined = f"{speaker_name} {speaker_role}".lower()
    female_patterns = [
        r'\bdoña\b', r'\bdña\b', r'\bdra\b', r'\bsra\b', r'\bsenora\b', r'\bseñora\b',
        r'\babogada\b', r'\bjueza\b', r'\bfiscala\b', r'\bmagistrada\b', r'\bdefensora\b',
        r'\bcarmen\b', r'\bmar[ií]a\b', r'\belena\b', r'\blaura\b', r'\bana\b',
        r'\brosa\b', r'\bluc[ií]a\b', r'\bisabel\b', r'\bpatricia\b', r'\bsof[ií]a\b',
        r'\bclaudia\b', r'\bteresa\b', r'\bm[oó]nica\b', r'\bbeatriz\b', r'\bsilvia\b',
        r'\bmarta\b', r'\bcristina\b', r'\bandrea\b', r'\bpaula\b', r'\bvaleria\b'
    ]
    for pat in female_patterns:
        if re.search(pat, combined):
            return "female"
    return "male"


class SpeechRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    gender: Optional[str] = "male"
    speed: Optional[float] = 1.0


@router.post("/speech")
def generate_speech(req: SpeechRequest):
    """
    Genera audio MP3 mediante OpenAI TTS con selección de voz adaptativa según el género del orador.
    """
    voice = req.voice
    if not voice:
        # Default adaptativo por género
        voice = "nova" if req.gender == "female" else "onyx"

    try:
        audio_bytes = llm_service.generate_speech_audio(
            text=req.text,
            voice=voice,
            speed=req.speed or 1.0
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando síntesis de voz: {str(e)}")


class StartSimulationInput(BaseModel):
    case_id: str
    user_role: LegalRole


class DecisionSubmission(BaseModel):
    selected_option_id: Optional[str] = None
    free_text_response: Optional[str] = None


class ObjectionSubmission(BaseModel):
    grounds: str
    details: Optional[str] = None


@router.post("/start")
def start_simulation(
    input_data: StartSimulationInput,
    db: Session = Depends(get_db)
):
    """
    Fase 5 y 6: Construcción de escenario e inicio del juicio en sala.
    """
    case_file = db.query(CaseFileModel).filter(CaseFileModel.id == input_data.case_id).first()
    if not case_file or not case_file.analysis:
        raise HTTPException(status_code=400, detail="El expediente debe estar analizado antes de iniciar la simulación.")

    analysis = CaseAnalysis(**case_file.analysis)

    # Crear sesión de simulación
    session = SimulationSessionModel(
        case_file_id=case_file.id,
        user_role=input_data.user_role.value,
        current_stage=ProceduralStage.APERTURA.value,
        status=SimulationStatus.EN_CURSO.value
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Localizar al Juez para que abra la audiencia
    juez_participant = next(
        (p for p in analysis.identified_participants if p.role == LegalRole.JUEZ),
        Participant(
            id="juez_default",
            name="Juez Presidente",
            role=LegalRole.JUEZ,
            description="Presidencia del tribunal",
            model_3d_key="juez1"
        )
    )

    # Generar la intervención de apertura del juez
    turn_data = llm_service.generate_dialogue_turn(
        case_analysis=analysis,
        history=[],
        stage=ProceduralStage.APERTURA,
        user_role=input_data.user_role,
        active_speaker=juez_participant
    )

    opening_intervention = InterventionModel(
        session_id=session.id,
        speaker_role=juez_participant.role.value,
        speaker_name=juez_participant.name,
        stage=ProceduralStage.APERTURA.value,
        text=turn_data.get("text", "Se declara abierta la presente audiencia judicial. Las partes procederán con sus alegatos iniciales."),
        is_user=False,
        model_3d_key=juez_participant.model_3d_key,
        options=turn_data.get("options_for_user", [])
    )
    db.add(opening_intervention)
    db.commit()
    db.refresh(opening_intervention)

    return {
        "session_id": session.id,
        "case_title": analysis.case_title,
        "process_type": analysis.process_type,
        "user_role": session.user_role,
        "current_stage": session.current_stage,
        "participants": [p.model_dump() for p in analysis.identified_participants],
        "initial_intervention": {
            "id": opening_intervention.id,
            "speaker_role": opening_intervention.speaker_role,
            "speaker_name": opening_intervention.speaker_name,
            "stage": opening_intervention.stage,
            "text": opening_intervention.text,
            "model_3d_key": opening_intervention.model_3d_key,
            "speaker_gender": resolve_speaker_gender(opening_intervention.speaker_name, opening_intervention.speaker_role, analysis.identified_participants),
            "options": opening_intervention.options or []
        }
    }


@router.get("/{session_id}")
def get_simulation_state(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene el estado completo, historial y opciones actuales de la simulación.
    """
    session = db.query(SimulationSessionModel).filter(SimulationSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    case_analysis = CaseAnalysis(**session.case_file.analysis)

    interventions = [
        {
            "id": i.id,
            "speaker_role": i.speaker_role,
            "speaker_name": i.speaker_name,
            "stage": i.stage,
            "text": i.text,
            "is_user": i.is_user,
            "model_3d_key": i.model_3d_key,
            "speaker_gender": resolve_speaker_gender(i.speaker_name, i.speaker_role, case_analysis.identified_participants),
            "options": i.options or [],
            "created_at": i.created_at
        } for i in session.interventions
    ]

    latest_intervention = interventions[-1] if interventions else None

    return {
        "session_id": session.id,
        "case_title": case_analysis.case_title,
        "user_role": session.user_role,
        "current_stage": session.current_stage,
        "status": session.status,
        "participants": [p.model_dump() for p in case_analysis.identified_participants],
        "facts": [f.model_dump() for f in case_analysis.facts],
        "evidences": [e.model_dump() for e in case_analysis.evidences],
        "interventions": interventions,
        "current_options": latest_intervention["options"] if latest_intervention else []
    }


@router.post("/{session_id}/decision")
def submit_decision(
    session_id: str,
    submission: DecisionSubmission,
    db: Session = Depends(get_db)
):
    """
    Fase 6 y 8: Procesa la decisión o argumento del usuario y genera la respuesta de la contraparte o el tribunal.
    """
    session = db.query(SimulationSessionModel).filter(SimulationSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    if session.status == SimulationStatus.CONCLUIDO.value:
        raise HTTPException(status_code=400, detail="La simulación ya ha concluido.")

    case_analysis = CaseAnalysis(**session.case_file.analysis)

    # 1. Determinar el texto del usuario
    user_text = submission.free_text_response
    if submission.selected_option_id and session.interventions:
        last_options = session.interventions[-1].options or []
        for opt in last_options:
            if opt.get("id") == submission.selected_option_id:
                user_text = opt.get("text")
                break

    if not user_text:
        raise HTTPException(status_code=400, detail="Debes seleccionar una opción o escribir una intervención.")

    # Control de fidelidad forense si el usuario escribe texto libre
    is_faithful = True
    fidelity_notes = None
    if submission.free_text_response:
        is_faithful, fidelity_notes = llm_service.check_user_fidelity(case_analysis, submission.free_text_response)

    # Guardar intervención del usuario
    user_intervention = InterventionModel(
        session_id=session.id,
        speaker_role=session.user_role,
        speaker_name="Usuario (Tú)",
        stage=session.current_stage,
        text=user_text,
        is_user=True,
        model_3d_key="persona1",
        options=[]
    )
    db.add(user_intervention)

    # Guardar registro de decisión
    user_decision = UserDecisionModel(
        session_id=session.id,
        stage=session.current_stage,
        selected_option_id=submission.selected_option_id,
        free_text_response=submission.free_text_response,
        legal_consequence="Intervención registrada y ponderada en el debate procesal." if is_faithful else f"Apercibimiento por falta de fidelidad: {fidelity_notes}",
        fidelity_valid=is_faithful,
        fidelity_notes=fidelity_notes
    )
    db.add(user_decision)
    db.commit()

    # 2. Determinar transición de etapa y siguiente personaje que interviene
    stage_transitions = [
        ProceduralStage.APERTURA.value,
        ProceduralStage.ALEGATOS_INICIALES.value,
        ProceduralStage.DESAHOGO_PRUEBAS.value,
        ProceduralStage.ALEGATOS_FINALES.value,
        ProceduralStage.DELIBERACION_SENTENCIA.value,
        ProceduralStage.CONCLUIDO.value
    ]

    current_idx = stage_transitions.index(session.current_stage) if session.current_stage in stage_transitions else 0
    # Avanzar etapa gradualmente cada 2 o 3 turnos
    stage_intervention_count = len([i for i in session.interventions if i.stage == session.current_stage])
    if stage_intervention_count >= 2 and current_idx < len(stage_transitions) - 2:
        session.current_stage = stage_transitions[current_idx + 1]
        db.commit()

    # Siguiente orador: juez o contraparte
    is_judge_next = (len(session.interventions) % 2 == 0)
    if is_judge_next:
        next_speaker = next(
            (p for p in case_analysis.identified_participants if p.role == LegalRole.JUEZ),
            Participant(id="juez_1", name="Juez Presidente", role=LegalRole.JUEZ, description="Tribunal", model_3d_key="juez1")
        )
    else:
        # Contraparte (alguien distinto al usuario y al juez)
        counterparts = [
            p for p in case_analysis.identified_participants
            if p.role.value != session.user_role and p.role != LegalRole.JUEZ
        ]
        next_speaker = counterparts[0] if counterparts else Participant(
            id="contraparte_1",
            name="Contraparte Procesal",
            role=LegalRole.DEMANDADO if "demandante" in session.user_role else LegalRole.DEMANDANTE,
            description="Abogado de la contraparte",
            model_3d_key="per2"
        )

    # 3. Generar la respuesta con el LLM
    history_for_llm = [
        {
            "speaker_name": i.speaker_name,
            "text": i.text,
            "is_user": i.is_user,
            "stage": i.stage
        } for i in session.interventions
    ]

    turn_data = llm_service.generate_dialogue_turn(
        case_analysis=case_analysis,
        history=history_for_llm,
        stage=ProceduralStage(session.current_stage),
        user_role=LegalRole(session.user_role),
        active_speaker=next_speaker
    )

    response_text = turn_data.get("text", "El tribunal toma nota de las manifestaciones vertidas.")
    if not is_faithful and fidelity_notes:
        response_text = f"¡Atención del Tribunal! Se formula reparo procesal: {fidelity_notes}. La parte debe ceñirse a las constancias de autos.\n\n{response_text}"

    ia_intervention = InterventionModel(
        session_id=session.id,
        speaker_role=next_speaker.role.value,
        speaker_name=next_speaker.name,
        stage=session.current_stage,
        text=response_text,
        is_user=False,
        model_3d_key=next_speaker.model_3d_key,
        options=turn_data.get("options_for_user", [])
    )
    db.add(ia_intervention)
    db.commit()
    db.refresh(ia_intervention)

    return {
        "current_stage": session.current_stage,
        "user_intervention": {
            "id": user_intervention.id,
            "text": user_intervention.text,
            "speaker_gender": resolve_speaker_gender(user_intervention.speaker_name, user_intervention.speaker_role, case_analysis.identified_participants)
        },
        "next_intervention": {
            "id": ia_intervention.id,
            "speaker_role": ia_intervention.speaker_role,
            "speaker_name": ia_intervention.speaker_name,
            "stage": ia_intervention.stage,
            "text": ia_intervention.text,
            "model_3d_key": ia_intervention.model_3d_key,
            "speaker_gender": resolve_speaker_gender(ia_intervention.speaker_name, ia_intervention.speaker_role, case_analysis.identified_participants),
            "options": ia_intervention.options or []
        }
    }


@router.post("/{session_id}/objection")
def submit_objection(
    session_id: str,
    objection: ObjectionSubmission,
    db: Session = Depends(get_db)
):
    """
    Permite a la parte formular una objeción forense en tiempo real.
    El Juez resuelve motivadamente si 'Ha lugar' o 'No ha lugar'.
    """
    session = db.query(SimulationSessionModel).filter(SimulationSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    case_analysis = CaseAnalysis(**session.case_file.analysis)

    juez = next(
        (p for p in case_analysis.identified_participants if p.role == LegalRole.JUEZ),
        Participant(id="juez_1", name="Juez Presidente", role=LegalRole.JUEZ, description="Tribunal", model_3d_key="juez1")
    )

    user_int = InterventionModel(
        session_id=session.id,
        speaker_role=session.user_role,
        speaker_name="Usuario (Tú)",
        stage=session.current_stage,
        text=f"¡Objeción, Señoría! Causal: {objection.grounds}." + (f" Fundamento: {objection.details}" if objection.details else ""),
        is_user=True,
        model_3d_key="persona1",
        options=[]
    )
    db.add(user_int)

    last_opponent_text = session.interventions[-1].text if session.interventions else ""
    prompt = (
        f"El letrado formula la siguiente objeción en sala: '{objection.grounds}'.\n"
        f"CASO: {case_analysis.case_title}\n"
        f"ÚLTIMA MANIFESTACIÓN: '{last_opponent_text}'\n\n"
        "Como Magistrado-Juez, resuelve de forma concisa y solemne declarando 'HA LUGAR' o 'NO HA LUGAR' con breve motivación procesal (máximo 2 oraciones)."
    )
    ruling = llm_service.client.chat.completions.create(
        model=llm_service.model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    ).choices[0].message.content.strip()

    juez_int = InterventionModel(
        session_id=session.id,
        speaker_role=LegalRole.JUEZ.value,
        speaker_name=juez.name,
        stage=session.current_stage,
        text=ruling,
        is_user=False,
        model_3d_key=juez.model_3d_key,
        options=[]
    )
    db.add(juez_int)
    db.commit()
    db.refresh(juez_int)

    return {
        "decision": "ha_lugar" if ("HA LUGAR" in ruling.upper() and "NO HA LUGAR" not in ruling.upper()) else "no_ha_lugar",
        "user_intervention": {
            "id": user_int.id,
            "text": user_int.text
        },
        "ruling_intervention": {
            "id": juez_int.id,
            "speaker_name": juez_int.speaker_name,
            "speaker_role": juez_int.speaker_role,
            "stage": juez_int.stage,
            "text": juez_int.text,
            "model_3d_key": juez_int.model_3d_key,
            "speaker_gender": resolve_speaker_gender(juez_int.speaker_name, juez_int.speaker_role, case_analysis.identified_participants)
        }
    }


@router.post("/{session_id}/evaluate")
def evaluate_simulation(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Fase 10: Cierre, resolución simulada e informe de evaluación académica.
    """
    session = db.query(SimulationSessionModel).filter(SimulationSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    case_analysis = CaseAnalysis(**session.case_file.analysis)

    history = [
        {
            "speaker_name": i.speaker_name,
            "text": i.text,
            "is_user": i.is_user,
            "stage": i.stage
        } for i in session.interventions
    ]

    decisions = [
        {
            "stage": d.stage,
            "option": d.selected_option_id,
            "free_text": d.free_text_response
        } for d in session.decisions
    ]

    evaluation = llm_service.evaluate_simulation(
        case_analysis=case_analysis,
        history=history,
        decisions=decisions,
        user_role=LegalRole(session.user_role)
    )

    session.status = SimulationStatus.CONCLUIDO.value
    session.current_stage = ProceduralStage.CONCLUIDO.value

    # Guardar en BD
    eval_model = AcademicEvaluationModel(
        session_id=session.id,
        academic_disclaimer=evaluation.academic_disclaimer,
        verdict=evaluation.verdict,
        ruling_summary=evaluation.ruling_summary,
        score_coherence=evaluation.score_coherence,
        score_fidelity_to_facts=evaluation.score_fidelity_to_facts,
        score_evidence_usage=evaluation.score_evidence_usage,
        final_feedback=evaluation.final_feedback,
        strengths=evaluation.strengths,
        areas_for_improvement=evaluation.areas_for_improvement
    )
    db.add(eval_model)
    db.commit()
    db.refresh(eval_model)

    return evaluation.model_dump()

