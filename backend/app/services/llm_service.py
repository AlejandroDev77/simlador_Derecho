import json
import re
from typing import List, Dict, Any, Tuple, Optional
from openai import OpenAI
from app.core.config import settings
from app.models.schemas import (
    CaseAnalysis, Fact, Evidence, Participant, LegalRole,
    ProceduralStage, DecisionOption, InterventionResponse,
    AcademicEvaluation, SourceReference, EvidenceType
)


class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    def analyze_case(self, document_text: str) -> CaseAnalysis:
        """
        Analiza el expediente judicial extrayendo de forma estricta los hechos,
        pruebas, participantes y roles sin inventar información no documentada.
        """
        # Truncar si excede un límite prudente para el prompt inicial manteniendo el inicio y fin si es muy largo
        max_chars = 30000
        truncated_text = document_text[:max_chars] if len(document_text) > max_chars else document_text

        system_prompt = (
            "Eres un analista jurídico y perito judicial de alta precisión. Tu tarea es estructurar un expediente procesal.\n"
            "REGLAS OBLIGATORIAS:\n"
            "1. NO inventes hechos, personas, fechas, declaraciones ni pruebas que no figuren en el texto.\n"
            "2. Distingue estrictamente entre hechos probados/documentados y alegaciones de parte.\n"
            "3. Si un dato se desconoce (como el nombre del juez o número de causa), indícalo como 'No determinado' o 'Desconocido'.\n"
            "4. Asigna a cada participante uno de estos roles estándar: 'juez', 'fiscal', 'demandante', 'abogado_demandante', 'demandado', 'abogado_demandado', 'testigo', 'perito'.\n"
            "5. Para cada participante, asigna uno de estos modelos 3D disponibles: 'juez1', 'juez2', 'per2', 'persona1'. (Usa 'juez1' o 'juez2' para el juez, 'per2' o 'persona1' para abogados y partes).\n"
            "6. Devuelve un JSON estrictamente conforme al esquema solicitado."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "save_case_analysis",
                "description": "Guarda el análisis estructurado del expediente judicial",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "case_title": {"type": "string", "description": "Carátula o título identificativo del caso"},
                        "case_number": {"type": "string", "description": "Número de expediente o causa si figura"},
                        "process_type": {"type": "string", "description": "Materia: Penal, Civil, Laboral, etc."},
                        "jurisdiction": {"type": "string", "description": "Tribunal, juzgado o jurisdicción"},
                        "summary": {"type": "string", "description": "Resumen conciso y neutral de la controversia"},
                        "legal_provisions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Artículos o leyes citadas en el documento"
                        },
                        "facts": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "description": {"type": "string"},
                                    "page_number": {"type": "integer"},
                                    "fragment_text": {"type": "string"},
                                    "is_contested": {"type": "boolean"}
                                },
                                "required": ["id", "description", "page_number"]
                            }
                        },
                        "evidences": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "description": {"type": "string"},
                                    "evidence_type": {"type": "string", "enum": ["documental", "testimonial", "pericial", "material"]},
                                    "page_number": {"type": "integer"}
                                },
                                "required": ["id", "name", "description", "evidence_type", "page_number"]
                            }
                        },
                        "participants": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "role": {"type": "string", "enum": ["juez", "fiscal", "demandante", "abogado_demandante", "demandado", "abogado_demandado", "testigo", "perito"]},
                                    "description": {"type": "string"},
                                    "model_3d_key": {"type": "string", "enum": ["juez1", "juez2", "per2", "persona1"]},
                                    "gender": {"type": "string", "enum": ["male", "female"], "description": "Género aparente o gramatical (male/female) según el nombre o tratamiento de la persona"}
                                },
                                "required": ["id", "name", "role", "description", "model_3d_key"]
                            }
                        }
                    },
                    "required": ["case_title", "process_type", "summary", "facts", "evidences", "participants"]
                }
            }
        }]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analiza el siguiente expediente procesal y extrae los datos requeridos:\n\n{truncated_text}"}
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "save_case_analysis"}},
            temperature=0.1
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)

        # Mapear a modelos Pydantic
        facts_list = [
            Fact(
                id=f.get("id", f"fact_{i}"),
                description=f.get("description", ""),
                source_references=[SourceReference(page_number=f.get("page_number", 1), fragment_text=f.get("fragment_text"))],
                is_immutable=True,
                is_contested=f.get("is_contested", False)
            ) for i, f in enumerate(data.get("facts", []))
        ]

        evidences_list = [
            Evidence(
                id=e.get("id", f"ev_{i}"),
                name=e.get("name", "Prueba"),
                description=e.get("description", ""),
                evidence_type=EvidenceType(e.get("evidence_type", "documental")),
                source_references=[SourceReference(page_number=e.get("page_number", 1))],
                is_admitted=True
            ) for i, e in enumerate(data.get("evidences", []))
        ]

        participants_list = [
            Participant(
                id=p.get("id", f"part_{i}"),
                name=p.get("name", "Participante"),
                role=LegalRole(p.get("role", "demandante")),
                description=p.get("description", ""),
                is_fictional=False,
                model_3d_key=p.get("model_3d_key", "persona1"),
                gender=p.get("gender", "male")
            ) for i, p in enumerate(data.get("participants", []))
        ]

        # Asegurar que al menos haya un Juez asignado
        has_juez = any(p.role == LegalRole.JUEZ for p in participants_list)
        if not has_juez:
            participants_list.insert(0, Participant(
                id="juez_default",
                name="Juez Presidente del Tribunal",
                role=LegalRole.JUEZ,
                description="Magistrado a cargo de moderar la audiencia",
                is_fictional=True,
                model_3d_key="juez1"
            ))

        return CaseAnalysis(
            case_title=data.get("case_title", "Expediente Judicial"),
            case_number=data.get("case_number"),
            process_type=data.get("process_type", "Ordinario"),
            jurisdiction=data.get("jurisdiction"),
            facts=facts_list,
            evidences=evidences_list,
            identified_participants=participants_list,
            legal_provisions=data.get("legal_provisions", []),
            summary=data.get("summary", "")
        )

    def generate_dialogue_turn(
        self,
        case_analysis: CaseAnalysis,
        history: List[Dict[str, Any]],
        stage: ProceduralStage,
        user_role: LegalRole,
        active_speaker: Participant
    ) -> Dict[str, Any]:
        """
        Genera la siguiente intervención teatralizada en la sala de audiencias,
        asegurando coherencia con los hechos y proponiendo opciones si es el turno del usuario.
        """
        system_prompt = (
            "Eres el motor de simulación de juicios orales. Diriges las intervenciones en sala con solemnidad y realismo forense.\n"
            f"EXPEDIENTE: {case_analysis.case_title} ({case_analysis.process_type})\n"
            f"RESUMEN: {case_analysis.summary}\n"
            f"ETAPA ACTUAL: {stage.value}\n"
            f"ROL DEL USUARIO (HUMANO): {user_role.value}\n"
            f"PERSONAJE QUE INTERVIENE AHORA: {active_speaker.name} (Rol: {active_speaker.role.value})\n\n"
            "REGLAS E INTERACCIÓN:\n"
            "1. El personaje que habla debe actuar estrictamente según su rol procesal y los hechos del caso.\n"
            "2. Sé conciso pero con lenguaje forense formal (máximo 3 párrafos cortos).\n"
            "3. Si el siguiente en hablar será el USUARIO, provee 3 opciones de decisión procesal (con texto, táctica y nivel de riesgo) para facilitarle actuar, o permitirle responder libremente.\n"
            "4. Devuelve un JSON estructurado."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "emit_dialogue_turn",
                "description": "Emite el diálogo del personaje y las opciones para el usuario",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Intervención o discurso verbal del personaje en la audiencia"},
                        "animation_state": {"type": "string", "enum": ["speaking", "listening", "idle"]},
                        "options_for_user": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "text": {"type": "string"},
                                    "legal_tactic": {"type": "string"},
                                    "risk_level": {"type": "string", "enum": ["bajo", "medio", "alto"]}
                                },
                                "required": ["id", "text", "risk_level"]
                            }
                        }
                    },
                    "required": ["text", "animation_state"]
                }
            }
        }]

        messages = [{"role": "system", "content": system_prompt}]
        for item in history[-6:]:  # Últimos 6 turnos para mantener contexto ágil
            speaker = item.get("speaker_name", "Participante")
            text = item.get("text", "")
            messages.append({"role": "assistant" if not item.get("is_user") else "user", "content": f"{speaker}: {text}"})

        messages.append({"role": "user", "content": f"Genera la intervención de {active_speaker.name} ({active_speaker.role.value}) para la etapa de {stage.value}."})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "emit_dialogue_turn"}},
            temperature=0.4
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)

        # Limpiar si el modelo repite el nombre del orador como prefijo (ej. "Nombre: ...")
        raw_text = data.get("text", "")
        clean_text = re.sub(rf"^(?:{re.escape(active_speaker.name)}|{re.escape(active_speaker.role.value)}):\s*", "", raw_text, flags=re.IGNORECASE).strip()
        data["text"] = clean_text or raw_text

        # Garantizar que siempre existan opciones tácticas para el usuario
        options = data.get("options_for_user", [])
        if not options:
            options = [
                {
                    "id": "opt_ratificar",
                    "text": "Ratificar las pretensiones de parte con base estricta en las pruebas documentales de autos.",
                    "legal_tactic": "Fidelidad procesal",
                    "risk_level": "bajo"
                },
                {
                    "id": "opt_interrogar",
                    "text": "Solicitar aclaración pericial respecto del estado contable y la provisión de fondos.",
                    "legal_tactic": "Acreditación pericial",
                    "risk_level": "medio"
                },
                {
                    "id": "opt_conclusiones",
                    "text": "Formular alegato de clausura solicitando una resolución ajustada a Derecho.",
                    "legal_tactic": "Conclusiones definitivas",
                    "risk_level": "bajo"
                }
            ]
            data["options_for_user"] = options

        return data

    def check_user_fidelity(self, case_analysis: CaseAnalysis, user_text: str) -> Tuple[bool, Optional[str]]:
        """
        Fase 6: FidelityValidationService.
        Comprueba si la manifestación libre del usuario inventa pruebas inexistentes
        o contradice directamente la documentación del expediente judicial.
        """
        if not user_text or len(user_text.strip()) < 15:
            return True, None

        prompt = (
            "Eres el perito auditor de fidelidad procesal. Evalúa si la intervención libre formulada "
            "por el alumno inventa pruebas materiales inexistentes o contradice los hechos documentados en autos.\n"
            f"HECHOS DEL EXPEDIENTE: {[f.description for f in case_analysis.facts]}\n"
            f"PRUEBAS ADMITIDAS: {[e.name for e in case_analysis.evidences]}\n\n"
            f"ALEGATO DEL ALUMNO: \"{user_text}\"\n\n"
            "Devuelve estrictamente un JSON con las claves:\n"
            "{\"is_faithful\": boolean, \"notes\": \"motivo de la objeción si no es fiel o null\"}"
        )
        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            res = json.loads(resp.choices[0].message.content)
            return res.get("is_faithful", True), res.get("notes")
        except Exception:
            return True, None

    def evaluate_simulation(
        self,
        case_analysis: CaseAnalysis,
        history: List[Dict[str, Any]],
        decisions: List[Dict[str, Any]],
        user_role: LegalRole
    ) -> AcademicEvaluation:
        """
        Genera la evaluación académica y el fallo simulado al concluir el juicio.
        """
        system_prompt = (
            "Eres un tribunal evaluador académico de Derecho. Evalúa el desempeño del alumno en la simulación judicial.\n"
            f"CASO: {case_analysis.case_title}\n"
            f"ROL DEL ALUMNO: {user_role.value}\n"
            "Califica objetivamente de 0 a 100:\n"
            "- Coherencia argumentativa\n"
            "- Fidelidad a los hechos y ausencia de invenciones\n"
            "- Uso estratégico y procesal de las pruebas disponibles\n"
            "Emite una resolución judicial simulada y retroalimentación constructiva."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "save_academic_evaluation",
                "description": "Genera la evaluación académica del estudiante",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "verdict": {"type": "string", "description": "Sentido de la resolución (ej. Condenatoria, Absolutoria, Con lugar, Sin lugar)"},
                        "ruling_summary": {"type": "string", "description": "Fundamentación jurídica resumida del fallo"},
                        "score_coherence": {"type": "number", "minimum": 0, "maximum": 100},
                        "score_fidelity_to_facts": {"type": "number", "minimum": 0, "maximum": 100},
                        "score_evidence_usage": {"type": "number", "minimum": 0, "maximum": 100},
                        "final_feedback": {"type": "string", "description": "Comentario pedagógico detallado"},
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "areas_for_improvement": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["verdict", "ruling_summary", "score_coherence", "score_fidelity_to_facts", "score_evidence_usage", "final_feedback", "strengths", "areas_for_improvement"]
                }
            }
        }]

        user_content = f"Intervenciones del caso ({len(history)} turnos):\n"
        for item in history:
            user_content += f"- [{item.get('stage')}] {item.get('speaker_name')} ({'USUARIO' if item.get('is_user') else 'IA'}): {item.get('text')}\n"

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "save_academic_evaluation"}},
            temperature=0.2
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)

        return AcademicEvaluation(
            case_id=case_analysis.case_number or "caso_1",
            simulation_id="sim_eval",
            verdict=data.get("verdict", "Resolución Emitida"),
            ruling_summary=data.get("ruling_summary", ""),
            score_coherence=float(data.get("score_coherence", 80.0)),
            score_fidelity_to_facts=float(data.get("score_fidelity_to_facts", 85.0)),
            score_evidence_usage=float(data.get("score_evidence_usage", 75.0)),
            final_feedback=data.get("final_feedback", ""),
            strengths=data.get("strengths", []),
            areas_for_improvement=data.get("areas_for_improvement", [])
        )

    def generate_speech_audio(self, text: str, voice: str = "onyx", speed: float = 1.0) -> bytes:
        """
        Genera síntesis de voz ultra-realista con OpenAI TTS (tts-1).
        Voces admitidas: 'onyx', 'fable', 'echo', 'nova', 'shimmer', 'alloy'.
        """
        # Limpieza básica de etiquetas o prefijos si existieran
        clean_text = re.sub(r'\[.*?\]', '', text).strip()
        if not clean_text:
            clean_text = text.strip()

        # Limitar a 4096 caracteres exigido por el endpoint de OpenAI
        truncated_text = clean_text[:4000]

        response = self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=truncated_text,
            speed=max(0.5, min(2.0, speed))
        )
        return response.content
