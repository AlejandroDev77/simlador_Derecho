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

    @staticmethod
    def _infer_gender(name: str, role_val: str = "", description: str = "", llm_gender: Optional[str] = None) -> str:
        """
        Determina con precisión el género ('male' o 'female') a partir de títulos, nombres y metadatos del expediente.
        """
        text_name = (name or "").lower()
        combined = f"{name} {role_val} {description}".lower()

        explicit_female_titles = [
            r'\bdoña\b', r'\bdña\b', r'\bdra\b', r'\bsra\b', r'\bseñora\b', r'\bsenora\b',
            r'\babogada\b', r'\bjueza\b', r'\bmagistrada\b', r'\bfiscala\b', r'\bdefensora\b',
            r'\bacusadora\b', r'\bdemandada\b', r'\btestiga\b', r'\bperita\b'
        ]
        explicit_male_titles = [
            r'\bdon\b', r'\bdr\b', r'\bsr\b', r'\bseñor\b', r'\bsenior\b', r'\bletrado\b',
            r'\babogado\b', r'\bmagistrado\b', r'\bdefensor\b', r'\bacusado\b'
        ]

        for pat in explicit_female_titles:
            if re.search(pat, text_name):
                return "female"
        for pat in explicit_male_titles:
            if re.search(pat, text_name):
                return "male"

        female_names = [
            r'\bmar[ií]a\b', r'\belena\b', r'\bluc[ií]a\b', r'\bcarmen\b', r'\blaura\b', r'\bana\b',
            r'\brosa\b', r'\bvaleria\b', r'\bsof[ií]a\b', r'\bpatricia\b', r'\bclaudia\b', r'\bteresa\b',
            r'\bm[oó]nica\b', r'\bbeatriz\b', r'\bsilvia\b', r'\bmarta\b', r'\bmartha\b', r'\bcristina\b',
            r'\bandrea\b', r'\bpaula\b', r'\bgabriela\b', r'\bdaniela\b', r'\bcarolina\b', r'\bver[oó]nica\b',
            r'\bnatalia\b', r'\bfernanda\b', r'\balejandra\b', r'\bcamila\b', r'\badriana\b', r'\blorena\b',
            r'\bmariana\b', r'\bsilvana\b', r'\bfabiola\b', r'\broxana\b', r'\bximena\b', r'\bjimena\b',
            r'\bjuana\b', r'\bisabel\b', r'\bsandra\b', r'\bcarla\b', r'\bkarina\b', r'\bpamela\b',
            r'\bliliana\b', r'\bcecilia\b', r'\balicia\b', r'\bolga\b', r'\bruth\b', r'\bsonia\b',
            r'\bnorma\b', r'\bsusana\b', r'\braquel\b', r'\besther\b', r'\bnoem[ií]\b', r'\bgloria\b',
            r'\bmaribel\b', r'\bgladys\b', r'\byaneth\b', r'\bjanet\b', r'\bwendy\b', r'\bevelyn\b',
            r'\bbrenda\b', r'\bjessica\b', r'\bvanessa\b', r'\bnicole\b', r'\bestefan[ií]a\b', r'\blizeth\b'
        ]
        male_names = [
            r'\bcarlos\b', r'\bjuan\b', r'\bjos[eé]\b', r'\bluis\b', r'\bjorge\b', r'\bpedro\b',
            r'\bmiguel\b', r'\balejandro\b', r'\broberto\b', r'\bfernando\b', r'\bricardo\b', r'\bmario\b',
            r'\bmarco\b', r'\bmarcos\b', r'\bantonio\b', r'\bmanuel\b', r'\bdavid\b', r'\bdaniel\b',
            r'\bdiego\b', r'\bandr[eé]s\b', r'\bsergio\b', r'\beduardo\b', r'\bjavier\b', r'\bra[uú]l\b',
            r'\bhugo\b', r'\b[oó]scar\b', r'\bv[ií]ctor\b', r'\bgustavo\b', r'\balberto\b', r'\bpablo\b',
            r'\brodrigo\b', r'\badri[aá]n\b', r'\bgonzalo\b', r'\bjulio\b', r'\bc[eé]sar\b', r'\bramiro\b',
            r'\bedgar\b', r'\brub[eé]n\b', r'\bwalter\b', r'\bfreddy\b', r'\bgrover\b', r'\bmarcelo\b',
            r'\bmauricio\b', r'\biv[aá]n\b', r'\bfranz\b', r'\berick\b', r'\bchristian\b', r'\bcristian\b'
        ]

        for pat in female_names:
            if re.search(pat, text_name):
                return "female"
        for pat in male_names:
            if re.search(pat, text_name):
                return "male"

        for pat in explicit_female_titles:
            if re.search(pat, combined):
                return "female"

        if llm_gender in ("male", "female"):
            return llm_gender
        return "male"

    @staticmethod
    def _model_for_role_and_gender(role: LegalRole, gender: str) -> str:
        if role == LegalRole.JUEZ:
            return "juez1"
        return "abogada1_mujer" if gender == "female" else "abogado1_hombre"

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
            "5. Detecta obligatoriamente el género real o gramatical ('male' o 'female') de TODOS los participantes (especialmente abogados y demandantes/demandados) según sus nombres, títulos (Don/Doña, Dr./Dra., Sr./Sra., Abogado/Abogada) y contexto del expediente.\n"
            "6. Asigna 'model_3d_key' estrictamente según rol y género: 'juez1' para juez; 'abogada1_mujer' si es mujer o 'abogado1_hombre' si es hombre para abogados y partes.\n"
            "7. Devuelve un JSON estrictamente conforme al esquema solicitado."
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
                                    "model_3d_key": {"type": "string", "enum": ["juez1", "abogado1_hombre", "abogada1_mujer", "persona1", "per2"]},
                                    "gender": {"type": "string", "enum": ["male", "female"], "description": "Género obligatorio (male/female) del abogado, demandante, demandado o juez según su nombre o tratamiento"}
                                },
                                "required": ["id", "name", "role", "description", "model_3d_key", "gender"]
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

        participants_list = []
        for i, p in enumerate(data.get("participants", [])):
            role_enum = LegalRole(p.get("role", "demandante"))
            inferred_gender = self._infer_gender(
                p.get("name", ""),
                role_enum.value,
                p.get("description", ""),
                p.get("gender")
            )
            participants_list.append(Participant(
                id=p.get("id", f"part_{i}"),
                name=p.get("name", "Participante"),
                role=role_enum,
                description=p.get("description", ""),
                is_fictional=False,
                model_3d_key=self._model_for_role_and_gender(role_enum, inferred_gender),
                gender=inferred_gender
            ))

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

        is_user_judge = (user_role == LegalRole.JUEZ)

        stage_directives = {
            ProceduralStage.INTRODUCCION_JUEZ: "ETAPA 1 (INTRODUCCIÓN DEL JUEZ): Abre formalmente la vista oral, resume en 1 oración el objeto de la causa y concede la palabra para iniciar el argumento.",
            ProceduralStage.ARGUMENTO: "ETAPA 2 (ARGUMENTO): Presenta o dirige el argumento jurídico central apoyado en un hecho y prueba específica del expediente.",
            ProceduralStage.CONTRAARGUMENTO: "ETAPA 3 (CONTRAARGUMENTO): Expón o modera la oposición directa frente al argumento previo, contrastándolo con las constancias de autos.",
            ProceduralStage.REPLICA: "ETAPA 4 (RÉPLICA): Responde puntualmente para reafirmar la postura y desvirtuar las observaciones del contraargumento.",
            ProceduralStage.REFUTACION: "ETAPA 5 (REFUTACIÓN): Formula la refutación conclusiva atacando la principal debilidad fáctica o probatoria antes del veredicto.",
            ProceduralStage.VEREDICTO_FINAL: "ETAPA 6 (VEREDICTO FINAL): Dicta o prepara la resolución definitiva motivada (condena/estimación o absolución/desestimación) cerrando la vista."
        }
        stage_guide = stage_directives.get(stage, "Avanza el debate procesal de forma ágil.")

        role_instruction = ""
        if active_speaker.role == LegalRole.JUEZ:
            if stage == ProceduralStage.VEREDICTO_FINAL:
                role_instruction = (
                    "DIRECTIVA ESPECÍFICA (JUEZ - VEREDICTO FINAL): Como Magistrado Presidente, pronuncia de manera solemne y concisa el VEREDICTO FINAL definitivo "
                    "(3 a 4 oraciones claras, máximo 70 palabras). Expón brevemente el motivo probatorio, declara el FALLO explícito "
                    "(condena/estimación o absolución/desestimación según los autos) y concluye declarando 'CONCLUIDA LA AUDIENCIA JUDICIAL'."
                )
            else:
                role_instruction = "DIRECTIVA ESPECÍFICA (JUEZ): Habla como Magistrado Presidente con autoridad y extrema concisión (2 a 3 oraciones breves, máximo 45 palabras). Modera el debate y concede el turno correspondiente."
        elif active_speaker.role in (LegalRole.ABOGADO_DEMANDANTE, LegalRole.ABOGADO_DEMANDADO, LegalRole.FISCAL):
            if is_user_judge:
                role_instruction = (
                    f"DIRECTIVA ESPECÍFICA ({active_speaker.role.value.upper()} ANTE EL JUEZ): Dirígete brevemente y con respeto al MAGISTRADO PRESIDENTE (usuario) "
                    "usando fórmulas como 'Con la venia de su Señoría...' o 'Señoría...'. Ve directo al punto jurídico en 2 o 3 oraciones (máximo 50 palabras)."
                )
            else:
                role_instruction = "DIRECTIVA ESPECÍFICA (ABOGADO): Habla con técnica forense y agilidad (2 a 3 oraciones directas, máximo 50 palabras). Ve directo al grano refutando o sosteniendo con base en autos."
        elif active_speaker.role in (LegalRole.DEMANDADO, LegalRole.DEMANDANTE, LegalRole.TESTIGO):
            if is_user_judge:
                role_instruction = (
                    f"DIRECTIVA ESPECÍFICA (DECLARANTE ANTE EL JUEZ): Dirígete con respeto al Tribunal ('Señoría...') en 2 oraciones breves y verídicas (máximo 40 palabras)."
                )
            else:
                role_instruction = "DIRECTIVA ESPECÍFICA (DECLARANTE): Responde en primera persona en 2 oraciones breves y concretas (máximo 40 palabras) sobre los hechos de autos."

        if is_user_judge:
            if stage == ProceduralStage.VEREDICTO_FINAL:
                options_directive = (
                    "3. GENERACIÓN OBLIGATORIA DE 3 OPCIONES DE VEREDICTO FINAL PARA EL JUEZ (options_for_user):\n"
                    "   - EL ALUMNO ES EL JUEZ QUE DICTA EL VEREDICTO FINAL. NUNCA generes opciones de abogado.\n"
                    "   - Cada opción debe tener máximo 22 palabras:\n"
                    "     * Opción 1 (Fallo Condenatorio / Estimatorio - riesgo 'medio'): Estimar la pretensión o condenar con base en las pruebas de autos.\n"
                    "     * Opción 2 (Fallo Parcial - riesgo 'bajo'): Estimación parcial o atenuada por existir elementos controvertidos.\n"
                    "     * Opción 3 (Fallo Absolutorio / Desestimatorio - riesgo 'alto'): Libre absolución o desestimación por insuficiencia de prueba plena.\n"
                )
            else:
                options_directive = (
                    "3. GENERACIÓN OBLIGATORIA DE 3 DECISIONES JUDICIALES PARA EL JUEZ (options_for_user):\n"
                    "   - EL USUARIO ES EL MAGISTRADO PRESIDENTE. PROHIBIDO redactar alegatos de abogado.\n"
                    "   - Cada opción debe ser una orden/providencia breve (1 oración de 15 a 25 palabras) adecuada a la etapa actual:\n"
                    "     * Opción 1 (Dirección Ordinaria - riesgo 'bajo'): Conceder la palabra a la contraparte para continuar con la siguiente fase.\n"
                    "     * Opción 2 (Indagación Judicial - riesgo 'medio'): Requerir aclaración breve sobre una prueba o folio específico del expediente.\n"
                    "     * Opción 3 (Rigor y Cierre de Trámite - riesgo 'alto'): Apercibir brevedad en sala y ordenar pasar de inmediato al siguiente punto procesal.\n"
                )
        else:
            options_directive = (
                "3. GENERACIÓN OBLIGATORIA DE 3 OPCIONES ESTRATÉGICAS BREVES PARA EL USUARIO (options_for_user):\n"
                "   - Redacta 3 intervenciones cortas y concretas (1 sola oración clara de 15 a 26 palabras cada una) citando un dato o prueba del caso:\n"
                "     * Opción 1 (riesgo 'bajo'): Enfoque conservador, adhesión directa a un documento o hecho probado.\n"
                "     * Opción 2 (riesgo 'medio'): Enfoque dialéctico, argumento o réplica directa al orador anterior.\n"
                "     * Opción 3 (riesgo 'alto'): Maniobra contundente, impugnación probatoria o refutación incisiva.\n"
            )

        system_prompt = (
            "Eres el motor ágil de simulación de juicios orales (duración total de audiencia: 5 minutos aprox.).\n"
            f"EXPEDIENTE: {case_analysis.case_title} ({case_analysis.process_type})\n"
            f"RESUMEN DE AUTOS: {case_analysis.summary}\n\n"
            f"HECHOS DEL EXPEDIENTE:\n{facts_summary}\n\n"
            f"PRUEBAS ADMITIDAS EN AUTOS:\n{evidences_summary}\n\n"
            f"ETAPA PROCESAL ACTUAL: {stage.value}\n"
            f"{stage_guide}\n"
            f"ROL DEL USUARIO (ALUMNO): {user_role.value}\n"
            f"PERSONAJE QUE INTERVIENE AHORA: {active_speaker.name} (Rol: {active_speaker.role.value})\n"
            f"{role_instruction}\n"
            f"{last_context}\n\n"
            "DIRECTIVAS DE BREVEDAD Y REACTIVIDAD:\n"
            "1. BREVEDAD ESTRICTA (AUDIENCIA DE 5 MINUTOS): Los textos hablados DEBEN ser cortos, directos y sustanciosos (2 a 3 oraciones, máximo 50 palabras; o 70 palabras máximo solo en Veredicto Final). Nada de introducciones redundantes ni párrafos largos.\n"
            "2. REACTIVIDAD Y FIDELIDAD: Responde directo a lo último dicho y cita un dato, fecha o prueba concreta de autos.\n"
            f"{options_directive}\n"
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

        # En la etapa de veredicto final:
        # Si el usuario es el Juez, SÍ necesita opciones para dictar su fallo. Si no lo es, concluye la vista.
        if stage == ProceduralStage.VEREDICTO_FINAL and not is_user_judge:
            data["options_for_user"] = []
            return data

        # Garantizar que siempre existan opciones tácticas dinámicas basadas en los hechos
        options = data.get("options_for_user", [])
        if not options or len(options) < 2:
            fact_ref = case_analysis.facts[0].description if case_analysis.facts else "los hechos de autos"
            ev_ref = case_analysis.evidences[0].name if case_analysis.evidences else "la prueba documental"

            if is_user_judge:
                if stage == ProceduralStage.VEREDICTO_FINAL:
                    options = [
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_cond",
                            "text": f"VEREDICTO: CONDENAR / ESTIMAR íntegramente con base en {ev_ref}.",
                            "legal_tactic": "Fallo Estimatorio / Condenatorio",
                            "risk_level": "medio"
                        },
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_parc",
                            "text": f"VEREDICTO: ESTIMACIÓN PARCIAL por aspectos controvertidos sobre {fact_ref}.",
                            "legal_tactic": "Fallo Estimatorio Parcial",
                            "risk_level": "bajo"
                        },
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_abs",
                            "text": "VEREDICTO: ABSOLUCIÓN / DESESTIMACIÓN por insuficiencia de prueba plena.",
                            "legal_tactic": "Fallo Absolutorio",
                            "risk_level": "alto"
                        }
                    ]
                else:
                    options = [
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_conceder",
                            "text": "Se tiene por oída su intervención. Tiene la palabra la contraparte para responder.",
                            "legal_tactic": "Concesión de palabra",
                            "risk_level": "bajo"
                        },
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_requerir",
                            "text": f"Precise brevemente el respaldo de {ev_ref} respecto de su afirmación.",
                            "legal_tactic": "Requerimiento probatorio",
                            "risk_level": "medio"
                        },
                        {
                            "id": f"opt_{uuid.uuid4().hex[:6]}_apercibir",
                            "text": "Se exhorta brevedad a las partes y pasamos de inmediato al siguiente punto del debate.",
                            "legal_tactic": "Dirección y celeridad",
                            "risk_level": "alto"
                        }
                    ]
            else:
                options = [
                    {
                        "id": f"opt_{uuid.uuid4().hex[:6]}_cons",
                        "text": f"Reafirmo nuestra posición con base directa en {ev_ref} de autos.",
                        "legal_tactic": "Sujeción documental",
                        "risk_level": "bajo"
                    },
                    {
                        "id": f"opt_{uuid.uuid4().hex[:6]}_ref",
                        "text": f"Refuto lo dicho por la contraparte contrastándolo directamente con {fact_ref}.",
                        "legal_tactic": "Refutación directa",
                        "risk_level": "medio"
                    },
                    {
                        "id": f"opt_{uuid.uuid4().hex[:6]}_aud",
                        "text": f"Impugno la interpretación contraria por carecer de sustento en {ev_ref}.",
                        "legal_tactic": "Impugnación probatoria",
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
        con fundamentación judicial real y rúbrica pedagógica estrictamente proporcional
        al desempeño real y nivel de participación del alumno en sala.
        """
        facts_summary = "\n".join([f"- [Hecho #{i+1}]: {f.description}" for i, f in enumerate(case_analysis.facts[:8])])
        evidences_summary = "\n".join([f"- [Prueba]: {e.name} ({getattr(e.evidence_type, 'value', e.evidence_type)}): {e.description}" for e in case_analysis.evidences[:6]])

        user_interventions = [i for i in history if i.get("is_user")]
        user_turns_count = len(user_interventions)
        total_decisions_count = len(decisions)

        system_prompt = (
            "Eres el Tribunal Examinador Académico y Magistrado Judicial en un simulador universitario de juicios orales (formato ágil de 5 minutos en 6 etapas: introducción del juez, argumento, contraargumento, réplica, refutación y veredicto final).\n"
            "Tu labor es emitir la SENTENCIA JUDICIAL DEFINITIVA y una EVALUACIÓN TÉCNICA PEDAGÓGICA REAL sobre el desempeño procesal del alumno.\n"
            f"EXPEDIENTE: {case_analysis.case_title} ({case_analysis.process_type})\n"
            f"RESUMEN DE AUTOS: {case_analysis.summary}\n\n"
            f"HECHOS DEL EXPEDIENTE:\n{facts_summary}\n\n"
            f"PRUEBAS DE AUTOS:\n{evidences_summary}\n\n"
            f"ROL PROCESAL DEL ALUMNO: {user_role.value}\n\n"
            "DIRECTIVAS ESTRICTAS DE EVALUACIÓN BASADAS EN DESEMPEÑO REAL (0-100):\n"
            "- CRÍTICO - PARTICIPACIÓN INSUFICIENTE O ABANDONO PREMATURO: "
            "Si el alumno ha intervenido 0 o 1 sola vez en todo el juicio, o si solicitó 'Emitir Fallo' de manera prematura sin haber sostenido argumento, contraargumento, réplica y refutación, "
            "ESTÁ TERMINANTEMENTE PROHIBIDO otorgar notas aprobatorias. Las calificaciones DEBEN ser severamente bajas (entre 15 y 38 puntos sobre 100), "
            "y en 'final_feedback' debes señalar expresamente que la actuación procesal (sea como letrado o como magistrado presidente) fue insuficiente, desierta o prematuramente abandonada sin debate completo.\n"
            "- EVALUACIÓN SEGÚN ROL ASIGNADO: Si el alumno actuó como JUEZ, evalúa su templanza y dirección procesal a lo largo de las 6 etapas, si concedió la palabra con orden, si indagó sobre pruebas y la motivación del veredicto final. Si actuó como ABOGADO, evalúa su capacidad de argumento, contraargumento, réplica y refutación.\n"
            "- PARTICIPACIÓN MEDIA O INCOMPLETA (2 a 3 intervenciones): Puntuaciones entre 45 y 65 puntos. Si no citó los folios o pruebas del expediente, penaliza fuertemente el manejo de pruebas (score_evidence_usage < 50).\n"
            "- PARTICIPACIÓN COMPLETA Y RIGUROSA (4 o más turnos completando el debate hasta refutación/veredicto con cita de pruebas): Puntuaciones entre 75 y 98 puntos según la solidez demostrada.\n"
            "- PROHIBIDO ASIGNAR NOTAS GENÉRICAS COMO 70 u 80 POR DEFECTO. Las notas deben fluctuar y reflejar fielmente lo que el estudiante expuso.\n"
            "- FUNDAMENTACIÓN DE SENTENCIA (ruling_summary): Redacta un fallo formal motivado y conciso conforme a las pruebas de autos."
        )

        tools = [{
            "type": "function",
            "function": {
                "name": "save_academic_evaluation",
                "description": "Genera la evaluación académica del estudiante",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "verdict": {"type": "string", "description": "Fallo judicial definitivo (ej. CONDENA POR DELITO CONTINUADO DE ESTAFA / LIBRE ABSOLUCIÓN POR ATIPICIDAD)"},
                        "ruling_summary": {"type": "string", "description": "Fundamentación jurídica motivada con estructura formal de sentencia judicial"},
                        "score_coherence": {"type": "number", "minimum": 0, "maximum": 100, "description": "Puntaje real de coherencia lógica y retórica procesal"},
                        "score_fidelity_to_facts": {"type": "number", "minimum": 0, "maximum": 100, "description": "Puntaje real de fidelidad fáctica a las constancias de autos"},
                        "score_evidence_usage": {"type": "number", "minimum": 0, "maximum": 100, "description": "Puntaje real de incorporación y análisis de medios de prueba"},
                        "final_feedback": {"type": "string", "description": "Análisis pedagógico exhaustivo y sincero del desempeño efectivo del alumno en estrados"},
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "areas_for_improvement": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["verdict", "ruling_summary", "score_coherence", "score_fidelity_to_facts", "score_evidence_usage", "final_feedback", "strengths", "areas_for_improvement"]
                }
            }
        }]

        user_content = (
            f"REGISTRO OBJETIVO DE PARTICIPACIÓN DEL ALUMNO:\n"
            f"- Total de intervenciones formuladas por el alumno: {user_turns_count}\n"
            f"- Total de decisiones tácticas adoptadas: {total_decisions_count}\n"
            f"- Total de turnos transcurridos en sala: {len(history)}\n\n"
            f"HISTORIAL DETALLADO DE INTERVENCIONES:\n"
        )
        for item in history:
            role_tag = "ALUMNO (ESTUDIANTE)" if item.get('is_user') else "OTRA PARTE / TRIBUNAL"
            user_content += f"- [{item.get('stage')}] {item.get('speaker_name')} [{role_tag}]: {item.get('text')}\n"

        if decisions:
            user_content += "\nDECISIONES PROCESALES FORMULADAS POR EL ALUMNO:\n"
            for d in decisions:
                user_content += f"- Etapa {d.get('stage')}: Táctica/Opción={d.get('option')} | Texto propio='{d.get('free_text') or '(Sin redacción libre)'}'\n"
        else:
            user_content += "\n[ADVERTENCIA JUDICIAL]: EL ALUMNO NO REGISTRÓ NINGUNA DECISIÓN FORMAL NI TEXTO PROPIO EN LA CAUSA (SOLICITÓ FALLO SIN DEBATIR).\n"

        try:
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
                verdict=data.get("verdict", "Resolución Judicial Emitida"),
                ruling_summary=data.get("ruling_summary", ""),
                score_coherence=float(data.get("score_coherence", 30.0 if user_turns_count < 2 else 75.0)),
                score_fidelity_to_facts=float(data.get("score_fidelity_to_facts", 30.0 if user_turns_count < 2 else 75.0)),
                score_evidence_usage=float(data.get("score_evidence_usage", 20.0 if user_turns_count < 2 else 70.0)),
                final_feedback=data.get("final_feedback", ""),
                strengths=data.get("strengths", []),
                areas_for_improvement=data.get("areas_for_improvement", [])
            )
        except Exception as e:
            if user_turns_count < 2:
                return AcademicEvaluation(
                    case_id=case_analysis.case_number or "caso_1",
                    simulation_id="sim_eval",
                    verdict="RESOLUCIÓN PREMATURA / FALTA DE ACTIVIDAD PROCESAL",
                    ruling_summary="El Tribunal da por concluido el procedimiento ante la solicitud anticipada de fallo sin debate probatorio.",
                    score_coherence=25.0,
                    score_fidelity_to_facts=30.0,
                    score_evidence_usage=15.0,
                    final_feedback="El estudiante solicitó el dictado de resolución de manera prematura, sin haber formulado alegaciones suficientes ni desahogado las pruebas documentales y testificales de autos.",
                    strengths=["Comparecencia formal en estrados"],
                    areas_for_improvement=["Sostener el debate procesal a lo largo de todas las etapas", "Incorporar y valorar los medios probatorios", "Formular conclusiones motivadas antes de solicitar sentencia"]
                )
            return AcademicEvaluation(
                case_id=case_analysis.case_number or "caso_1",
                simulation_id="sim_eval",
                verdict="SENTENCIA DEFINITIVA",
                ruling_summary="El Tribunal resuelve la controversia sobre la base de los hechos documentados y el debate sostenido en sala.",
                score_coherence=72.0,
                score_fidelity_to_facts=76.0,
                score_evidence_usage=68.0,
                final_feedback="Desempeño procesal aceptable con intervenciones oportunas en sala.",
                strengths=["Mantuvo la postura procesal asignada"],
                areas_for_improvement=["Profundizar en la cita de folios y pruebas periciales"]
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
