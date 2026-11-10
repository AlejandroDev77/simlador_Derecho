import React from 'react';
import { CheckCircle2, ChevronRight, FileText, BookOpen, User, Gavel, Scale } from './Icons';
import type { Step } from '../types';

interface ProcessStepperFooterProps {
  currentStep: Step;
}

const STEPS = [
  { key: 'upload', label: '1. Expediente Judicial', icon: FileText },
  { key: 'analysis', label: '2. Análisis Documental', icon: BookOpen },
  { key: 'role_select', label: '3. Asignación de Rol', icon: User },
  { key: 'courtroom', label: '4. Audiencia en Sala', icon: Gavel },
  { key: 'evaluation', label: '5. Sentencia y Fallo', icon: Scale },
];

export const ProcessStepperFooter: React.FC<ProcessStepperFooterProps> = ({ currentStep }) => {
  if (currentStep === 'settings') {
    return (
      <footer className="h-12 bg-[#14263D] border-t border-[#243F5B] px-6 flex items-center justify-between text-xs text-slate-300 shrink-0 select-none">
        <span className="font-semibold text-[#C5A15B]">Panel de Configuración de Audiencia</span>
        <span className="text-slate-400">Ajustes de audio, síntesis vocal y parámetros de sala</span>
      </footer>
    );
  }

  const stepOrder = ['upload', 'analysis', 'role_select', 'courtroom', 'evaluation'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <footer className="h-14 bg-[#14263D] border-t border-[#243F5B] px-4 sm:px-8 flex items-center justify-between shrink-0 select-none shadow-lg z-30">
      {/* Indicador de fases procesales */}
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto w-full justify-between sm:justify-start">
        {STEPS.map((s, idx) => {
          const isActive = s.key === currentStep;
          const isPast = currentIdx > idx;
          const IconComp = s.icon;

          return (
            <React.Fragment key={s.key}>
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-[#243F5B] text-white border border-[#C5A15B]/70 shadow-sm font-semibold'
                    : isPast
                    ? 'text-slate-300 bg-[#1C3554]/50'
                    : 'text-slate-500'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B] shrink-0" />
                ) : (
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#C5A15B]' : 'text-slate-500'}`} />
                )}
                <span className="whitespace-nowrap hidden md:inline text-[11px]">{s.label}</span>
                <span className="md:hidden text-[11px] font-bold">{idx + 1}</span>
              </div>

              {idx < STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden sm:inline" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-300 shrink-0 pl-4 border-l border-[#243F5B]">
        <span className="text-[#C5A15B] font-semibold">Fase Activa:</span>
        <span className="font-medium text-white capitalize">
          {currentStep === 'courtroom' ? 'Vista Oral en Sala' : currentStep.replace('_', ' ')}
        </span>
      </div>
    </footer>
  );
};

