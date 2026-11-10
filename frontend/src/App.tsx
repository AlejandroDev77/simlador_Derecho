import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from './components/Icons';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SettingsStep } from './components/SettingsStep';
import { UploadStep } from './components/UploadStep';
import { AnalysisStep } from './components/AnalysisStep';
import { RoleSelectStep } from './components/RoleSelectStep';
import { CourtroomStep } from './components/CourtroomStep';
import { ObjectionModal } from './components/ObjectionModal';
import { EvaluationStep } from './components/EvaluationStep';
import { playGavelStrike } from './utils/audio';
import { caseService } from './services/caseService';
import type { UploadCaseResponse } from './services/caseService';
import { simulationService } from './services/simulationService';
import type { SimulationStateResponse } from './services/simulationService';
import type { Step, CaseAnalysis, LegalRole, AcademicEvaluation, Intervention, VoiceSettings } from './types';

function resolveSpeakerVoice(
  speakerRole: string,
  speakerName: string = '',
  gender: string = 'male',
  settings: VoiceSettings
): string {
  const isFemale = gender === 'female';
  const role = (speakerRole || '').toLowerCase();
  const name = (speakerName || '').toLowerCase();

  // 1. Tribunal / Juez: Preservar voz solemne 'onyx' (o femaleVoice / 'nova' si jueza)
  if (role === 'juez' || role.includes('juez') || name.includes('juez') || name.includes('magistrad')) {
    return isFemale ? (settings.femaleVoice || 'nova') : (settings.maleVoice || 'onyx');
  }

  // 2. Abogado Demandante / Acusación / Fiscal: Voz distintiva 'fable' (o 'nova')
  if (
    role === 'abogado_demandante' ||
    role === 'fiscal' ||
    role.includes('acusac') ||
    role.includes('fiscal') ||
    name.includes('fiscal') ||
    name.includes('prieto') ||
    name.includes('actor')
  ) {
    return isFemale ? 'nova' : 'fable';
  }

  // 3. Abogado Defensor / Demandado: Voz distintiva 'echo' (o 'shimmer')
  if (
    role === 'abogado_demandado' ||
    role === 'abogado_defensor' ||
    role.includes('defens') ||
    name.includes('defens') ||
    name.includes('morales')
  ) {
    return isFemale ? 'shimmer' : 'echo';
  }

  // 4. Partes materiales (Demandante o Demandado):
  if (role === 'demandante' || name.includes('demandante')) {
    return isFemale ? 'shimmer' : 'alloy';
  }
  if (role === 'demandado' || role.includes('acusado') || name.includes('acusado') || name.includes('silva')) {
    return isFemale ? 'nova' : 'alloy';
  }

  // Fallback adaptativo
  return isFemale ? (settings.femaleVoice || 'nova') : (settings.maleVoice || 'onyx');
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [previousStep, setPreviousStep] = useState<Step>('upload');
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

  // Audio / TTS con Web Speech API y configuración personalizada
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [interventionQueue, setInterventionQueue] = useState<Intervention[]>([]);
  const interventionQueueRef = useRef<Intervention[]>([]);

  useEffect(() => {
    interventionQueueRef.current = interventionQueue;
  }, [interventionQueue]);

  const advanceToNextIntervention = () => {
    if (interventionQueueRef.current.length > 0) {
      const [nextItem, ...rest] = interventionQueueRef.current;
      interventionQueueRef.current = rest;
      setInterventionQueue(rest);
      setTimeout(() => {
        setCurrentIntervention(nextItem);
      }, 650);
    } else {
      setIsSpeakingAudio(false);
    }
  };

  const handleSkipAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    advanceToNextIntervention();
  };

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

  const handleNavigateSettings = () => {
    if (currentStep !== 'settings') {
      setPreviousStep(currentStep);
    }
    setCurrentStep('settings');
  };

  const handleNavigateSimulation = () => {
    if (currentStep === 'settings') {
      setCurrentStep(previousStep || 'upload');
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
      setPreviousStep('analysis');
      setCurrentStep('analysis');
      await handleRunAnalysis(res.id);
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
      utterance.onend = () => { if (!isCancelled) advanceToNextIntervention(); };
      utterance.onerror = () => { if (!isCancelled) advanceToNextIntervention(); };

      window.speechSynthesis.speak(utterance);
    };

    if (!ttsEnabled) {
      const timer = setTimeout(() => {
        if (!isCancelled) advanceToNextIntervention();
      }, 4000);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    if (voiceSettings.engine === 'openai') {
      const isFemale = currentIntervention.speaker_gender === 'female';
      const voice = resolveSpeakerVoice(
        currentIntervention.speaker_role,
        currentIntervention.speaker_name,
        currentIntervention.speaker_gender || 'male',
        voiceSettings
      );

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
          if (!isCancelled) {
            URL.revokeObjectURL(blobUrl);
            activeAudioRef.current = null;
            advanceToNextIntervention();
          }
        };
        audio.onerror = () => {
          if (!isCancelled) {
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
      setPreviousStep('analysis');
      setCurrentStep('analysis');
      await handleRunAnalysis(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo del expediente.');
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar Análisis
  const handleRunAnalysis = async (cId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await caseService.analyzeCase(cId);
      setAnalysis(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en el análisis documental del expediente.');
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
      setPreviousStep('courtroom');
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

      // 1. Crear intervención del alumno
      const userRole = simState?.user_role || selectedRole;
      const isJudge = userRole === 'juez';
      const userGender = res.user_intervention?.speaker_gender || 'male';
      const roleLabel = isJudge
        ? 'Magistrado Presidente'
        : userRole === 'abogado_demandante'
        ? 'Letrado Acusación'
        : userRole === 'fiscal'
        ? 'Ministerio Fiscal'
        : userRole === 'abogado_defensor' || userRole === 'abogado_demandado'
        ? 'Letrado Defensor'
        : userRole === 'demandante'
        ? 'Parte Demandante'
        : 'Parte Demandada';

      const userModelKey = isJudge
        ? 'juez1'
        : (userRole === 'abogado_defensor' || userRole === 'abogado_demandado')
        ? 'abogada1_mujer'
        : 'abogado1_hombre';

      const userIntervention: Intervention = {
        id: res.user_intervention?.id || `user_inv_${Date.now()}`,
        speaker_role: userRole,
        speaker_name: `Tú (${roleLabel})`,
        stage: res.current_stage || simState?.current_stage || 'alegatos',
        text: res.user_intervention?.text || freeText || (isJudge ? 'El Tribunal dispone la prosecución de los autos conforme a derecho.' : 'Sostengo la argumentación conforme a las constancias de autos.'),
        is_user: true,
        model_3d_key: userModelKey,
        speaker_gender: userGender,
        options: []
      };

      // 2. Secuencia completa: Primero expone el alumno en el centro -> luego réplica y moderación
      const aiSequence = (res.interventions_sequence && res.interventions_sequence.length > 0)
        ? res.interventions_sequence
        : (res.next_intervention ? [res.next_intervention] : []);

      const fullSequence = [userIntervention, ...aiSequence];

      setSelectedOptionId(null);
      setFreeText('');

      setCurrentIntervention(fullSequence[0]);
      const remaining = fullSequence.slice(1);
      interventionQueueRef.current = remaining;
      setInterventionQueue(remaining);

      // Si la simulación ha concluido con el fallo del juez, registrar la evaluación
      if (res.is_concluded && res.evaluation) {
        setEvaluation(res.evaluation);
      }

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
    if (evaluation) {
      setPreviousStep('evaluation');
      setCurrentStep('evaluation');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await simulationService.evaluateSimulation(sessionId);
      setEvaluation(res);
      setPreviousStep('evaluation');
      setCurrentStep('evaluation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al emitir la evaluación pedagógica.');
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
    setPreviousStep('upload');
    setCurrentStep('upload');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F3EF] text-[#334155] font-sans select-none antialiased">
      {/* Barra Lateral Izquierda (Azul Noche #14263D) */}
      <Sidebar
        currentStep={currentStep}
        onNavigateSimulation={handleNavigateSimulation}
        onNavigateSettings={handleNavigateSettings}
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
        isSimulating={Boolean(sessionId && currentStep !== 'evaluation')}
      />

      {/* Contenedor Principal Derecho (Navbar + Main con Scroll Vertical) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Barra de Navegación Superior Limpia */}
        <Header
          currentStep={currentStep}
          caseTitle={analysis?.case_number || caseFile?.filename}
        />

        {/* Alerta de Error si ocurre */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-800 shrink-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="underline hover:text-red-950 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Contenido Principal con Scroll Vertical (overflow-y-auto) */}
        <main className={`flex-1 flex flex-col ${currentStep === 'courtroom' ? 'p-2 sm:p-4 pb-8' : 'p-4 sm:p-6'} overflow-y-auto min-h-0`}>
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
              onContinue={() => {
                setPreviousStep('role_select');
                setCurrentStep('role_select');
              }}
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
                onOpenVoiceSettings={handleNavigateSettings}
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
                onSkipAudio={handleSkipAudio}
                queueLength={interventionQueue.length}
              />

              <ObjectionModal
                isOpen={showObjectionModal}
                onClose={() => setShowObjectionModal(false)}
                onSelectGrounds={handleRaiseObjection}
              />
            </>
          )}

          {currentStep === 'evaluation' && evaluation && (
            <EvaluationStep
              evaluation={evaluation}
              onReset={handleReset}
            />
          )}

          {currentStep === 'settings' && (
            <SettingsStep
              settings={voiceSettings}
              onSaveSettings={handleSaveVoiceSettings}
              onReturnToSimulation={handleNavigateSimulation}
              onResetSimulation={handleReset}
              isSimulating={Boolean(sessionId && currentStep !== 'evaluation')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
