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

STAGE_PROGRESS_MAP = [
    {"stage": ProceduralStage.APERTURA.value, "label": "Apertura y Cuestiones Previas", "minutes": 3, "order": 1},
    {"stage": ProceduralStage.ALEGATOS_INICIALES.value, "label": "Alegatos Iniciales", "minutes": 4, "order": 2},
    {"stage": ProceduralStage.DESAHOGO_PRUEBAS.value, "label": "Desahogo de Pruebas y Testificales", "minutes": 6, "order": 3},
    {"stage": ProceduralStage.ALEGATOS_FINALES.value, "label": "Alegatos Finales / Conclusiones", "minutes": 4, "order": 4},
    {"stage": ProceduralStage.DELIBERACION_SENTENCIA.value, "label": "Deliberación y Sentencia", "minutes": 3, "order": 5},
    {"stage": ProceduralStage.CONCLUIDO.value, "label": "Audiencia Concluida", "minutes": 0, "order": 5},
]


def calculate_trial_progress(session: SimulationSessionModel) -> dict:
    """Calcula el tiempo total estimado, tiempo restante y avance procesal."""
    total_stages = 5
    total_estimated_turns = 12
    total_estimated_minutes = 20

    current_stage_str = session.current_stage
    current_stage_info = next(
        (s for s in STAGE_PROGRESS_MAP if s["stage"] == current_stage_str),
        STAGE_PROGRESS_MAP[0]
    )

    stage_order = current_stage_info["order"]
    stage_label = current_stage_info["label"]

    remaining_minutes = sum(
        s["minutes"] for s in STAGE_PROGRESS_MAP if s["order"] >= stage_order and s["stage"] != ProceduralStage.CONCLUIDO.value
    )
    if current_stage_str == ProceduralStage.CONCLUIDO.value:
        remaining_minutes = 0

    current_turn = len(session.interventions)
    pct = min(98, max(5, int((current_turn / total_estimated_turns) * 100)))
    if current_stage_str == ProceduralStage.CONCLUIDO.value:
        pct = 100

    return {
        "estimated_total_minutes": total_estimated_minutes,
        "estimated_remaining_minutes": remaining_minutes,
        "total_stages": total_stages,
        "current_stage_number": stage_order,
        "current_stage_label": stage_label,
        "current_turn_number": max(1, current_turn),
        "total_estimated_turns": total_estimated_turns,
        "progress_percent": pct
    }


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

    # Si el usuario es el Juez, el Letrado de la Administración de Justicia / Secretario
    # constituye formalmente la sala y el alumno (Juez) recibe las directivas para abrir la sesión
    if input_data.user_role == LegalRole.JUEZ:
        fact_ref = analysis.facts[0].description if analysis.facts else "los hechos controvertidos"
        initial_judge_options = [
            {
                "id": "opt_juez_open_1",
                "text": "Se declara formalmente abierta la sesión de audiencia ordinaria. Concedo la palabra a la representación letrada de la acusación para que exponga sus alegatos iniciales.",
                "legal_tactic": "Apertura y turno a la acusación",
                "risk_level": "bajo"
            },
            {
                "id": "opt_juez_open_2",
                "text": "Abierta la sesión pública. Con carácter previo a las alegaciones de fondo, consulto a las partes si existe posibilidad de acuerdo o cuestiones procesales previas que resolver.",
                "legal_tactic": "Cuestiones previas y avenencia",
                "risk_level": "medio"
            },
            {
                "id": "opt_juez_open_3",
                "text": f"Se declara abierto el juicio. Exhorto a los letrados a ceñirse con concisión a {fact_ref} y apercibo contra digresiones impertinentes. Tiene la palabra la acusación.",
                "legal_tactic": "Dirección rigurosa de sala",
                "risk_level": "alto"
            }
        ]
        opening_intervention = InterventionModel(
            session_id=session.id,
            speaker_role="secretario",
            speaker_name="Secretaría del Tribunal",
            stage=ProceduralStage.APERTURA.value,
            text=f"En la Sala de Vistas se constituye el Tribunal en audiencia pública para la vista del juicio. Comparecen las partes en estrados. Preside la sesión su Señoría.",
            is_user=False,
            model_3d_key="juez1",
            options=initial_judge_options
        )
    else:
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
        "progress_info": calculate_trial_progress(session),
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
        "progress_info": calculate_trial_progress(session),
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
        for inv in reversed(session.interventions):
            if inv.options:
                for opt in inv.options:
                    if opt.get("id") == submission.selected_option_id:
                        user_text = opt.get("text")
                        break
            if user_text:
                break

    if not user_text:
        raise HTTPException(status_code=400, detail="Debes seleccionar una opción o escribir una intervención.")

    # Control de fidelidad forense si el usuario escribe texto libre
    is_faithful = True
    fidelity_notes = None
    if submission.free_text_response:
        is_faithful, fidelity_notes = llm_service.check_user_fidelity(case_analysis, submission.free_text_response)

    is_judge = (session.user_role == LegalRole.JUEZ.value)
    user_name = "Tú (Magistrado Presidente)" if is_judge else "Usuario (Tú)"
    user_model_key = "juez1" if is_judge else ("abogada1_mujer" if session.user_role == LegalRole.ABOGADO_DEMANDADO.value else "abogado1_hombre")

    # Guardar intervención del usuario
    user_intervention = InterventionModel(
        session_id=session.id,
        speaker_role=session.user_role,
        speaker_name=user_name,
        stage=session.current_stage,
        text=user_text,
        is_user=True,
        model_3d_key=user_model_key,
        options=[]
    )
    db.add(user_intervention)

    # Guardar registro de decisión
    user_decision = UserDecisionModel(
        session_id=session.id,
        stage=session.current_stage,
        selected_option_id=submission.selected_option_id,
        free_text_response=submission.free_text_response,
        legal_consequence="Resolución judicial registrada en autos." if is_judge else ("Intervención registrada y ponderada en el debate procesal." if is_faithful else f"Apercibimiento por falta de fidelidad: {fidelity_notes}"),
        fidelity_valid=is_faithful,
        fidelity_notes=fidelity_notes
    )
    db.add(user_decision)
    db.commit()

    # 2. Determinar transición de etapa
    stage_transitions = [
        ProceduralStage.APERTURA.value,
        ProceduralStage.ALEGATOS_INICIALES.value,
        ProceduralStage.DESAHOGO_PRUEBAS.value,
        ProceduralStage.ALEGATOS_FINALES.value,
        ProceduralStage.DELIBERACION_SENTENCIA.value,
        ProceduralStage.CONCLUIDO.value
    ]

    current_idx = stage_transitions.index(session.current_stage) if session.current_stage in stage_transitions else 0
    stage_intervention_count = len([i for i in session.interventions if i.stage == session.current_stage])
    if stage_intervention_count >= 2 and current_idx < len(stage_transitions) - 2:
        session.current_stage = stage_transitions[current_idx + 1]
        db.commit()

    # 3. Identificar participantes procesales para debate coral auténtico
    juez_p = next(
        (p for p in case_analysis.identified_participants if p.role == LegalRole.JUEZ),
        Participant(id="juez_1", name="Juez Presidente del Tribunal", role=LegalRole.JUEZ, description="Magistrado a cargo de la sala", model_3d_key="juez1", gender="male")
    )

    plaintiff_lawyer = next(
        (p for p in case_analysis.identified_participants if (
            p.role in (LegalRole.ABOGADO_DEMANDANTE, LegalRole.FISCAL)
        )),
        Participant(
            id="abogado_acusacion",
            name="Letrado de la Acusación",
            role=LegalRole.ABOGADO_DEMANDANTE,
            description="Abogado de la parte actora",
            model_3d_key="abogado1_hombre",
            gender="male"
        )
    )

    defense_lawyer = next(
        (p for p in case_analysis.identified_participants if (
            p.role in (LegalRole.ABOGADO_DEMANDADO, LegalRole.DEMANDADO) and "abogado" in p.role.value
        )),
        Participant(
            id="abogada_defensa",
            name="Letrada de la Defensa",
            role=LegalRole.ABOGADO_DEMANDADO,
            description="Abogada defensora",
            model_3d_key="abogada1_mujer",
            gender="female"
        )
    )

    is_user_plaintiff_side = ("demandante" in session.user_role or "fiscal" in session.user_role)
    opposing_lawyer = defense_lawyer if is_user_plaintiff_side else plaintiff_lawyer

    # Localizar parte representada (demandado/acusado o demandante)
    represented_party = next(
        (p for p in case_analysis.identified_participants if (
            p.role == LegalRole.DEMANDADO if is_user_plaintiff_side else p.role == LegalRole.DEMANDANTE
        )),
        Participant(
            id="parte_material",
            name="Parte Demandada (Acusado)" if is_user_plaintiff_side else "Parte Demandante",
            role=LegalRole.DEMANDADO if is_user_plaintiff_side else LegalRole.DEMANDANTE,
            description="Persona que presta testimonio y responde interrogatorio",
            model_3d_key="per2" if is_user_plaintiff_side else "persona1",
            gender="male" if is_user_plaintiff_side else "female"
        )
    )

    # 4. Generar secuencia coral de intervenciones
    interventions_to_return = []
    history_for_llm = [
        {
            "speaker_name": i.speaker_name,
            "text": i.text,
            "is_user": i.is_user,
            "stage": i.stage
        } for i in session.interventions
    ]

    current_stage_enum = ProceduralStage(session.current_stage)
    is_concluded = False
    evaluation_data = None

    if is_judge:
        # ========================================================
        # FLUJO ESPECIALIZADO: EL ALUMNO ES EL MAGISTRADO PRESIDENTE
        # ========================================================
        if current_stage_enum == ProceduralStage.DELIBERACION_SENTENCIA:
            # El usuario Juez acaba de dictar el fallo judicial definitivo en estrados
            inv_secretario = InterventionModel(
                session_id=session.id,
                speaker_role="secretario",
                speaker_name="Secretaría del Tribunal",
                stage=ProceduralStage.DELIBERACION_SENTENCIA.value,
                text="El Tribunal ha dictado formalmente la Sentencia Judicial en estrados. Queda registrado el Fallo definitivo en autos y formalmente concluida la vista oral.",
                is_user=False,
                model_3d_key="juez1",
                options=[]
            )
            db.add(inv_secretario)
            session.current_stage = ProceduralStage.CONCLUIDO.value
            session.status = SimulationStatus.CONCLUIDO.value
            db.commit()
            db.refresh(inv_secretario)
            interventions_to_return.append(inv_secretario)
            is_concluded = True

            # Evaluación académica inmediata de la dirección judicial
            try:
                history_eval = [
                    {"speaker_name": i.speaker_name, "text": i.text, "is_user": i.is_user, "stage": i.stage}
                    for i in session.interventions
                ]
                decisions_eval = [
                    {"stage": d.stage, "option": d.selected_option_id, "free_text": d.free_text_response}
                    for d in session.decisions
                ]
                eval_result = llm_service.evaluate_simulation(
                    case_analysis=case_analysis,
                    history=history_eval,
                    decisions=decisions_eval,
                    user_role=LegalRole.JUEZ
                )
                existing_eval = db.query(AcademicEvaluationModel).filter(AcademicEvaluationModel.session_id == session.id).first()
                if not existing_eval:
                    eval_model = AcademicEvaluationModel(
                        session_id=session.id,
                        academic_disclaimer=eval_result.academic_disclaimer,
                        verdict=eval_result.verdict,
                        ruling_summary=eval_result.ruling_summary,
                        score_coherence=eval_result.score_coherence,
                        score_fidelity_to_facts=eval_result.score_fidelity_to_facts,
                        score_evidence_usage=eval_result.score_evidence_usage,
                        final_feedback=eval_result.final_feedback,
                        strengths=eval_result.strengths,
                        areas_for_improvement=eval_result.areas_for_improvement
                    )
                    db.add(eval_model)
                else:
                    existing_eval.verdict = eval_result.verdict
                    existing_eval.ruling_summary = eval_result.ruling_summary
                    existing_eval.score_coherence = eval_result.score_coherence
                    existing_eval.score_fidelity_to_facts = eval_result.score_fidelity_to_facts
                    existing_eval.score_evidence_usage = eval_result.score_evidence_usage
                    existing_eval.final_feedback = eval_result.final_feedback
                    existing_eval.strengths = eval_result.strengths
                    existing_eval.areas_for_improvement = eval_result.areas_for_improvement
                db.commit()
                evaluation_data = eval_result.model_dump()
            except Exception as e:
                print(f"Aviso: Generación de evaluación diferida: {e}")
        else:
            # En etapas activas, comparece el letrado o declarante respondiendo directamente a su Señoría
            recent_speakers = [
                i.speaker_role for i in session.interventions
                if not i.is_user and i.speaker_role != "secretario"
            ]
            last_lawyer_role = recent_speakers[-1] if recent_speakers else None

            if current_stage_enum == ProceduralStage.DESAHOGO_PRUEBAS and len(session.interventions) % 3 == 0:
                speaker_now = represented_party
            elif last_lawyer_role in (LegalRole.ABOGADO_DEMANDANTE.value, LegalRole.FISCAL.value):
                speaker_now = defense_lawyer
            else:
                speaker_now = plaintiff_lawyer

            turn_lawyer = llm_service.generate_dialogue_turn(
                case_analysis=case_analysis,
                history=history_for_llm,
                stage=current_stage_enum,
                user_role=LegalRole.JUEZ,
                active_speaker=speaker_now
            )
            reply_text = turn_lawyer.get("text", "Con la venia de su Señoría, esta parte sostiene sus alegatos conforme a los autos.")

            inv_speaker = InterventionModel(
                session_id=session.id,
                speaker_role=speaker_now.role.value,
                speaker_name=speaker_now.name,
                stage=session.current_stage,
                text=reply_text,
                is_user=False,
                model_3d_key=speaker_now.model_3d_key,
                options=turn_lawyer.get("options_for_user", [])
            )
            db.add(inv_speaker)
            db.commit()
            db.refresh(inv_speaker)
            interventions_to_return.append(inv_speaker)
    else:
        # ========================================================
        # FLUJO CUANDO EL USUARIO ES UN LETRADO LITIGANTE
        # ========================================================
        if current_stage_enum == ProceduralStage.DELIBERACION_SENTENCIA:
            turn_juez = llm_service.generate_dialogue_turn(
                case_analysis=case_analysis,
                history=history_for_llm,
                stage=current_stage_enum,
                user_role=LegalRole(session.user_role),
                active_speaker=juez_p
            )
            inv_juez = InterventionModel(
                session_id=session.id,
                speaker_role=juez_p.role.value,
                speaker_name=juez_p.name,
                stage=ProceduralStage.DELIBERACION_SENTENCIA.value,
                text=turn_juez.get("text", "Visto para sentencia. El Tribunal dicta su resolución definitiva y declara formalmente concluida la sesión."),
                is_user=False,
                model_3d_key=juez_p.model_3d_key,
                options=[]
            )
            db.add(inv_juez)
            session.current_stage = ProceduralStage.CONCLUIDO.value
            session.status = SimulationStatus.CONCLUIDO.value
            db.commit()
            db.refresh(inv_juez)
            interventions_to_return.append(inv_juez)
            is_concluded = True

            try:
                history_eval = [
                    {"speaker_name": i.speaker_name, "text": i.text, "is_user": i.is_user, "stage": i.stage}
                    for i in session.interventions
                ]
                decisions_eval = [
                    {"stage": d.stage, "option": d.selected_option_id, "free_text": d.free_text_response}
                    for d in session.decisions
                ]
                eval_result = llm_service.evaluate_simulation(
                    case_analysis=case_analysis,
                    history=history_eval,
                    decisions=decisions_eval,
                    user_role=LegalRole(session.user_role)
                )

                existing_eval = db.query(AcademicEvaluationModel).filter(AcademicEvaluationModel.session_id == session.id).first()
                if not existing_eval:
                    eval_model = AcademicEvaluationModel(
                        session_id=session.id,
                        academic_disclaimer=eval_result.academic_disclaimer,
                        verdict=eval_result.verdict,
                        ruling_summary=eval_result.ruling_summary,
                        score_coherence=eval_result.score_coherence,
                        score_fidelity_to_facts=eval_result.score_fidelity_to_facts,
                        score_evidence_usage=eval_result.score_evidence_usage,
                        final_feedback=eval_result.final_feedback,
                        strengths=eval_result.strengths,
                        areas_for_improvement=eval_result.areas_for_improvement
                    )
                    db.add(eval_model)
                else:
                    existing_eval.verdict = eval_result.verdict
                    existing_eval.ruling_summary = eval_result.ruling_summary
                    existing_eval.score_coherence = eval_result.score_coherence
                    existing_eval.score_fidelity_to_facts = eval_result.score_fidelity_to_facts
                    existing_eval.score_evidence_usage = eval_result.score_evidence_usage
                    existing_eval.final_feedback = eval_result.final_feedback
                    existing_eval.strengths = eval_result.strengths
                    existing_eval.areas_for_improvement = eval_result.areas_for_improvement
                db.commit()
                evaluation_data = eval_result.model_dump()
            except Exception as e:
                print(f"Aviso: Generación de evaluación diferida: {e}")
        else:
            first_speaker = represented_party if (current_stage_enum == ProceduralStage.DESAHOGO_PRUEBAS and len(session.interventions) % 3 == 0) else opposing_lawyer

            turn_first = llm_service.generate_dialogue_turn(
                case_analysis=case_analysis,
                history=history_for_llm,
                stage=current_stage_enum,
                user_role=LegalRole(session.user_role),
                active_speaker=first_speaker
            )
            reply_text = turn_first.get("text", "La contraparte sostiene su oposición.")
            if not is_faithful and fidelity_notes:
                reply_text = f"¡Objeción por falta de rigor fáctico! {fidelity_notes}.\n\n{reply_text}"

            inv_first = InterventionModel(
                session_id=session.id,
                speaker_role=first_speaker.role.value,
                speaker_name=first_speaker.name,
                stage=session.current_stage,
                text=reply_text,
                is_user=False,
                model_3d_key=first_speaker.model_3d_key,
                options=[]
            )
            db.add(inv_first)
            db.commit()
            db.refresh(inv_first)
            interventions_to_return.append(inv_first)

            history_with_reply = history_for_llm + [{
                "speaker_name": first_speaker.name,
                "text": reply_text,
                "is_user": False,
                "stage": session.current_stage
            }]

            turn_juez = llm_service.generate_dialogue_turn(
                case_analysis=case_analysis,
                history=history_with_reply,
                stage=current_stage_enum,
                user_role=LegalRole(session.user_role),
                active_speaker=juez_p
            )
            inv_juez = InterventionModel(
                session_id=session.id,
                speaker_role=juez_p.role.value,
                speaker_name=juez_p.name,
                stage=session.current_stage,
                text=turn_juez.get("text", "El Tribunal tiene por formuladas las manifestaciones. Letrado, proceda con su intervención."),
                is_user=False,
                model_3d_key=juez_p.model_3d_key,
                options=turn_juez.get("options_for_user", [])
            )
            db.add(inv_juez)
            db.commit()
            db.refresh(inv_juez)
            interventions_to_return.append(inv_juez)

    last_inv = interventions_to_return[-1]

    return {
        "current_stage": session.current_stage,
        "is_concluded": is_concluded,
        "evaluation": evaluation_data,
        "progress_info": calculate_trial_progress(session),
        "user_intervention": {
            "id": user_intervention.id,
            "text": user_intervention.text,
            "speaker_gender": resolve_speaker_gender(user_intervention.speaker_name, user_intervention.speaker_role, case_analysis.identified_participants)
        },
        "next_intervention": {
            "id": last_inv.id,
            "speaker_role": last_inv.speaker_role,
            "speaker_name": last_inv.speaker_name,
            "stage": last_inv.stage,
            "text": last_inv.text,
            "model_3d_key": last_inv.model_3d_key,
            "speaker_gender": resolve_speaker_gender(last_inv.speaker_name, last_inv.speaker_role, case_analysis.identified_participants),
            "options": last_inv.options or []
        },
        "interventions_sequence": [
            {
                "id": inv.id,
                "speaker_role": inv.speaker_role,
                "speaker_name": inv.speaker_name,
                "stage": inv.stage,
                "text": inv.text,
                "model_3d_key": inv.model_3d_key,
                "speaker_gender": resolve_speaker_gender(inv.speaker_name, inv.speaker_role, case_analysis.identified_participants),
                "options": inv.options or []
            }
            for inv in interventions_to_return
        ]
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

    # Si ya fue generada previamente durante el dictado de la sentencia, devolverla de inmediato
    existing_eval = db.query(AcademicEvaluationModel).filter(AcademicEvaluationModel.session_id == session.id).first()
    if existing_eval:
        analysis_data = session.case_file.analysis if session.case_file and session.case_file.analysis else {}
        case_num = analysis_data.get("case_number") or session.case_file_id
        return {
            "case_id": case_num,
            "simulation_id": session.id,
            "academic_disclaimer": existing_eval.academic_disclaimer,
            "verdict": existing_eval.verdict,
            "ruling_summary": existing_eval.ruling_summary,
            "score_coherence": existing_eval.score_coherence,
            "score_fidelity_to_facts": existing_eval.score_fidelity_to_facts,
            "score_evidence_usage": existing_eval.score_evidence_usage,
            "final_feedback": existing_eval.final_feedback,
            "strengths": existing_eval.strengths or [],
            "areas_for_improvement": existing_eval.areas_for_improvement or []
        }

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

    # Guardar o actualizar en BD evitando colisión de clave única
    eval_model = db.query(AcademicEvaluationModel).filter(AcademicEvaluationModel.session_id == session.id).first()
    if not eval_model:
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
    else:
        eval_model.verdict = evaluation.verdict
        eval_model.ruling_summary = evaluation.ruling_summary
        eval_model.score_coherence = evaluation.score_coherence
        eval_model.score_fidelity_to_facts = evaluation.score_fidelity_to_facts
        eval_model.score_evidence_usage = evaluation.score_evidence_usage
        eval_model.final_feedback = evaluation.final_feedback
        eval_model.strengths = evaluation.strengths
        eval_model.areas_for_improvement = evaluation.areas_for_improvement
    db.commit()
    db.refresh(eval_model)

    return evaluation.model_dump()

