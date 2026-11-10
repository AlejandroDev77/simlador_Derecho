import React, { useRef, useEffect, useState } from 'react';
import {
  MessageSquare, Volume2, VolumeX, BookOpen, AlertTriangle, ArrowRight, Settings, Maximize2, Minimize2, Scale, Clock, CheckCircle2, ChevronRight, FileText, User, Gavel
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

  const isJudge = simState.user_role === 'juez';

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
    <div className="flex-1 flex flex-col space-y-3.5 pb-6">
      {/* Barra Superior: Estado Procesal, Duración y Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 bg-[#14263D] border border-[#243F5B] rounded-2xl text-slate-100 shrink-0 shadow-md gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador de Etapa Activa */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#243F5B]/80 border border-[#C5A15B]/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {simState.current_stage.replace(/_/g, ' ')}
            </span>
          </div>

          <span className="text-slate-500 hidden md:inline">•</span>

          {/* Duración Estimada del Juicio */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1E31]/80 border border-[#243F5B] text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
            <span className="text-slate-300">
              Duración prevista: <strong className="text-white font-semibold">~{progress.estimated_total_minutes} min</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[#C5A15B] font-medium">
              Restante: ~{progress.estimated_remaining_minutes} min (Turno {progress.current_turn_number}/{progress.total_estimated_turns})
            </span>
          </div>

          <span className="text-slate-500 hidden lg:inline">•</span>

          {/* Rol del Usuario */}
          <span className="text-xs text-[#C5A15B] font-semibold bg-[#243F5B] border border-[#C5A15B]/30 px-2.5 py-1 rounded-md">
            Rol en Estrados: {isJudge ? 'MAGISTRADO PRESIDENTE (TRIBUNAL)' : simState.user_role.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Botón para Ampliar Sala / Vista Panorámica */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center space-x-1.5 shadow-xs cursor-pointer ${
              isTheaterMode
                ? 'bg-[#C5A15B] text-[#14263D] border-[#C5A15B]'
                : 'bg-[#243F5B] hover:bg-[#1C3554] text-slate-200 border-[#243F5B]'
            }`}
            title={isTheaterMode ? 'Regresar a vista con panel procesal' : 'Ampliar sala 3D a pantalla panorámica'}
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isTheaterMode ? 'Vista Estándar' : 'Ampliar Sala'}</span>
          </button>

          {/* Toggle de Locución Oral */}
          <button
            onClick={onToggleTts}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center space-x-1 cursor-pointer ${
              ttsEnabled
                ? 'bg-[#243F5B] border-[#C5A15B]/50 text-[#C5A15B]'
                : 'bg-[#1C3554] border-[#243F5B] text-slate-400 hover:text-slate-200'
            }`}
            title={ttsEnabled ? 'Silenciar locución oral' : 'Activar locución oral'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#C5A15B]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'Voz Activa' : 'Sin Voz'}</span>
          </button>

          {/* Configuración Rápida de Voces */}
          <button
            onClick={onOpenVoiceSettings}
            className="px-2.5 py-1.5 bg-[#243F5B] hover:bg-[#1C3554] text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-all border border-[#243F5B] flex items-center space-x-1 cursor-pointer"
            title="Ajustar parámetros vocales forenses"
          >
            <Settings className="w-3.5 h-3.5 text-[#C5A15B]" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {/* Consultar Expediente / Autos */}
          <button
            onClick={onToggleDossier}
            className="px-2.5 py-1.5 bg-[#243F5B] hover:bg-[#1C3554] text-slate-200 rounded-lg text-xs font-medium transition-all border border-[#243F5B] flex items-center space-x-1 cursor-pointer"
            title="Consultar hechos y pruebas documentadas del expediente"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C5A15B]" />
            <span className="hidden sm:inline">{showDossier ? 'Ocultar Autos' : 'Ver Autos'}</span>
          </button>

          {/* Dictar Fallo Inmediato */}
          <button
            onClick={onEvaluate}
            disabled={loading}
            className="px-3 py-1.5 bg-[#C5A15B] hover:bg-[#B5924D] text-[#14263D] font-bold rounded-lg text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Emitir Fallo</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONTENEDOR DE LOS DOS CARDS: SALA 3D Y PANEL DE DEBATE */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[580px] lg:h-[calc(100vh-220px)] lg:min-h-[580px] xl:h-[calc(100vh-200px)] shrink-0">
        {/* ======================================================== */}
        {/* CARD 1: ESCENA 3D PRINCIPAL */}
        {/* ======================================================== */}
        <div
          className={`flex flex-col h-full transition-all duration-300 relative ${
            isTheaterMode ? 'col-span-12' : 'lg:col-span-8'
          }`}
        >
          {/* Canvas Three.js con marco institucional */}
          <div className="flex-1 w-full h-full relative overflow-hidden rounded-2xl border border-slate-200 shadow-md bg-white">
            <Courtroom3D
              currentSpeakerRole={currentIntervention?.speaker_role}
              userRole={simState.user_role}
              activeSpeakerName={currentIntervention?.speaker_name}
              isSpeakingAudio={isSpeakingAudio}
            />

            {/* Subtítulo Dinámico Estilo Transmisión Judicial */}
            {currentIntervention && (
              <div className="absolute bottom-12 left-3 right-3 sm:left-6 sm:right-6 lg:left-8 lg:right-8 z-20 bg-[#14263D]/95 backdrop-blur-md border border-[#C5A15B]/50 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-start space-x-3 pointer-events-auto transition-all animate-fadeIn max-h-36 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-[#243F5B] text-[#C5A15B] border border-[#C5A15B]/40 shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#C5A15B] text-sm flex items-center gap-2">
                      <span>{currentIntervention.speaker_name}</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-[#243F5B] text-slate-200 border border-[#243F5B] uppercase">
                        {currentIntervention.speaker_role}
                      </span>
                    </span>
                    {isSpeakingAudio && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-[#C5A15B] animate-pulse font-bold flex items-center space-x-1 bg-[#243F5B] px-2.5 py-0.5 rounded-full border border-[#C5A15B]/30">
                          <Volume2 className="w-3.5 h-3.5 text-[#C5A15B]" />
                          <span>Exponiendo en estrados...</span>
                        </span>
                        {onSkipAudio && (
                          <button
                            onClick={onSkipAudio}
                            className="px-2 py-0.5 rounded bg-[#243F5B] hover:bg-[#1C3554] text-slate-200 hover:text-white border border-[#243F5B] text-[10px] transition-all cursor-pointer flex items-center space-x-1"
                            title="Omitir audio y avanzar turno"
                          >
                            <span>Avanzar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-white leading-relaxed text-xs sm:text-[13px] font-normal">
                    {currentIntervention.text}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 2: PANEL DE INTERACCIÓN Y RESPUESTAS */}
        {/* ======================================================== */}
        <div
          className={`${
            isTheaterMode
              ? `absolute right-2 top-2 bottom-2 w-96 max-w-[calc(100%-1rem)] z-30 shadow-2xl transition-transform duration-300 ${
                  showFloatingPanel ? 'translate-x-0' : 'translate-x-[105%]'
                }`
              : 'lg:col-span-4 h-full'
          } flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md`}
        >
          {/* Cabecera del Panel */}
          <div className="p-3 border-b border-[#243F5B] bg-[#14263D] flex items-center justify-between text-white shrink-0">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C5A15B]" />
                <span>Debate Procesal Forense</span>
              </h3>
              <p className="text-[10px] text-slate-300">Control de fidelidad fáctica y probatoria</p>
            </div>
            {isTheaterMode && (
              <button
                onClick={() => setShowFloatingPanel(false)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                title="Ocultar panel flotante"
              >
                ✕
              </button>
            )}
          </div>

          {/* Panel Desplegable de Autos / Expediente */}
          {showDossier && (
            <div className="p-3 bg-[#F5F3EF] border-b border-slate-200 max-h-44 overflow-y-auto space-y-2 text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#14263D] uppercase text-[10px] tracking-wider">
                  Hechos y Pruebas en Autos
                </span>
                <button
                  onClick={onToggleDossier}
                  className="text-[10px] text-slate-500 hover:text-[#14263D] font-semibold cursor-pointer"
                >
                  Ocultar
                </button>
              </div>
              <div className="space-y-1.5">
                {simState.facts.map((f, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-[#334155] shadow-xs">
                    <span className="font-bold text-[#14263D] mr-1.5">
                      H#{idx + 1} (Pág. {f.source_references[0]?.page_number || 1}):
                    </span>
                    {f.description}
                  </div>
                ))}
                {simState.evidences.map((e, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-[#334155] shadow-xs">
                    <span className="font-bold text-[#C5A15B] mr-1.5">Prueba ({e.evidence_type}):</span>
                    {e.name} - {e.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Intervenciones con Scroll */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px] bg-[#F8F9FA]">
            {simState.interventions.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  item.is_user
                    ? 'bg-[#243F5B] text-white border border-[#243F5B] ml-4 shadow-xs'
                    : 'bg-white text-[#334155] border border-slate-200 mr-4 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={item.is_user ? 'font-bold text-[#C5A15B]' : 'font-bold text-[#14263D]'}>
                    {item.speaker_name}
                  </span>
                  <span className={item.is_user ? 'text-slate-300 uppercase' : 'text-slate-400 uppercase'}>
                    {item.stage}
                  </span>
                </div>
                <p className={`leading-relaxed text-[11.5px] ${item.is_user ? 'text-slate-100' : 'text-[#334155]'}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Opciones de Decisión Táctica o Redacción Libre */}
          <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
            {simState.status === 'concluido' ||
            (simState.current_stage === 'concluido' && queueLength === 0 && !isSpeakingAudio) ||
            (currentIntervention?.stage === 'deliberacion_sentencia' &&
              (!currentIntervention?.options || currentIntervention.options.length === 0) &&
              queueLength === 0 &&
              !isSpeakingAudio) ? (
              <div className="p-3.5 rounded-xl bg-[#F5F3EF] border border-[#C5A15B] text-center space-y-2.5 shadow-md">
                <div className="flex items-center justify-center space-x-2 text-[#14263D] font-bold text-xs uppercase tracking-wider">
                  <Scale className="w-5 h-5 text-[#C5A15B]" />
                  <span>Audiencia Judicial Concluida</span>
                </div>
                <p className="text-[11px] text-[#334155] leading-relaxed">
                  El Tribunal ha deliberado y dictado la Sentencia Judicial definitiva. Procede a consultar el informe de evaluación académica y análisis forense.
                </p>
                <button
                  onClick={onEvaluate}
                  disabled={loading}
                  className="w-full py-2.5 bg-[#243F5B] hover:bg-[#1C3554] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
                >
                  <Scale className="w-4 h-4 text-[#C5A15B]" />
                  <span>Consultar Sentencia y Evaluación Académica</span>
                </button>
              </div>
            ) : (
              <>
                <span className="text-[11px] font-bold text-[#14263D] block">
                  {isJudge ? 'Providencia y Dirección Judicial del Tribunal:' : 'Turno de Intervención Procesal:'}
                </span>

                {/* Opciones estructuradas sugeridas */}
                {currentIntervention?.options && currentIntervention.options.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {currentIntervention.options.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          onSelectOptionId(opt.id);
                          onChangeFreeText('');
                        }}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedOptionId === opt.id
                            ? 'bg-[#F5F3EF] border-[#C5A15B] ring-2 ring-[#C5A15B]/40 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="font-bold text-[#243F5B]">
                            {isJudge ? 'Decisión Judicial: ' : 'Táctica: '}{opt.legal_tactic || (isJudge ? 'Providencia' : 'Alegato')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                              opt.risk_level === 'alto'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : opt.risk_level === 'medio'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            Riesgo {opt.risk_level}
                          </span>
                        </div>
                        <p className="text-[#334155] text-[11px] leading-tight">{opt.text}</p>
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
                    placeholder={isJudge ? "O dicte su propia providencia, requerimiento o fallo judicial..." : "O redacta tu propia alegación procesal..."}
                    className="w-full p-2 bg-[#F5F3EF] border border-slate-300 rounded-lg text-xs text-[#334155] placeholder-slate-400 focus:outline-none focus:border-[#243F5B] focus:bg-white resize-none"
                  />
                </div>

                {/* Indicador de Orador en Estrados mientras habla */}
                {isSpeakingAudio && (
                  <div className="p-2 rounded-xl bg-[#F5F3EF] border border-[#C5A15B]/50 text-xs text-[#14263D] flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#C5A15B] animate-ping shrink-0" />
                      <span className="leading-tight text-[10.5px]">
                        <strong>{currentIntervention?.speaker_name}</strong> expone en estrados...
                        {queueLength > 0 && (
                          <span className="text-[#243F5B] font-semibold ml-1">
                            ({queueLength} en espera)
                          </span>
                        )}
                      </span>
                    </div>
                    {onSkipAudio && (
                      <button
                        onClick={onSkipAudio}
                        className="px-2 py-0.5 bg-white hover:bg-slate-100 text-[#14263D] rounded text-[10px] font-bold border border-slate-300 shrink-0 cursor-pointer flex items-center space-x-1"
                      >
                        <span>Avanzar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Acciones de turno: Formular Objeción / Apercibir o Pronunciar en Sala */}
                <div className="flex items-center space-x-2 pt-0.5">
                  {isJudge ? (
                    <button
                      onClick={() => {
                        onChangeFreeText('El Tribunal previene a las partes sobre el deber de conducirse con estricta pertinencia y respeto a la sala, bajo apercibimiento procesal.');
                        onSelectOptionId(null);
                      }}
                      disabled={loading || isSpeakingAudio}
                      className="px-3 py-2 bg-[#243F5B] hover:bg-[#1C3554] disabled:opacity-50 text-[#C5A15B] font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer border border-[#C5A15B]/40"
                      title="Apercibir a los letrados para mantener el orden procesal"
                    >
                      <Gavel className="w-3.5 h-3.5 text-[#C5A15B]" />
                      <span>Apercibir</span>
                    </button>
                  ) : (
                    <button
                      onClick={onOpenObjection}
                      disabled={loading || isSpeakingAudio}
                      className="px-3 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                      title="Interponer objeción procesal en tiempo real"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Objeción</span>
                    </button>
                  )}

                  <button
                    onClick={onSubmitDecision}
                    disabled={loading || isSpeakingAudio || (!selectedOptionId && !freeText.trim())}
                    className="flex-1 py-2 bg-[#243F5B] hover:bg-[#1C3554] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    {loading ? (
                      <span>{isJudge ? 'Pronunciando resolución en sala...' : 'Procesando alegato en sala...'}</span>
                    ) : isSpeakingAudio ? (
                      <span>{isJudge ? 'Escuchando a las partes en estrados...' : 'Atendiendo comparecencia en estrados...'}</span>
                    ) : (
                      <>
                        <span>{isJudge ? 'Pronunciar en Sala' : 'Sostener en Audiencia'}</span>
                        {isJudge ? <Gavel className="w-3.5 h-3.5 text-[#C5A15B]" /> : <ArrowRight className="w-3.5 h-3.5 text-[#C5A15B]" />}
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
            className="absolute right-4 bottom-4 z-30 p-3 rounded-full bg-[#243F5B] text-white font-bold shadow-2xl hover:bg-[#1C3554] border border-[#C5A15B]/50 transition-transform hover:scale-105 flex items-center space-x-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#C5A15B]" />
            <span className="text-xs">Abrir Debate</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* BARRA DE ESTADOS DEL EXPEDIENTE (UBICADA ABAJO DE LOS DOS CARDS) */}
      {/* ======================================================== */}
      <div className="bg-[#14263D] border border-[#243F5B] rounded-2xl p-3.5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Fases del Expediente */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 overflow-x-auto py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A15B] shrink-0 mr-1 hidden sm:inline">
            Estados del Expediente:
          </span>

          {/* 1. Expediente Judicial */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#1C3554]/70 text-slate-300 border border-[#243F5B] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
            <span className="text-[11px] font-medium">1. Expediente Judicial</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

          {/* 2. Análisis Documental */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#1C3554]/70 text-slate-300 border border-[#243F5B] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
            <span className="text-[11px] font-medium">2. Análisis Documental</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

          {/* 3. Asignación de Rol */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#1C3554]/70 text-slate-300 border border-[#243F5B] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
            <span className="text-[11px] font-medium">3. Asignación de Rol</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

          {/* 4. Audiencia en Sala (FASE ACTIVA) */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs bg-[#243F5B] text-white border border-[#C5A15B]/80 shadow-sm font-semibold shrink-0">
            <Gavel className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
            <span className="text-[11px]">4. Audiencia en Sala</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

          {/* 5. Sentencia y Fallo */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs shrink-0 ${
            simState.status === 'concluido'
              ? 'bg-[#243F5B] text-white border border-[#C5A15B]'
              : 'text-slate-500 bg-[#0F1E31]/50 border border-[#243F5B]/40'
          }`}>
            <Scale className={`w-3.5 h-3.5 shrink-0 ${simState.status === 'concluido' ? 'text-[#C5A15B]' : 'text-slate-500'}`} />
            <span className="text-[11px]">5. Sentencia y Fallo</span>
          </div>
        </div>

        {/* Etapa Específica de la Audiencia */}
        <div className="flex items-center space-x-2 text-xs text-slate-300 md:pl-4 md:border-l md:border-[#243F5B] shrink-0">
          <span className="text-[#C5A15B] font-semibold text-[11px]">Etapa Oral:</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#243F5B] text-white text-[11px] font-semibold uppercase tracking-wider border border-[#C5A15B]/30">
            {simState.current_stage.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};
