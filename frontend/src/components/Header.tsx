import React from 'react';
import { Scale, Shield } from './Icons';
import type { Step } from '../types';

interface HeaderProps {
  currentStep: Step;
  caseTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentStep, caseTitle }) => {
  return (
    <header className="h-14 bg-[#14263D] border-b border-[#243F5B] px-6 flex items-center justify-between shrink-0 select-none shadow-md z-20">
      {/* Título Institucional y Sala */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#243F5B] border border-[#C5A15B]/50 flex items-center justify-center text-[#C5A15B]">
          <Scale className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
            Sala de Vistas y Juicios Orales
          </h2>
          <p className="text-[10px] text-slate-300 hidden sm:block">
            Tribunal Superior de Justicia • Sede Judicial Central
          </p>
        </div>
      </div>

      {/* Centro limpio por requerimiento */}
      <div className="flex-1 flex justify-center px-4">
        {caseTitle && currentStep !== 'upload' && currentStep !== 'settings' && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0F1E31]/70 border border-[#243F5B] text-xs text-slate-200 max-w-lg truncate">
            <span className="w-2 h-2 rounded-full bg-[#C5A15B] shrink-0" />
            <span className="font-semibold text-[#C5A15B] shrink-0">Causa:</span>
            <span className="truncate text-slate-300 font-medium">{caseTitle}</span>
          </div>
        )}
      </div>

      {/* Lado derecho institucional */}
      <div className="flex items-center space-x-2.5 text-xs text-slate-300">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#243F5B]/70 border border-[#C5A15B]/30 text-[11px]">
          <Shield className="w-3.5 h-3.5 text-[#C5A15B]" />
          <span className="font-medium text-white">Audiencia Oficial</span>
        </div>
      </div>
    </header>
  );
};
