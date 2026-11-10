import React, { useRef, useEffect, useState } from 'react';
import {
  MessageSquare, Volume2, VolumeX, BookOpen, AlertTriangle, ArrowRight, Settings, Maximize2, Minimize2, Scale, Clock
} from './Icons';
import { Courtroom3D } from './Courtroom3D';
import type { Intervention } from '../types';
import type { SimulationStateResponse } from '../services/simulationService';

interface CourtroomStepProps {
  simState: SimulationStateResponse;
  currentIntervention: Intervention | null;
  isSpeakingAudio: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onOpenVoiceSettings: () => void;
  showDossier: boolean;
  onToggleDossier: () => void;
  onEvaluate: () => void;
  selectedOptionId: string | null;
  onSelectOptionId: (id: string | null) => void;
  freeText: string;
  onChangeFreeText: (val: string) => void;
  onSubmitDecision: () => void;
  onOpenObjection: () => void;
  loading: boolean;
  onSkipAudio?: () => void;
  queueLength?: number;
}

export const CourtroomStep: React.FC<CourtroomStepProps> = ({
  simState,
  currentIntervention,
  isSpeakingAudio,
  ttsEnabled,
  onToggleTts,
  onOpenVoiceSettings,
  showDossier,
  onToggleDossier,
  onEvaluate,
  selectedOptionId,
  onSelectOptionId,
  freeText,
  onChangeFreeText,
  onSubmitDecision,
  onOpenObjection,
  loading,
  onSkipAudio,
  queueLength = 0
}) => {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showFloatingPanel, setShowFloatingPanel] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [simState.interventions]);

  // Si cambia de turno al usuario, abrir el panel flotante si está en modo teatro
  useEffect(() => {
    if (currentIntervention?.options && currentIntervention.options.length > 0) {
      queueMicrotask(() => setShowFloatingPanel(true));
    }
  }, [currentIntervention]);

  const progress = simState.progress_info || {
    estimated_total_minutes: 20,
    estimated_remaining_minutes: 16,
    total_stages: 5,
    current_stage_number: 1,
    current_stage_label: simState.current_stage.replace(/_/g, ' '),
    current_turn_number: Math.max(1, simState.interventions?.length || 1),
    total_estimated_turns: 12,
    progress_percent: 15
  };

  const STAGES_LIST = [
    { key: 'apertura', label: '1. Apertura', time: '~3 min' },
    { key: 'alegatos_iniciales', label: '2. Alegatos', time: '~4 min' },
    { key: 'desahogo_pruebas', label: '3. Pruebas', time: '~6 min' },
    { key: 'alegatos_finales', label: '4. Conclusiones', time: '~4 min' },
    { key: 'deliberacion_sentencia', label: '5. Sentencia', time: '~3 min' },
  ];

  const currentStageIndex = STAGES_LIST.findIndex(s => s.key === simState.current_stage);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-2">
      {/* Barra de Estado Procesal, Duración y Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-stone-900/90 border border-stone-800 rounded-xl backdrop-blur-md shrink-0 shadow-md gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador de Etapa Activa */}
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="text-xs font-bold text-stone-100 uppercase tracking-wider">
              {simState.current_stage.replace(/_/g, ' ')}
            </span>
          </div>

          <span className="text-stone-600 hidden md:inline">•</span>

          {/* Duración Estimada del Juicio */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-950/80 border border-stone-800 text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-stone-300">
              Duración juicio: <strong className="text-stone-100 font-semibold">~{progress.estimated_total_minutes} min</strong>
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-amber-400 font-medium">
              Quedan: ~{progress.estimated_remaining_minutes} min ({progress.current_turn_number}/{progress.total_estimated_turns} turnos)
            </span>
          </div>

          <span className="text-stone-600 hidden lg:inline">•</span>

          {/* Rol del Usuario */}
          <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
            Tu Rol: {simState.user_role.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Botón para Ampliar Sala / Pantalla Completa */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 shadow-sm ${
              isTheaterMode
                ? 'bg-amber-500 text-stone-950 border-amber-400'
                : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border-stone-700 hover:border-amber-500/40'
            }`}
            title={isTheaterMode ? 'Regresar a vista estándar' : 'Maximizar sala 3D a pantalla panorámica'}
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isTheaterMode ? 'Vista Estándar' : 'Ampliar Sala 3D'}</span>
          </button>

          <button
            onClick={onToggleTts}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center space-x-1 ${
              ttsEnabled
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title={ttsEnabled ? 'Silenciar locución oral' : 'Activar locución oral'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'Voz On' : 'Voz Off'}</span>
          </button>

          <button
            onClick={onOpenVoiceSettings}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 rounded-lg text-xs font-medium transition-all border border-stone-700 flex items-center space-x-1"
            title="Configurar tipo de voz forense"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voz</span>
          </button>

          <button
            onClick={onToggleDossier}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-medium transition-all border border-stone-700 flex items-center space-x-1"
            title="Consultar hechos y pruebas documentadas del expediente"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{showDossier ? 'Ocultar Autos' : 'Ver Autos'}</span>
          </button>

          <button
            onClick={onEvaluate}
            disabled={loading}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Dictar Fallo</span>
          </button>
        </div>
      </div>

      {/* Línea de Tiempo Procesal (Stepper visual de las 5 etapas del juicio) */}
      <div className="px-3 py-1.5 bg-stone-950/70 border border-stone-800/80 rounded-xl flex items-center justify-between text-[11px] gap-1 shrink-0 overflow-x-auto">
        {STAGES_LIST.map((stage, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <div
              key={stage.key}
              className={`flex-1 min-w-[110px] flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                  : isDone
                  ? 'bg-stone-900/60 border border-stone-800 text-stone-400'
                  : 'bg-stone-950/40 border border-stone-900 text-stone-600'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isCurrent
                    ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400/40'
                    : isDone
                    ? 'bg-emerald-600 text-stone-100'
                    : 'bg-stone-800 text-stone-500'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </span>
              <div className="flex flex-col truncate">
                <span className={`font-semibold truncate ${isCurrent ? 'text-amber-200' : ''}`}>{stage.label}</span>
                <span className="text-[9px] text-stone-500">{stage.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenedor Principal: Sala 3D + Consola Procesal */}
      <div className="flex-1 relative grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* ======================================================== */}
        {/* ESCENA 3D PRINCIPAL (AMPLIADA Y DESTACADA) */}
        {/* ======================================================== */}
        <div
          className={`flex flex-col h-full transition-all duration-300 relative ${
            isTheaterMode ? 'col-span-12' : 'lg:col-span-8'
          }`}
        >
          {/* Canvas Three.js */}
          <div className="flex-1 w-full h-full relative overflow-hidden rounded-2xl">
            <Courtroom3D
              currentSpeakerRole={currentIntervention?.speaker_role}
              userRole={simState.user_role}
              activeSpeakerName={currentIntervention?.speaker_name}
              isSpeakingAudio={isSpeakingAudio}
            />

            {/* Subtítulo Dinámico Estilo Transmisión Judicial (Chyron Flotante) */}
            {currentIntervention && (
              <div className="absolute bottom-12 left-3 right-3 sm:left-10 sm:right-10 lg:left-14 lg:right-14 z-15 bg-stone-950/85 backdrop-blur-md border border-stone-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-start space-x-3 pointer-events-auto transition-all animate-fadeIn">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                      <span>{currentIntervention.speaker_name}</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 uppercase">
                        {currentIntervention.speaker_role}
                      </span>
                    </span>
                    {isSpeakingAudio && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-amber-400 animate-pulse font-bold flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Exponiendo en estrados...</span>
                        </span>
                        {onSkipAudio && (
                          <button
                            onClick={onSkipAudio}
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-[10px] transition-all cursor-pointer"
                            title="Omitir audio y pasar a la siguiente intervención"
                          >
                            Avanzar ⏭
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-stone-100 leading-relaxed text-xs sm:text-[13px] font-normal">
                    {currentIntervention.text}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* PANEL DE INTERACCIÓN Y DEBATE */}
        {/* ======================================================== */}
        {/* Si está en modo teatro, es un panel flotante retráctil; si no, ocupa 4 columnas */}
        <div
          className={`${
            isTheaterMode
              ? `absolute right-2 top-2 bottom-2 w-96 max-w-[calc(100%-1rem)] z-30 shadow-2xl transition-transform duration-300 ${
                  showFloatingPanel ? 'translate-x-0' : 'translate-x-[105%]'
                }`
              : 'lg:col-span-4 h-full'
          } flex flex-col bg-stone-900/95 border border-stone-800 rounded-2xl overflow-hidden backdrop-blur-xl`}
        >
          {/* Cabecera del Panel */}
          <div className="p-3 border-b border-stone-800 bg-stone-950/70 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-100 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Debate Procesal Forense</span>
              </h3>
              <p className="text-[10px] text-stone-400">Control de fidelidad a los hechos</p>
            </div>
            {isTheaterMode && (
              <button
                onClick={() => setShowFloatingPanel(false)}
                className="text-stone-400 hover:text-stone-200 text-xs p-1"
                title="Ocultar panel flotante"
              >
                ✕
              </button>
            )}
          </div>

          {/* Panel Desplegable de Autos / Expediente */}
          {showDossier && (
            <div className="p-3 bg-stone-950 border-b border-stone-800 max-h-48 overflow-y-auto space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase text-[10px]">Hechos y Pruebas en Autos</span>
                <button onClick={onToggleDossier} className="text-[10px] text-stone-500 hover:text-stone-300">
                  Ocultar
                </button>
              </div>
              <div className="space-y-1.5">
                {simState.facts.map((f, idx) => (
                  <div key={idx} className="p-2 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-300">
                    <span className="font-semibold text-stone-400 mr-1.5">
                      H#{idx + 1} (Pág. {f.source_references[0]?.page_number || 1}):
                    </span>
                    {f.description}
                  </div>
                ))}
                {simState.evidences.map((e, idx) => (
                  <div key={idx} className="p-2 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-300">
                    <span className="font-semibold text-amber-300 mr-1.5">Prueba ({e.evidence_type}):</span>
                    {e.name} - {e.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Intervenciones con Scroll */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {simState.interventions.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  item.is_user
                    ? 'bg-amber-950/40 border border-amber-600/40 ml-4'
                    : 'bg-stone-950/70 border border-stone-800 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={item.is_user ? 'font-bold text-amber-400' : 'font-bold text-stone-300'}>
                    {item.speaker_name}
                  </span>
                  <span className="text-stone-500 uppercase">{item.stage}</span>
                </div>
                <p className="text-stone-300 leading-relaxed text-[11.5px]">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Opciones de Decisión Táctica o Redacción Libre */}
          <div className="p-3 border-t border-stone-800 bg-stone-950/90 space-y-2.5 shrink-0">
            {simState.status === 'concluido' || (simState.current_stage === 'concluido' && queueLength === 0 && !isSpeakingAudio) || (currentIntervention?.stage === 'deliberacion_sentencia' && (!currentIntervention?.options || currentIntervention.options.length === 0) && queueLength === 0 && !isSpeakingAudio) ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/60 text-center space-y-3 shadow-lg">
                <div className="flex items-center justify-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>Audiencia Judicial Concluida</span>
                </div>
                <p className="text-[11.5px] text-stone-300 leading-relaxed">
                  El Tribunal ha deliberado y dictado la Sentencia Judicial definitiva. Procede a consultar el informe de evaluación pedagógica y análisis forense.
                </p>
                <button
                  onClick={onEvaluate}
                  disabled={loading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  <Scale className="w-4 h-4" />
                  <span>Consultar Sentencia y Evaluación Académica</span>
                </button>
              </div>
            ) : (
              <>
                <span className="text-[11px] font-bold text-stone-200 block">Tu Turno de Intervención:</span>

                {/* Opciones estructuradas sugeridas */}
                {currentIntervention?.options && currentIntervention.options.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {currentIntervention.options.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          onSelectOptionId(opt.id);
                          onChangeFreeText('');
                        }}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedOptionId === opt.id
                            ? 'bg-amber-950/70 border-amber-500 ring-1 ring-amber-500'
                            : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="font-semibold text-amber-300">Táctica: {opt.legal_tactic || 'Alegato'}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold ${
                              opt.risk_level === 'alto'
                                ? 'bg-red-950 text-red-400'
                                : opt.risk_level === 'medio'
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-emerald-950 text-emerald-400'
                            }`}
                          >
                            Riesgo {opt.risk_level}
                          </span>
                        </div>
                        <p className="text-stone-200 text-[11px] leading-tight">{opt.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campo de texto libre */}
                <div>
                  <textarea
                    rows={2}
                    value={freeText}
                    onChange={(e) => {
                      onChangeFreeText(e.target.value);
                      onSelectOptionId(null);
                    }}
                    placeholder="O redacta tu propia alegación procesal..."
                    className="w-full p-2 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Indicador de Orador en Estrados mientras habla */}
                {isSpeakingAudio && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="leading-tight text-[11px]">
                        <strong>{currentIntervention?.speaker_name}</strong> expone en estrados...
                        {queueLength > 0 && <span className="text-amber-400 font-semibold ml-1">({queueLength} turno en espera)</span>}
                      </span>
                    </div>
                    {onSkipAudio && (
                      <button
                        onClick={onSkipAudio}
                        className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-bold border border-amber-500/40 shrink-0 cursor-pointer"
                      >
                        Avanzar ⏭
                      </button>
                    )}
                  </div>
                )}

                {/* Acciones de turno: Formular Objeción o Sostener Argumentación */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onOpenObjection}
                    disabled={loading || isSpeakingAudio}
                    className="px-3 py-2 bg-red-950/70 hover:bg-red-900/80 disabled:opacity-50 text-red-300 font-bold rounded-lg text-xs border border-red-800 transition-colors flex items-center justify-center space-x-1 shadow-sm"
                    title="Interponer objeción procesal en tiempo real"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Objeción</span>
                  </button>

                  <button
                    onClick={onSubmitDecision}
                    disabled={loading || isSpeakingAudio || (!selectedOptionId && !freeText.trim())}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    {loading ? (
                      <span>Generando debate en sala...</span>
                    ) : isSpeakingAudio ? (
                      <span>Escuchando intervención en estrados...</span>
                    ) : (
                      <>
                        <span>Sostener en Audiencia</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Botón flotante para reabrir el panel si está en modo teatro y fue cerrado */}
        {isTheaterMode && !showFloatingPanel && (
          <button
            onClick={() => setShowFloatingPanel(true)}
            className="absolute right-4 bottom-4 z-25 p-3 rounded-full bg-amber-500 text-stone-950 font-bold shadow-2xl hover:bg-amber-400 transition-transform hover:scale-105 flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Abrir Debate</span>
          </button>
        )}
      </div>
    </div>
  );
};
