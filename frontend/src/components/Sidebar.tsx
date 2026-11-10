import React from 'react';
import { Scale, Settings, Gavel, Volume2, VolumeX, Shield, RotateCcw } from './Icons';
import type { Step } from '../types';

interface SidebarProps {
  currentStep: Step;
  onNavigateSimulation: () => void;
  onNavigateSettings: () => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onReset: () => void;
  isSimulating: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStep,
  onNavigateSimulation,
  onNavigateSettings,
  ttsEnabled,
  onToggleTts,
  onReset,
  isSimulating
}) => {
  const isSettingsActive = currentStep === 'settings';
  const isSimulationActive = !isSettingsActive;

  return (
    <aside className="w-64 bg-[#14263D] text-slate-100 border-r border-[#243F5B]/70 flex flex-col shrink-0 select-none shadow-2xl z-40 transition-all">
      {/* Encabezado Institucional con Emblema */}
      <div className="p-5 border-b border-[#243F5B]/80 flex items-center space-x-3 bg-[#0F1E31]/60">
        <div className="w-10 h-10 rounded-xl bg-[#243F5B] border border-[#C5A15B]/50 flex items-center justify-center text-[#C5A15B] shadow-inner shrink-0">
          <Scale className="w-5 h-5 text-[#C5A15B]" />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#C5A15B] block">
            Poder Judicial
          </span>
          <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
            Tribunal Superior
          </h1>
          <span className="text-[11px] text-slate-400 block truncate">
            Simulador de Sala Oral
          </span>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Módulos Procesales
        </div>

        {/* Botón Simulación de Juicio */}
        <button
          onClick={onNavigateSimulation}
          className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all border ${
            isSimulationActive
              ? 'bg-[#243F5B] text-white border-[#C5A15B]/60 shadow-md border-l-4 border-l-[#C5A15B]'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-[#1C3554]/70'
          }`}
        >
          <Gavel className={`w-4 h-4 ${isSimulationActive ? 'text-[#C5A15B]' : 'text-slate-400'}`} />
          <div className="text-left flex-1 truncate">
            <span className="block font-semibold">Simulación de Audiencia</span>
            <span className="text-[10px] text-slate-400 block">
              {isSimulating ? 'Vista oral en curso' : 'Expediente y sala'}
            </span>
          </div>
          {isSimulating && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          )}
        </button>

        {/* Reiniciar simulación (si está en curso) */}
        {currentStep !== 'upload' && !isSettingsActive && (
          <button
            onClick={onReset}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#1C3554]/60 border border-transparent transition-all"
            title="Reiniciar expediente y comenzar una nueva causa"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="truncate">Nueva Causa Judicial</span>
          </button>
        )}
      </nav>

      {/* Panel Inferior: Configuración y Parámetros */}
      <div className="p-3 border-t border-[#243F5B]/80 bg-[#0F1E31]/40 space-y-2">
        {/* Acceso a Configuración de Sala (Pantalla Completa) */}
        <button
          onClick={onNavigateSettings}
          className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all border ${
            isSettingsActive
              ? 'bg-[#243F5B] text-white border-[#C5A15B]/60 shadow-md border-l-4 border-l-[#C5A15B]'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-[#1C3554]/70'
          }`}
        >
          <Settings className={`w-4 h-4 ${isSettingsActive ? 'text-[#C5A15B]' : 'text-[#C5A15B]'}`} />
          <div className="text-left flex-1 truncate">
            <span className="block font-semibold">Configuración de Sala</span>
            <span className="text-[10px] text-slate-400 block">Voces y parámetros</span>
          </div>
        </button>

        {/* Interruptor rápido de locución oral */}
        <div className="pt-1 flex items-center justify-between px-3 py-2 rounded-xl bg-[#14263D] border border-[#243F5B] text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            {ttsEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#C5A15B]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-[11px] font-medium">Locución Oral</span>
          </div>
          <button
            onClick={onToggleTts}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
              ttsEnabled
                ? 'bg-[#243F5B] text-[#C5A15B] border border-[#C5A15B]/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {ttsEnabled ? 'Activa' : 'Mute'}
          </button>
        </div>

        {/* Insignia de seguridad y validez formal */}
        <div className="px-3 py-1.5 flex items-center space-x-2 text-[10px] text-slate-400">
          <Shield className="w-3 h-3 text-[#C5A15B] shrink-0" />
          <span className="truncate">Entorno Judicial Reservado</span>
        </div>
      </div>
    </aside>
  );
};

