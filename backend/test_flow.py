import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def run_full_verification():
    print("=== INICIANDO VERIFICACIÓN INTEGRAL DEL SIMULADOR JUDICIAL ===")

    # 1. Test Health
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"Health check falló: {health_resp.text}"
    print(f"[OK] Health check: {health_resp.json()}")

    # 2. Test Carga de Expediente
    with open("test_case.txt", "rb") as f:
        upload_resp = client.post("/cases/upload", files={"file": ("test_case.txt", f, "text/plain")})
    assert upload_resp.status_code == 200, f"Upload falló: {upload_resp.text}"
    case_data = upload_resp.json()
    case_id = case_data["id"]
    print(f"[OK] Expediente cargado: ID {case_id}, Páginas: {case_data['page_count']}")

    # 3. Test Análisis con OpenAI
    print("[...] Ejecutando análisis jurídico estructurado con OpenAI...")
    analysis_resp = client.post(f"/cases/{case_id}/analyze")
    assert analysis_resp.status_code == 200, f"Análisis falló: {analysis_resp.text}"
    analysis = analysis_resp.json()
    print(f"[OK] Caso analizado con éxito:")
    print(f"     - Título: {analysis['case_title']}")
    print(f"     - Proceso: {analysis['process_type']}")
    print(f"     - Hechos probados detectados: {len(analysis['facts'])}")
    print(f"     - Pruebas admitidas: {len(analysis['evidences'])}")
    print(f"     - Participantes identificados: {len(analysis['identified_participants'])}")
    for p in analysis['identified_participants']:
        print(f"       * {p['name']} ({p['role']}) -> Modelo 3D: {p['model_3d_key']}")

    # 4. Test Iniciar Simulación
    print("\n[...] Iniciando simulación en sala 3D con rol 'abogado_demandante'...")
    start_resp = client.post("/simulations/start", json={
        "case_id": case_id,
        "user_role": "abogado_demandante"
    })
    assert start_resp.status_code == 200, f"Start falló: {start_resp.text}"
    sim_data = start_resp.json()
    session_id = sim_data["session_id"]
    initial_intervention = sim_data["initial_intervention"]
    print(f"[OK] Sesión iniciada: ID {session_id}")
    print(f"     - Orador inicial: {initial_intervention['speaker_name']} ({initial_intervention['speaker_role']})")
    print(f"     - Diálogo: \"{initial_intervention['text'][:120]}...\"")
    print(f"     - Opciones estratégicas sugeridas: {len(initial_intervention.get('options', []))}")

    # 5. Test Decisión / Argumentación
    options = initial_intervention.get('options') or []
    if options:
        opt = options[0]
        opt_id = opt.get('id')
        print(f"\n[...] Usuario replica en sala con opción: {opt.get('text', '')[:80]}...")
        dec_payload = {"selected_option_id": opt_id, "free_text_response": None}
    else:
        print(f"\n[...] Usuario formula alegato libre en sala...")
        dec_payload = {
            "selected_option_id": None,
            "free_text_response": "Señoría, como acusación particular ratificamos el escrito de acusación fundamentado en la documental obrante al folio 24."
        }

    dec_resp = client.post(f"/simulations/{session_id}/decision", json=dec_payload)
    assert dec_resp.status_code == 200, f"Decisión falló: {dec_resp.text}"
    dec_data = dec_resp.json()
    next_int = dec_data["next_intervention"]
    print(f"[OK] Réplica procesada:")
    print(f"     - Etapa actual: {dec_data['current_stage']}")
    print(f"     - Siguiente orador: {next_int['speaker_name']} ({next_int['speaker_role']})")
    print(f"     - Respuesta: \"{next_int['text'][:120]}...\"")

    # 5.1 Test Formular Objeción Forense
    print("\n[...] Formulando objeción procesal en sala...")
    obj_resp = client.post(f"/simulations/{session_id}/objection", json={
        "grounds": "Hecho no incorporado ni admitido en autos"
    })
    assert obj_resp.status_code == 200, f"Objeción falló: {obj_resp.text}"
    obj_data = obj_resp.json()
    ruling_int = obj_data["ruling_intervention"]
    print(f"[OK] Resolución de objeción emitida por el tribunal:")
    print(f"     - Decisión: {obj_data['decision'].upper()}")
    print(f"     - Orador: {ruling_int['speaker_name']} ({ruling_int['speaker_role']})")
    print(f"     - Fundamento: \"{ruling_int['text'][:140]}...\"")

    # 6. Test Evaluación Académica y Resolución
    print("\n[...] Concluyendo juicio y solicitando evaluación académica y resolución simulada...")
    eval_resp = client.post(f"/simulations/{session_id}/evaluate")
    assert eval_resp.status_code == 200, f"Evaluación falló: {eval_resp.text}"
    eval_data = eval_resp.json()
    print(f"[OK] Resolución emitida:")
    print(f"     - Veredicto: {eval_data['verdict']}")
    print(f"     - Calificación Coherencia: {eval_data['score_coherence']}/100")
    print(f"     - Calificación Fidelidad a Hechos: {eval_data['score_fidelity_to_facts']}/100")
    print(f"     - Calificación Uso de Pruebas: {eval_data['score_evidence_usage']}/100")
    print(f"     - Fundamento: {eval_data['ruling_summary'][:150]}...")
    print(f"     - Aviso legal: {eval_data['academic_disclaimer']}")

    print("\n=== ¡VERIFICACIÓN EXITOSA DE TODAS LAS FASES FUNCIONALES! ===")


if __name__ == "__main__":
    run_full_verification()
