import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Settings, Play, CheckCircle2, Sparkles } from './Icons';
import { simulationService } from '../services/simulationService';
import type { VoiceSettings } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [engine, setEngine] = useState<'openai' | 'browser'>(settings.engine || 'openai');
  const [maleVoice, setMaleVoice] = useState<string>(settings.maleVoice || 'onyx');
  const [femaleVoice, setFemaleVoice] = useState<string>(settings.femaleVoice || 'nova');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>(settings.browserVoiceURI || '');
  const [speed, setSpeed] = useState<number>(settings.speed ?? 1.0);
  const [pitch, setPitch] = useState<number>(settings.pitch ?? 1.0);
  const [autoModulateRole, setAutoModulateRole] = useState<boolean>(settings.autoModulateRole ?? true);
  const [testingVoice, setTestingVoice] = useState<'male' | 'female' | 'browser' | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cargar voces del navegador para modo fallback o alternativo
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

  // Limpiar cualquier audio al cerrar
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

  if (!isOpen) return null;

  const handleTestOpenAIVoice = async (gender: 'male' | 'female') => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setTestingVoice(gender);

    const voice = gender === 'female' ? femaleVoice : maleVoice;
    const testText = gender === 'female'
      ? 'Señorías y miembros de la sala: El Ministerio Fiscal solicita que se admita la prueba pericial conforme a las constancias de autos.'
      : 'El Tribunal declara abierta la sesión solemne de juicio oral. Las partes procederán con sus alegatos iniciales.';

    try {
      const audioUrl = await simulationService.getSpeechAudioBlobUrl(testText, {
        voice,
        gender,
        speed
      });
      const audio = new Audio(audioUrl);
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
    } catch (err) {
      console.error('Error probando voz OpenAI:', err);
      setTestingVoice(null);
    }
  };

  const handleTestBrowserVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setTestingVoice('browser');

    const utterance = new SpeechSynthesisUtterance('El Tribunal declara abierta la sesión. Las partes pueden formular sus alegaciones.');
    if (selectedBrowserVoiceURI) {
      const vObj = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
      if (vObj) utterance.voice = vObj;
    }
    utterance.pitch = pitch;
    utterance.rate = speed;

    utterance.onend = () => setTestingVoice(null);
    utterance.onerror = () => setTestingVoice(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onSaveSettings({
      engine,
      maleVoice,
      femaleVoice,
      browserVoiceURI: selectedBrowserVoiceURI || undefined,
      speed,
      pitch,
      autoModulateRole
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-100 flex items-center gap-2">
                <span>Configuración de Voz Forense</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Neural TTS
                </span>
              </h3>
              <p className="text-xs text-stone-400">Voces realistas adaptadas al género y rol de cada participante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-sm font-semibold p-1 hover:bg-stone-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selector de Motor: OpenAI vs Browser */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 block">Motor de Síntesis:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEngine('openai')}
              className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                engine === 'openai'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg mt-0.5 ${engine === 'openai' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-bold ${engine === 'openai' ? 'text-amber-300' : 'text-stone-300'}`}>
                  OpenAI Neural TTS
                </div>
                <div className="text-[11px] text-stone-400 leading-tight mt-0.5">
                  Máximo realismo con entonación humana natural y timbre orgánico.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEngine('browser')}
              className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                engine === 'browser'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg mt-0.5 ${engine === 'browser' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-bold ${engine === 'browser' ? 'text-amber-300' : 'text-stone-300'}`}>
                  Nativo del Navegador
                </div>
                <div className="text-[11px] text-stone-400 leading-tight mt-0.5">
                  Web Speech API estándar integrada, sin consumo de datos.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Sección de Voces OpenAI */}
        {engine === 'openai' && (
          <div className="space-y-4 bg-stone-950/50 p-4 rounded-xl border border-stone-800/80">
            {/* Aviso de Detección de Género */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300">Cambio dinámico según el personaje:</strong> El sistema detecta automáticamente el género del interviniente. Si habla una letrada o magistrada (ej. Doña Carmen Ortiz, Doña Elena Morales), usará la <strong>Voz Femenina</strong>; si habla el juez o letrado varón, usará la <strong>Voz Masculina</strong>.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voz Masculina */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-300 block flex items-center justify-between">
                  <span>Voz Masculina (Juez / Letrado):</span>
                  <span className="text-[10px] text-stone-500">Varón</span>
                </label>
                <select
                  value={maleVoice}
                  onChange={(e) => setMaleVoice(e.target.value)}
                  className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="onyx">Onyx (Autoritaria, grave y solemne - Recomendada)</option>
                  <option value="fable">Fable (Elocuente, persuasiva y articulada)</option>
                  <option value="echo">Echo (Calma, sobria y equilibrada)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleTestOpenAIVoice('male')}
                  disabled={testingVoice !== null}
                  className="w-full py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 text-amber-400 ${testingVoice === 'male' ? 'animate-pulse' : ''}`} />
                  <span>{testingVoice === 'male' ? 'Generando y reproduciendo...' : 'Probar Voz Masculina'}</span>
                </button>
              </div>

              {/* Voz Femenina */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-300 block flex items-center justify-between">
                  <span>Voz Femenina (Jueza / Letrada):</span>
                  <span className="text-[10px] text-stone-500">Mujer</span>
                </label>
                <select
                  value={femaleVoice}
                  onChange={(e) => setFemaleVoice(e.target.value)}
                  className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="nova">Nova (Firme, enérgica y formal - Recomendada)</option>
                  <option value="shimmer">Shimmer (Clara, cálida y elocuente)</option>
                  <option value="alloy">Alloy (Neutra y profesional)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleTestOpenAIVoice('female')}
                  disabled={testingVoice !== null}
                  className="w-full py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 text-amber-400 ${testingVoice === 'female' ? 'animate-pulse' : ''}`} />
                  <span>{testingVoice === 'female' ? 'Generando y reproduciendo...' : 'Probar Voz Femenina'}</span>
                </button>
              </div>
            </div>

            {/* Slider de Velocidad de Locución */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-300 font-medium">Cadencia Forense (Velocidad):</span>
                <span className="text-amber-400 font-mono font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.25"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500">
                <span>0.80x (Solemnidad procesal)</span>
                <span>1.0x (Normal)</span>
                <span>1.25x (Ágil)</span>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Voces Navegador */}
        {engine === 'browser' && (
          <div className="space-y-4 bg-stone-950/50 p-4 rounded-xl border border-stone-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 block">Voz Local del Sistema:</label>
              <select
                value={selectedBrowserVoiceURI}
                onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                {browserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300">Tono (Pitch):</span>
                  <span className="text-amber-400 font-mono font-bold">{pitch.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300">Velocidad:</span>
                  <span className="text-amber-400 font-mono font-bold">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestBrowserVoice}
              disabled={testingVoice !== null}
              className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 text-amber-400 ${testingVoice === 'browser' ? 'animate-pulse' : ''}`} />
              <span>{testingVoice === 'browser' ? 'Reproduciendo...' : 'Probar Voz del Navegador'}</span>
            </button>
          </div>
        )}

        {/* Modalidad de Adaptación por Rol */}
        <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-200 flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Modulación Dramática Forense</span>
            </span>
            <button
              onClick={() => setAutoModulateRole(!autoModulateRole)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                autoModulateRole ? 'bg-amber-600' : 'bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                  autoModulateRole ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Ajusta los matices expresivos según el rol: el Juez adquiere solemnidad grave, el Fiscal firmeza enérgica y el Abogado tono suasorio.
          </p>
        </div>

        {/* Botones de Guardado y Cierre */}
        <div className="flex items-center space-x-3 pt-3 border-t border-stone-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplicar a la Audiencia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
