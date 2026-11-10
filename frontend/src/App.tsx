import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from './components/Icons';
import { Header } from './components/Header';
import { UploadStep } from './components/UploadStep';
import { AnalysisStep } from './components/AnalysisStep';
import { RoleSelectStep } from './components/RoleSelectStep';
import { CourtroomStep } from './components/CourtroomStep';
import { ObjectionModal } from './components/ObjectionModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { EvaluationStep } from './components/EvaluationStep';
import { playGavelStrike } from './utils/audio';
import { caseService } from './services/caseService';
import type { UploadCaseResponse } from './services/caseService';
import { simulationService } from './services/simulationService';
import type { SimulationStateResponse } from './services/simulationService';
import type { Step, CaseAnalysis, LegalRole, AcademicEvaluation, Intervention, VoiceSettings } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados del Expediente
  const [caseFile, setCaseFile] = useState<UploadCaseResponse | null>(null);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [showDossier, setShowDossier] = useState(false);

  // Estados de Simulación
  const [selectedRole, setSelectedRole] = useState<LegalRole>('abogado_demandante');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [simState, setSimState] = useState<SimulationStateResponse | null>(null);
  const [currentIntervention, setCurrentIntervention] = useState<Intervention | null>(null);
  const [freeText, setFreeText] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<AcademicEvaluation | null>(null);
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Audio / TTS con Web Speech API y configuración personalizada
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('simulador_voice_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar error de parsing
    }
    return {
      engine: 'openai',
      maleVoice: 'onyx',
      femaleVoice: 'nova',
      browserVoiceURI: '',
      speed: 1.0,
      pitch: 1.0,
      autoModulateRole: true
    };
  });

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSaveVoiceSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    try {
      localStorage.setItem('simulador_voice_settings', JSON.stringify(newSettings));
    } catch {
      // Ignorar si localstorage no está disponible
    }
  };

  // Carga rápida del caso penal de prueba
  const handleLoadExampleCase = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const exampleText = `JUZGADO DE LO PENAL Nº 3 DE MADRID
PROCEDIMIENTO ABREVIADO Nº 142/2024
ROLLO DE SALA Nº 88/2024

--- PÁGINA 1 ---
AUTORIDAD JUDICIAL: Ilmo. Sr. Magistrado-Juez Don Fernando Valenzuela Ramos.
MINISTERIO FISCAL: Ilma. Sra. Fiscal Doña Carmen Ortiz Delgado.
PARTE ACUSADORA PARTICULAR: Constructora Horizonte S.L., representada por el Letrado Don Alejandro Prieto.
PARTE ACUSADA: Don Roberto Silva Pardo, asistido por la Letrada Defensora Doña Elena Morales.

DELITO IMPUTADO: Delito continuado de estafa (Arts. 248 y 250 del Código Penal) y falsedad en documento mercantil.

--- PÁGINA 2 ---
HECHOS PROBADOS Y DOCUMENTADOS:
1. Con fecha 14 de marzo de 2023, en la sede de la entidad mercantil Constructora Horizonte S.L., el acusado Don Roberto Silva Pardo formalizó contrato de compraventa y suministro de material de construcción por importe total de 45.000 euros.
2. Como garantía y medio de pago, el acusado libró contra su cuenta bancaria de Banco Central tres pagarés de vencimiento mensual por importe de 15.000 euros cada uno, a sabiendas de que dicha cuenta carecía de saldo disponible y había sido bloqueada judicialmente con anterioridad el 2 de febrero de 2023.
3. Llegada la fecha del primer vencimiento el 15 de abril de 2023, la entidad bancaria procedió al protesto y devolución del título de crédito por falta absoluta de provisión de fondos.

--- PÁGINA 3 ---
PRUEBAS ADMITIDAS EN LA CAUSA:
1. Prueba Documental (Folios 12 al 18): Copia certificada del contrato mercantil fechado a 14 de marzo de 2023 con firma indubitada de las partes.
2. Prueba Documental (Folios 24 al 29): Certificado bancario oficial emitido por Banco Central acreditando el estado de embargo y saldo cero de la cuenta corriente a la fecha de libramiento.
3. Prueba Testimonial y Pericial: Informe y ratificación en sala del perito auditor Don Marcos Benítez, confirmando la insolvencia preconcebida del acusado.
4. Declaración del denunciante Don Alejandro Prieto en calidad de representante legal perjudicado.

--- PÁGINA 4 ---
PRETENSIONES Y PETITORIO DE LAS PARTES:
- El Ministerio Fiscal y la Acusación Particular solicitan la condena del acusado a la pena de 3 años de prisión, inhabilitación especial para el ejercicio del comercio, y la restitución indemnizatoria de 45.000 euros más intereses legales.
- La Defensa solicita la libre absolución de Don Roberto Silva Pardo, sosteniendo la atipicidad penal por tratarse de un mero incumplimiento civil sobrevenido debido a la quiebra involuntaria de su subcontratista principal.`;

      const file = new File([exampleText], 'Causa_Penal_142-2024_Estafa.txt', { type: 'text/plain' });
      const res = await caseService.uploadCase(file);
      setCaseFile(res);
      setCurrentStep('analysis');
      handleRunAnalysis(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cargar el caso de ejemplo.');
    } finally {
      setLoading(false);
    }
  };

  // Reproducir voz cuando cambia la intervención (OpenAI Neural TTS con fallback a Web Speech API)
  useEffect(() => {
    if (!currentIntervention || !ttsEnabled) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      queueMicrotask(() => setIsSpeakingAudio(false));
      return;
    }

    let isCancelled = false;

    // Detener cualquier audio previo
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const speakWithBrowserFallback = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(currentIntervention.text);
      utterance.lang = 'es-ES';

      const voices = window.speechSynthesis.getVoices();
      if (voiceSettings.browserVoiceURI) {
        const matchedVoice = voices.find((v) => v.voiceURI === voiceSettings.browserVoiceURI);
        if (matchedVoice) utterance.voice = matchedVoice;
      } else {
        const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
        if (spanishVoice) utterance.voice = spanishVoice;
      }

      let calculatedPitch = voiceSettings.pitch;
      let calculatedRate = voiceSettings.speed;

      if (voiceSettings.autoModulateRole) {
        const role = currentIntervention.speaker_role;
        if (role === 'juez') {
          calculatedPitch *= 0.84;
          calculatedRate *= 0.94;
        } else if (role === 'fiscal' || role === 'abogado_demandante') {
          calculatedPitch *= 1.06;
          calculatedRate *= 1.03;
        } else if (role === 'abogado_demandado') {
          calculatedPitch *= 0.95;
        }
      }

      utterance.pitch = Math.max(0.5, Math.min(2.0, calculatedPitch));
      utterance.rate = Math.max(0.5, Math.min(2.0, calculatedRate));

      utterance.onstart = () => { if (!isCancelled) setIsSpeakingAudio(true); };
      utterance.onend = () => { if (!isCancelled) setIsSpeakingAudio(false); };
      utterance.onerror = () => { if (!isCancelled) setIsSpeakingAudio(false); };

      window.speechSynthesis.speak(utterance);
    };

    if (voiceSettings.engine === 'openai') {
      // Detección de género: si el personaje es femenino se usa la voz femenina, de lo contrario la masculina
      const isFemale = currentIntervention.speaker_gender === 'female';
      const voice = isFemale ? (voiceSettings.femaleVoice || 'nova') : (voiceSettings.maleVoice || 'onyx');

      simulationService.getSpeechAudioBlobUrl(currentIntervention.text, {
        voice,
        gender: isFemale ? 'female' : 'male',
        speed: voiceSettings.speed
      })
      .then((blobUrl) => {
        if (isCancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        const audio = new Audio(blobUrl);
        activeAudioRef.current = audio;

        audio.onplay = () => {
          if (!isCancelled) setIsSpeakingAudio(true);
        };
        audio.onended = () => {
          if (!isCancelled) setIsSpeakingAudio(false);
          URL.revokeObjectURL(blobUrl);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          if (!isCancelled) {
            setIsSpeakingAudio(false);
            URL.revokeObjectURL(blobUrl);
            activeAudioRef.current = null;
            speakWithBrowserFallback();
          }
        };

        audio.play().catch((err) => {
          console.warn('Audio play error, falling back to browser synthesis:', err);
          if (!isCancelled) {
            URL.revokeObjectURL(blobUrl);
            activeAudioRef.current = null;
            speakWithBrowserFallback();
          }
        });
      })
      .catch((err) => {
        console.warn('OpenAI TTS error, falling back to browser synthesis:', err);
        if (!isCancelled) {
          speakWithBrowserFallback();
        }
      });
    } else {
      speakWithBrowserFallback();
    }

    return () => {
      isCancelled = true;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingAudio(false);
    };
  }, [currentIntervention, ttsEnabled, voiceSettings]);

  // Subir Archivo Real
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await caseService.uploadCase(file);
      setCaseFile(res);
      setCurrentStep('analysis');
      handleRunAnalysis(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo del expediente.');
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar Análisis con OpenAI
  const handleRunAnalysis = async (cId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await caseService.analyzeCase(cId);
      setAnalysis(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en el análisis documental con OpenAI.');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar Simulación
  const handleStartSimulation = async () => {
    if (!caseFile) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      playGavelStrike();
      const res = await simulationService.startSimulation(caseFile.id, selectedRole);
      setSessionId(res.session_id);
      setCurrentIntervention(res.initial_intervention);
      const stateRes = await simulationService.getSimulationState(res.session_id);
      setSimState(stateRes);
      setCurrentStep('courtroom');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar la audiencia.');
    } finally {
      setLoading(false);
    }
  };

  // Formular Objeción Forense
  const handleRaiseObjection = async (grounds: string) => {
    if (!sessionId) return;
    setLoading(true);
    setShowObjectionModal(false);
    setErrorMessage(null);
    try {
      playGavelStrike();
      const res = await simulationService.submitObjection(sessionId, grounds);
      setCurrentIntervention(res.ruling_intervention);
      const stateRes = await simulationService.getSimulationState(sessionId);
      setSimState(stateRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al formular la objeción.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar Decisión / Argumento
  const handleSubmitDecision = async () => {
    if (!sessionId) return;
    if (!selectedOptionId && !freeText.trim()) {
      setErrorMessage('Por favor selecciona una opción o redacta tu argumento.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await simulationService.submitDecision(sessionId, {
        selected_option_id: selectedOptionId || undefined,
        free_text_response: freeText.trim() || undefined
      });

      setSelectedOptionId(null);
      setFreeText('');
      setCurrentIntervention(res.next_intervention);

      const stateRes = await simulationService.getSimulationState(sessionId);
      setSimState(stateRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar la intervención.');
    } finally {
      setLoading(false);
    }
  };

  // Finalizar y Evaluar
  const handleEvaluate = async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await simulationService.evaluateSimulation(sessionId);
      setEvaluation(res);
      setCurrentStep('evaluation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al emitir la evaluación académica.');
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar simulador
  const handleReset = () => {
    setCaseFile(null);
    setAnalysis(null);
    setSessionId(null);
    setSimState(null);
    setCurrentIntervention(null);
    setEvaluation(null);
    setSelectedOptionId(null);
    setFreeText('');
    setErrorMessage(null);
    setCurrentStep('upload');
  };

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-stone-100 font-sans select-none antialiased">
      {/* Barra de Navegación Superior */}
      <Header
        currentStep={currentStep}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          if (ttsEnabled) {
            if (activeAudioRef.current) {
              activeAudioRef.current.pause();
              activeAudioRef.current = null;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            setIsSpeakingAudio(false);
          }
          setTtsEnabled(!ttsEnabled);
        }}
        onReset={handleReset}
      />

      {/* Alerta de Error si ocurre */}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800 px-6 py-2.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="underline hover:text-white">
            Cerrar
          </button>
        </div>
      )}

      {/* Contenido Principal modularizado según el paso activo */}
      <main className={`flex-1 flex flex-col ${currentStep === 'courtroom' ? 'p-2 sm:p-3' : 'p-4 sm:p-6'} overflow-hidden`}>
        {currentStep === 'upload' && (
          <UploadStep
            loading={loading}
            onFileUpload={handleFileUpload}
            onLoadExample={handleLoadExampleCase}
          />
        )}

        {currentStep === 'analysis' && (
          <AnalysisStep
            caseFile={caseFile}
            analysis={analysis}
            loading={loading}
            onContinue={() => setCurrentStep('role_select')}
          />
        )}

        {currentStep === 'role_select' && (
          <RoleSelectStep
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            loading={loading}
            onStartSimulation={handleStartSimulation}
          />
        )}

        {currentStep === 'courtroom' && simState && (
          <>
            <CourtroomStep
              simState={simState}
              currentIntervention={currentIntervention}
              isSpeakingAudio={isSpeakingAudio}
              ttsEnabled={ttsEnabled}
              onToggleTts={() => {
                if (ttsEnabled) {
                  window.speechSynthesis?.cancel();
                  setIsSpeakingAudio(false);
                }
                setTtsEnabled(!ttsEnabled);
              }}
              onOpenVoiceSettings={() => setShowVoiceModal(true)}
              showDossier={showDossier}
              onToggleDossier={() => setShowDossier(!showDossier)}
              onEvaluate={handleEvaluate}
              selectedOptionId={selectedOptionId}
              onSelectOptionId={setSelectedOptionId}
              freeText={freeText}
              onChangeFreeText={setFreeText}
              onSubmitDecision={handleSubmitDecision}
              onOpenObjection={() => setShowObjectionModal(true)}
              loading={loading}
            />

            <ObjectionModal
              isOpen={showObjectionModal}
              onClose={() => setShowObjectionModal(false)}
              onSelectGrounds={handleRaiseObjection}
            />

            <VoiceSettingsModal
              isOpen={showVoiceModal}
              onClose={() => setShowVoiceModal(false)}
              settings={voiceSettings}
              onSaveSettings={handleSaveVoiceSettings}
            />
          </>
        )}

        {currentStep === 'evaluation' && evaluation && (
          <EvaluationStep
            evaluation={evaluation}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
