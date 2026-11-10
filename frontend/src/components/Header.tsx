import React from 'react';
import { Scale, Volume2, VolumeX, RotateCcw } from './Icons';
import type { Step } from '../types';

interface HeaderProps {
  currentStep: Step;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onReset: () => void;
}

const STEPS: { key: Step; label: string; num: string }[] = [
  { key: 'upload', label: 'Expediente', num: '1' },
  { key: 'analysis', label: 'Análisis Forense', num: '2' },
  { key: 'role_select', label: 'Asignación de Rol', num: '3' },
  { key: 'courtroom', label: 'Audiencia Sala 3D', num: '4' },
  { key: 'evaluation', label: 'Fallo y Evaluación', num: '5' }
];

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  ttsEnabled,
  onToggleTts,
  onReset
}) => {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <header className="h-16 border-b border-stone-800/90 bg-stone-950/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-lg">
      {/* Logotipo e Identidad Forense */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 text-amber-400 border border-amber-500/40 shadow-inner">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold text-stone-100 tracking-tight">
              Tribunal Superior
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold uppercase tracking-wider">
              Simulador 3D
            </span>
          </div>
          <p className="text-[11px] text-stone-400 hidden sm:block">
            Sala de Audiencias Orales • Práctica Procesal y Evaluación Forense
          </p>
        </div>
      </div>

      {/* Indicador de Fases Procesales */}
      <div className="hidden xl:flex items-center space-x-1.5 bg-stone-900/60 p-1.5 rounded-2xl border border-stone-800/80">
        {STEPS.map((s, idx) => {
          const isActive = s.key === currentStep;
          const isPast = idx < currentIdx;

          return (
            <div key={s.key} className="flex items-center space-x-1">
              <div
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-bold'
                    : isPast
                    ? 'text-stone-300 bg-stone-800/50'
                    : 'text-stone-500'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? 'bg-stone-950 text-amber-400 font-bold'
                      : isPast
                      ? 'bg-stone-700 text-stone-300'
                      : 'bg-stone-800 text-stone-600'
                  }`}
                >
                  {s.num}
                </span>
                <span>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <span className="text-stone-700 text-[10px]">›</span>}
            </div>
          );
        })}
      </div>

      {/* Acciones Globales */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleTts}
          className={`p-2 rounded-xl border transition-all ${
            ttsEnabled
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/20'
              : 'bg-stone-800/80 border-stone-700 text-stone-500 hover:text-stone-300'
          }`}
          title={ttsEnabled ? 'Locución oral activada' : 'Locución oral silenciada'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {currentStep !== 'upload' && (
          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 hover:text-white transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Nuevo Juicio</span>
          </button>
        )}
      </div>
    </header>
  );
};
