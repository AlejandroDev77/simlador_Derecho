from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class LegalRole(str, Enum):
    JUEZ = "juez"
    FISCAL = "fiscal"
    DEMANDANTE = "demandante"
    ABOGADO_DEMANDANTE = "abogado_demandante"
    DEMANDADO = "demandado"
    ABOGADO_DEMANDADO = "abogado_demandado"
    TESTIGO = "testigo"
    PERITO = "perito"


class ProceduralStage(str, Enum):
    INTRODUCCION_JUEZ = "introduccion_juez"
    ARGUMENTO = "argumento"
    CONTRAARGUMENTO = "contraargumento"
    REPLICA = "replica"
    REFUTACION = "refutacion"
    VEREDICTO_FINAL = "veredicto_final"
    CONCLUIDO = "concluido"


class SimulationStatus(str, Enum):
    EXPEDIENTE_CARGADO = "expediente_cargado"
    ANALIZADO = "analizado"
    ESCENARIO_LISTO = "escenario_listo"
    EN_CURSO = "en_curso"
    CONCLUIDO = "concluido"


class SourceReference(BaseModel):
    page_number: int = Field(..., description="Número de página de origen en el expediente")
    fragment_text: Optional[str] = Field(None, description="Cita textual o fragmento clave que respalda el dato")


class Fact(BaseModel):
    id: str
    description: str
    source_references: List[SourceReference] = []
    is_immutable: bool = True
    is_contested: bool = False  # Si está controvertido por las partes


class EvidenceType(str, Enum):
    DOCUMENTAL = "documental"
    TESTIMONIAL = "testimonial"
    PERICIAL = "pericial"
    MATERIAL = "material"


class Evidence(BaseModel):
    id: str
    name: str
    description: str
    evidence_type: EvidenceType
    source_references: List[SourceReference] = []
    is_admitted: bool = True


class Participant(BaseModel):
    id: str
    name: str
    role: LegalRole
    description: str
    is_fictional: bool = False  # True si es auxiliar ficticio para completar el rol
    model_3d_key: str = "persona1"  # "juez1", "juez2", "per2", "persona1"
    gender: str = "male"  # "male", "female"


class CaseAnalysis(BaseModel):
    case_title: str
    case_number: Optional[str] = None
    process_type: str = Field(..., description="Penal, Civil, Laboral, etc.")
    jurisdiction: Optional[str] = None
    facts: List[Fact] = []
    evidences: List[Evidence] = []
    identified_participants: List[Participant] = []
    legal_provisions: List[str] = []
    summary: str


class DecisionOption(BaseModel):
    id: str
    text: str
    legal_tactic: Optional[str] = None
    risk_level: Optional[str] = None  # bajo, medio, alto


class UserDecisionInput(BaseModel):
    selected_option_id: Optional[str] = None
    free_text_response: Optional[str] = None
    stage: ProceduralStage


class InterventionResponse(BaseModel):
    id: str
    speaker_role: LegalRole
    speaker_name: str
    text: str
    stage: ProceduralStage
    model_3d_key: str
    speaker_gender: str = "male"  # "male", "female"
    animation_state: str = "speaking"  # speaking, idle, listening
    created_at: datetime
    options: List[DecisionOption] = []  # Opciones para el próximo turno del usuario si le corresponde hablar


class SimulationSessionState(BaseModel):
    id: str
    case_file_id: str
    user_role: LegalRole
    current_stage: ProceduralStage
    status: SimulationStatus
    interventions_count: int
    created_at: datetime
    updated_at: datetime


class AcademicEvaluation(BaseModel):
    case_id: str
    simulation_id: str
    academic_disclaimer: str = (
        "AVISO ACADÉMICO: Esta resolución y evaluación son una simulación con fines formativos "
        "y de práctica profesional. No constituyen una sentencia judicial real ni asesoría jurídica oficial."
    )
    verdict: str
    ruling_summary: str
    score_coherence: float = Field(..., ge=0, le=100)
    score_fidelity_to_facts: float = Field(..., ge=0, le=100)
    score_evidence_usage: float = Field(..., ge=0, le=100)
    final_feedback: str
    strengths: List[str] = []
    areas_for_improvement: List[str] = []


class TrialProgressInfo(BaseModel):
    estimated_total_minutes: int = 5
    estimated_remaining_minutes: int = 5
    total_stages: int = 6
    current_stage_number: int = 1
    current_stage_label: str = "1. Introducción del Juez"
    current_turn_number: int = 1
    total_estimated_turns: int = 6
    progress_percent: int = 15


