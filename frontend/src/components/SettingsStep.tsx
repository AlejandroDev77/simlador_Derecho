import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, Play, CheckCircle2, Shield, ArrowRight, RotateCcw, Scale, Sun, Moon } from './Icons';
import { simulationService } from '../services/simulationService';
import type { VoiceSettings } from '../types';

interface SettingsStepProps {
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
  onReturnToSimulation: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
}

export const SettingsStep: React.FC<SettingsStepProps> = ({
  settings,
  onSaveSettings,
  onReturnToSimulation,
  onResetSimulation,
  isSimulating
}) => {
  const [engine, setEngine] = useState<'openai' | 'browser'>(settings.engine || 'openai');
  const [maleVoice, setMaleVoice] = useState<string>(settings.maleVoice || 'onyx');
  const [femaleVoice, setFemaleVoice] = useState<string>(settings.femaleVoice || 'nova');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>(settings.browserVoiceURI || '');
  const [speed, setSpeed] = useState<number>(settings.speed ?? 1.0);
  const [pitch, setPitch] = useState<number>(settings.pitch ?? 1.0);
  const [volume, setVolume] = useState<number>(settings.volume ?? 1.0);
  const [autoModulateRole, setAutoModulateRole] = useState<boolean>(settings.autoModulateRole ?? true);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const sorted = [...allVoices].sort((a, b) => {
        const aEs = a.lang.startsWith('es') ? 1 : 0;
        const bEs = b.lang.startsWith('es') ? 1 : 0;
        return bEs - aEs;
      });
      setBrowserVoices(sorted);

      if (!selectedBrowserVoiceURI && sorted.length > 0) {
        const defaultEs = sorted.find((v) => v.lang.startsWith('es')) || sorted[0];
        setSelectedBrowserVoiceURI(defaultEs.voiceURI);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedBrowserVoiceURI]);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTestVoice = async (voiceKey: string, roleName: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setTestingVoice(voiceKey);

    const testPhrase = `Señorías: Comparezco en estrados como ${roleName} para formular la intervención correspondiente conforme al derecho procesal.`;

    try {
      if (engine === 'openai') {
        const audioUrl = await simulationService.getSpeechAudioBlobUrl(testPhrase, {
          voice: voiceKey,
          speed
        });
        const audio = new Audio(audioUrl);
        audio.volume = Math.max(0, Math.min(1, volume));
        activeAudioRef.current = audio;

        audio.onended = () => {
          setTestingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setTestingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        await audio.play();
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(testPhrase);
          utterance.lang = 'es-ES';
          utterance.rate = speed;
          utterance.pitch = pitch;
          utterance.volume = Math.max(0, Math.min(1, volume));
          if (selectedBrowserVoiceURI) {
            const v = browserVoices.find((item) => item.voiceURI === selectedBrowserVoiceURI);
            if (v) utterance.voice = v;
          }
          utterance.onend = () => setTestingVoice(null);
          utterance.onerror = () => setTestingVoice(null);
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch {
      setTestingVoice(null);
    }
  };

  const handleSave = () => {
    const updated: VoiceSettings = {
      engine,
      maleVoice,
      femaleVoice,
      browserVoiceURI: selectedBrowserVoiceURI,
      speed,
      pitch,
      volume,
      autoModulateRole
    };
    onSaveSettings(updated);
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onReturnToSimulation();
    }, 600);
  };

  return (
    <div className="flex-1 bg-[#F5F3EF] text-[#334155] p-6 sm:p-10 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabecera institucional de la sección */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#14263D] text-[#C5A15B] flex items-center justify-center shadow-md shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#C5A15B]">
                Administración de Sala
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#14263D] tracking-tight">
                Configuración General y Síntesis de Audiencia
              </h1>
              <p className="text-xs text-[#64748B]">
                Gestión de síntesis vocal forense, cadencia de estrados y entorno procesal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onReturnToSimulation}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#14263D] bg-[#F5F3EF] hover:bg-[#EAE6DE] border border-[#E2E8F0] transition-colors"
            >
              Regresar a Audiencia
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#243F5B] hover:bg-[#14263D] shadow-md transition-all flex items-center space-x-2"
            >
              {saveFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#C5A15B]" />
                  <span>Guardado</span>
                </>
              ) : (
                <span>Aplicar Cambios</span>
              )}
            </button>
          </div>
        </div>

        {/* Sección 1: Motor y Asignación de Voces */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Volume2 className="w-5 h-5 text-[#243F5B]" />
              <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wide">
                1. Síntesis Vocal y Asignación de Timbres Forenses
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#14263D]/5 text-[#14263D] font-semibold border border-[#E2E8F0]">
              Personalización de Oratoria
            </span>
          </div>

          {/* Selector de Motor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setEngine('openai')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                engine === 'openai'
                  ? 'bg-[#14263D]/5 border-[#243F5B] ring-1 ring-[#243F5B]'
                  : 'bg-white border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-[#14263D]">Síntesis Neural de Alta Fidelidad</span>
                <span className="text-[10px] bg-[#C5A15B]/20 text-[#14263D] px-2 py-0.5 rounded font-bold">Oficial</span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Elocución clara con timbres diferenciados para magistrado, letrado de acusación y letrada defensora.
              </p>
            </div>

            <div
              onClick={() => setEngine('browser')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                engine === 'browser'
                  ? 'bg-[#14263D]/5 border-[#243F5B] ring-1 ring-[#243F5B]'
                  : 'bg-white border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-[#14263D]">Sintetizador Local del Sistema</span>
                <span className="text-[10px] bg-slate-100 text-[#64748B] px-2 py-0.5 rounded font-bold">Respaldo</span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Voz integrada de Windows / Navegador, sin requerimiento de red externa.
              </p>
            </div>
          </div>

          {/* Voces Preconfiguradas por Rol Procesal */}
          {engine === 'openai' ? (
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold text-[#14263D] block">
                Timbres de Sala Preconfigurados por Rol Procesal:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Juez */}
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F3EF]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#14263D]">Presidencia / Juez</span>
                    <span className="text-[10px] font-bold text-[#C5A15B]">Onyx / Nova</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Voz masculina solemne (Onyx) o femenina (Nova) según el magistrado del expediente.
                  </p>
                  <button
                    onClick={() => handleTestVoice('onyx', 'Magistrado Presidente del Tribunal')}
                    disabled={testingVoice === 'onyx'}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#243F5B] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#C5A15B]" />
                    <span>{testingVoice === 'onyx' ? 'Reproduciendo...' : 'Probar Timbre'}</span>
                  </button>
                </div>

                {/* Acusación */}
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F3EF]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#14263D]">Abogado Acusador / Demandante</span>
                    <span className="text-[10px] font-bold text-[#243F5B]">Echo / Nova</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Detecta automáticamente el género: voz masculina (Echo) o femenina (Nova).
                  </p>
                  <button
                    onClick={() => handleTestVoice('echo', 'Abogado de la Parte Demandante')}
                    disabled={testingVoice === 'echo'}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#243F5B] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#C5A15B]" />
                    <span>{testingVoice === 'echo' ? 'Reproduciendo...' : 'Probar Voz Hombre'}</span>
                  </button>
                </div>

                {/* Defensa */}
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F3EF]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#14263D]">Abogado Defensor / Demandada</span>
                    <span className="text-[10px] font-bold text-[#243F5B]">Fable / Shimmer</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Detecta automáticamente el género: voz femenina (Shimmer) o masculina (Fable).
                  </p>
                  <button
                    onClick={() => handleTestVoice('shimmer', 'Abogada de la Defensa')}
                    disabled={testingVoice === 'shimmer'}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#243F5B] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#C5A15B]" />
                    <span>{testingVoice === 'shimmer' ? 'Reproduciendo...' : 'Probar Voz Mujer'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-[#14263D] block">
                Voz del Sistema Seleccionada:
              </label>
              <select
                value={selectedBrowserVoiceURI}
                onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#334155] focus:outline-none focus:border-[#243F5B]"
              >
                {browserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ajustes de Volumen, Cadencia / Velocidad y Modulación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#E2E8F0]">
            {/* Control de Volumen General de Sala */}
            <div className="space-y-2 p-3.5 rounded-xl bg-[#F5F3EF]/70 border border-[#E2E8F0]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#14263D] flex items-center space-x-1.5">
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#243F5B]" />
                  )}
                  <span>Volumen de Locución:</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#243F5B]">{Math.round(volume * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setVolume(volume > 0 ? 0 : 1)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-[#E2E8F0] text-[10px] font-semibold text-[#14263D] cursor-pointer"
                  >
                    {volume > 0 ? 'Silenciar' : 'Activar'}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[#243F5B] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <button type="button" onClick={() => setVolume(0)} className="hover:text-[#14263D] cursor-pointer">0% (Mudo)</button>
                <button type="button" onClick={() => setVolume(0.5)} className="hover:text-[#14263D] cursor-pointer">50% (Medio)</button>
                <button type="button" onClick={() => setVolume(1)} className="hover:text-[#14263D] cursor-pointer">100% (Máx.)</button>
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-[#F5F3EF]/40 border border-[#E2E8F0]">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#14263D]">Cadencia de Elocución:</span>
                <span className="font-semibold text-[#243F5B]">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="1.25"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#243F5B] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>Pausado (0.8x)</span>
                <span>Estándar (1.0x)</span>
                <span>Rápido (1.25x)</span>
              </div>
            </div>

            <div className="space-y-2 flex flex-col justify-center p-3.5 rounded-xl bg-[#F5F3EF]/40 border border-[#E2E8F0]">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoModulateRole}
                  onChange={(e) => setAutoModulateRole(e.target.checked)}
                  className="w-4 h-4 rounded text-[#243F5B] accent-[#243F5B] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-[#14263D] block">
                    Modulación Dinámica de Turno
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    Adapta voz masculina o femenina y cadencia según el interviniente del caso
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Sección 2: Operaciones y Control de Causa */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-[#E2E8F0] pb-4">
            <Shield className="w-5 h-5 text-[#243F5B]" />
            <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wide">
              2. Control de Expediente y Gestión de Causa
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F5F3EF]/60 border border-[#E2E8F0]">
            <div>
              <span className="text-xs font-bold text-[#14263D] block">Reiniciar Causa Activa</span>
              <p className="text-[11px] text-[#64748B]">
                Permite descartar las actuaciones actuales y cargar un nuevo expediente judicial.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar la simulación actual y volver al selector de expedientes?')) {
                  onResetSimulation();
                }
              }}
              className="px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Iniciar Nueva Causa</span>
            </button>
          </div>
        </div>

        {/* Botón inferior de confirmación */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onReturnToSimulation}
            className="px-6 py-3 rounded-xl text-xs font-semibold text-[#14263D] bg-white hover:bg-slate-50 border border-[#E2E8F0] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-[#243F5B] hover:bg-[#14263D] shadow-md transition-all flex items-center space-x-2"
          >
            <Scale className="w-4 h-4 text-[#C5A15B]" />
            <span>Guardar Parámetros y Volver a Sala</span>
          </button>
        </div>
      </div>
    </div>
  );
};

