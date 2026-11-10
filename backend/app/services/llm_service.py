import json
import re
import uuid
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
        asegurando coherencia con los hechos y proponiendo opciones reactivas y únicas para el usuario.
        """
        facts_summary = "\n".join([f"- [Hecho #{i+1}]: {f.description}" for i, f in enumerate(case_analysis.facts[:6])])
        evidences_summary = "\n".join([f"- [Prueba]: {e.name} ({getattr(e.evidence_type, 'value', e.evidence_type)}): {e.description}" for e in case_analysis.evidences[:5]])

        # Detectar qué fue lo último que dijo el usuario o contraparte para reaccionar directamente
        last_turn = history[-1] if history else None
        last_context = f"ÚLTIMA INTERVENCIÓN DE {last_turn.get('speaker_name', 'la parte')}: \"{last_turn.get('text', '')}\"" if last_turn else "Apertura inicial de la sesión."

        role_instruction = ""
        if active_speaker.role == LegalRole.JUEZ:
            if stage == ProceduralStage.DELIBERACION_SENTENCIA:
                role_instruction = (
                    "DIRECTIVA ESPECÍFICA (JUEZ - DICTADO DE SENTENCIA): Como Magistrado Presidente, pronuncia con máxima solemnidad la SENTENCIA JUDICIAL DEFINITIVA "
                    "en nombre de la Ley. Expón brevemente los fundamentos de convicción sobre las pruebas practicadas y declara el FALLO judicial explícito "
                    "(condena o absolución, con penas o indemnizaciones precisas según los autos). Concluye declarando la vista 'VISTA PARA SENTENCIA Y CONCLUIDA LA SESIÓN'. "
                    "NO solicites más intervenciones a las partes y devuelve 'options_for_user' como lista vacía []."
                )
            else:
                role_instruction = "DIRECTIVA ESPECÍFICA (JUEZ): Habla como Magistrado Presidente del Tribunal. Modera con autoridad solemne y concisión (1 a 2 párrafos). Resuelve incidencias o concede el turno de palabra a las partes."
        elif active_speaker.role in (LegalRole.ABOGADO_DEMANDANTE, LegalRole.ABOGADO_DEMANDADO, LegalRole.FISCAL):
            role_instruction = "DIRECTIVA ESPECÍFICA (ABOGADO): Habla con técnica forense y vehemencia dialéctica. Dirígete al centro del plenario, refuta con firmeza el argumento anterior y defiende la teoría del caso de tu parte."
        elif active_speaker.role in (LegalRole.DEMANDADO, LegalRole.DEMANDANTE, LegalRole.TESTIGO):
            role_instruction = "DIRECTIVA ESPECÍFICA (PARTE DECLARANTE / ACUSADO): Habla en primera persona desde el estrado. Responde al interrogatorio o imputación con la voz vivencial y verídica de quien declara sobre los hechos de autos."

        system_prompt = (
            "Eres el motor de simulación de juicios orales. Diriges el debate procesal con rigor técnico, agilidad forense y dramatismo realista.\n"
            f"EXPEDIENTE: {case_analysis.case_title} ({case_analysis.process_type})\n"
            f"RESUMEN DE AUTOS: {case_analysis.summary}\n\n"
            f"HECHOS DEL EXPEDIENTE:\n{facts_summary}\n\n"
            f"PRUEBAS ADMITIDAS EN AUTOS:\n{evidences_summary}\n\n"
            f"ETAPA PROCESAL ACTUAL: {stage.value}\n"
            f"ROL DEL USUARIO (ALUMNO): {user_role.value}\n"
            f"PERSONAJE QUE INTERVIENE AHORA: {active_speaker.name} (Rol: {active_speaker.role.value})\n"
            f"{role_instruction}\n"
            f"{last_context}\n\n"
            "DIRECTIVAS FORENSES Y DE RAMIFICACIÓN:\n"
            "1. REACTIVIDAD DINÁMICA: Tu intervención verbal DEBE responder DIRECTAMENTE a lo último expresado en la sala (indicado arriba). Si el usuario acaba de responder, la contraparte o el juez deben aludir a sus palabras, refutar su tesis, advertir inconsistencias con los autos o requerir aclaración. ¡La narrativa del juicio debe evolucionar y ramificarse!\n"
            "2. FIDELIDAD PROCESAL: Cita detalles específicos del expediente (documentos, fechas, testimonios o cuantías de autos).\n"
            "3. GENERACIÓN OBLIGATORIA DE 3 OPCIONES ESTRATÉGICAS ÚNICAS Y DIFERENTES PARA EL USUARIO (options_for_user):\n"
            "   - Las opciones NUNCA deben ser genéricas ni repetirse turno tras turno.\n"
            "   - Cada opción debe redactar un alegato o pregunta concreto que cite elementos del caso para responder al orador actual.\n"
            "   - Debes ofrecer 3 tácticas bien diferenciadas:\n"
            "     * Opción 1 (riesgo 'bajo'): Enfoque conservador, adhesión estricta a la prueba documental o ratificación formal.\n"
            "     * Opción 2 (riesgo 'medio'): Enfoque dialéctico, contrainterrogatorio, debate probatorio o refutación directa.\n"
            "     * Opción 3 (riesgo 'alto'): Maniobra procesal audaz, tacha/impugnación probatoria, excepción procesal o alegato de máxima presión.\n"
            "4. Devuelve un JSON estructurado con text, animation_state y options_for_user."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "emit_dialogue_turn",
                "description": "Emite el diálogo del personaje y exactamente 3 opciones tácticas personalizadas para el usuario",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Intervención verbal teatralizada y solemne del personaje en la audiencia"},
                        "animation_state": {"type": "string", "enum": ["speaking", "listening", "idle"]},
                        "options_for_user": {
                            "type": "array",
                            "description": "Exactamente 3 opciones reactivas y específicas del expediente para el usuario",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "text": {"type": "string", "description": "Texto del alegato o acción procesal concreta que formularía el usuario"},
                                    "legal_tactic": {"type": "string", "description": "Nombre de la táctica jurídica aplicada"},
                                    "risk_level": {"type": "string", "enum": ["bajo", "medio", "alto"]}
                                },
                                "required": ["id", "text", "legal_tactic", "risk_level"]
                            }
                        }
                    },
                    "required": ["text", "animation_state", "options_for_user"]
                }
            }
        }]

        messages = [{"role": "system", "content": system_prompt}]
        for item in history[-8:]:  # Últimos 8 turnos para mantener contexto ágil y coherente
            speaker = item.get("speaker_name", "Participante")
            text = item.get("text", "")
            messages.append({"role": "assistant" if not item.get("is_user") else "user", "content": f"{speaker}: {text}"})

        messages.append({"role": "user", "content": f"Genera la intervención de {active_speaker.name} ({active_speaker.role.value}) para la etapa de {stage.value} y las 3 opciones tácticas evolutivas para el usuario."})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "emit_dialogue_turn"}},
            temperature=0.45
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)

        # Limpiar si el modelo repite el nombre del orador como prefijo (ej. "Nombre: ...")
        raw_text = data.get("text", "")
        clean_text = re.sub(rf"^(?:{re.escape(active_speaker.name)}|{re.escape(active_speaker.role.value)}):\s*", "", raw_text, flags=re.IGNORECASE).strip()
        data["text"] = clean_text or raw_text

        # En la etapa de deliberación y sentencia el juicio termina: no hay más opciones de intervención
        if stage == ProceduralStage.DELIBERACION_SENTENCIA:
            data["options_for_user"] = []
            return data

        # Garantizar que en las etapas activas siempre existan opciones tácticas dinámicas basadas en los hechos
        options = data.get("options_for_user", [])
        if not options or len(options) < 2:
            fact_ref = case_analysis.facts[0].description if case_analysis.facts else "los hechos principales de autos"
            ev_ref = case_analysis.evidences[0].name if case_analysis.evidences else "la prueba documental"
            options = [
                {
                    "id": f"opt_{uuid.uuid4().hex[:6]}_cons",
                    "text": f"Sostener la postura de parte respaldándose estrictamente en {ev_ref} y en la literalidad de autos.",
                    "legal_tactic": "Sujeción documental estricta",
                    "risk_level": "bajo"
                },
                {
                    "id": f"opt_{uuid.uuid4().hex[:6]}_ref",
                    "text": f"Confrontar directamente a la contraparte respecto de {fact_ref}, solicitando que el tribunal aperciba la contradicción.",
                    "legal_tactic": "Refutación dialéctica",
                    "risk_level": "medio"
                },
                {
                    "id": f"opt_{uuid.uuid4().hex[:6]}_aud",
                    "text": f"Impugnar la valoración probatoria de la contraparte y solicitar diligencia final vinculada a {ev_ref}.",
                    "legal_tactic": "Impugnación procesal",
                    "risk_level": "alto"
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
        Genera la evaluación académica y el fallo simulado al concluir el juicio,
        con fundamentación judicial real y rúbrica pedagógica personalizada.
        """
        facts_summary = "\n".join([f"- [Hecho #{i+1}]: {f.description}" for i, f in enumerate(case_analysis.facts[:8])])
        evidences_summary = "\n".join([f"- [Prueba]: {e.name} ({getattr(e.evidence_type, 'value', e.evidence_type)}): {e.description}" for e in case_analysis.evidences[:6]])

        system_prompt = (
            "Eres un tribunal evaluador académico de Derecho y Magistratura. Tu labor es emitir la SENTENCIA JUDICIAL DEFINITIVA y una EVALUACIÓN TÉCNICA PEDAGÓGICA REAL sobre el desempeño procesal del alumno.\n"
            f"EXPEDIENTE: {case_analysis.case_title} ({case_analysis.process_type})\n"
            f"RESUMEN DE AUTOS: {case_analysis.summary}\n\n"
            f"HECHOS DEL EXPEDIENTE:\n{facts_summary}\n\n"
            f"PRUEBAS DE AUTOS:\n{evidences_summary}\n\n"
            f"ROL PROCESAL DEL ALUMNO: {user_role.value}\n\n"
            "DIRECTIVAS DE EVALUACIÓN:\n"
            "1. Veredicto Judicial Real: Redacta el fallo motivado en Derecho, resolviendo con precisión (condena o absolución, estimación o desestimación) citando las pruebas y hechos clave de este expediente.\n"
            "2. Fundamentación Jurídica (ruling_summary): Redacta un extracto solemne en estilo forense auténtico de sentencia (con Resultandos y Considerandos jurídicos aplicados al debate en sala).\n"
            "3. Rúbrica Pedagógica Rigurosa (0-100):\n"
            "   - Coherencia argumentativa (lógica procesal y solidez retórica)\n"
            "   - Fidelidad fáctica (apego estricto a los hechos sin inventar pruebas)\n"
            "   - Manejo de pruebas (empleo estratégico de documentos, testificales y peritajes de autos)\n"
            "4. Comentario Docente Personalizado (final_feedback): Analiza con detalle qué alegatos del alumno fueron determinantes, en qué acertó técnicamente y cómo influyó su estrategia en el veredicto.\n"
            "5. Fortalezas y Áreas de Mejora: Enumera 3 fortalezas concretas y 3 recomendaciones prácticas para su futuro ejercicio profesional."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "save_academic_evaluation",
                "description": "Genera la evaluación académica del estudiante",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "verdict": {"type": "string", "description": "Fallo judicial definitivo (ej. SENTENCIA CONDENATORIA / ABSOLUTORIA / ESTIMATORIA)"},
                        "ruling_summary": {"type": "string", "description": "Fundamentación jurídica motivada con estructura formal de sentencia judicial"},
                        "score_coherence": {"type": "number", "minimum": 0, "maximum": 100},
                        "score_fidelity_to_facts": {"type": "number", "minimum": 0, "maximum": 100},
                        "score_evidence_usage": {"type": "number", "minimum": 0, "maximum": 100},
                        "final_feedback": {"type": "string", "description": "Análisis pedagógico exhaustivo del desempeño del alumno en estrados"},
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "areas_for_improvement": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["verdict", "ruling_summary", "score_coherence", "score_fidelity_to_facts", "score_evidence_usage", "final_feedback", "strengths", "areas_for_improvement"]
                }
            }
        }]

        user_content = f"Historial íntegro de la vista oral ({len(history)} intervenciones):\n"
        for item in history:
            user_content += f"- [{item.get('stage')}] {item.get('speaker_name')} ({'ALUMNO' if item.get('is_user') else 'SISTEMA'}): {item.get('text')}\n"

        if decisions:
            user_content += "\nDecisiones estratégicas adoptadas por el alumno:\n"
            for d in decisions:
                user_content += f"- Etapa {d.get('stage')}: Opción={d.get('option')} | Texto={d.get('free_text')}\n"

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "save_academic_evaluation"}},
            temperature=0.25
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
