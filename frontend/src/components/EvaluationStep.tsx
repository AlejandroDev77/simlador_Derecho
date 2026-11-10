import React from 'react';
import { Award, Printer, RotateCcw, Scale, Shield, CheckCircle2 } from './Icons';
import type { AcademicEvaluation } from '../types';

interface EvaluationStepProps {
  evaluation: AcademicEvaluation;
  onReset: () => void;
}

export const EvaluationStep: React.FC<EvaluationStepProps> = ({
  evaluation,
  onReset
}) => {
  return (
    <div className="max-w-4xl mx-auto my-auto w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl overflow-y-auto max-h-[88vh]">
      {/* Encabezado Formal de Sentencia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#243F5B] border border-[#C5A15B]/50 flex items-center justify-center text-[#C5A15B] shadow-inner shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#14263D] tracking-tight">
              Sentencia Judicial y Dictamen Pedagógico
            </h2>
            <p className="text-xs text-[#334155]">
              Tribunal de Evaluación Procesal Forense • Resolución de Causa Oral
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Fallo dictado:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[#243F5B] text-white border border-[#C5A15B]/50 shadow-xs">
            {evaluation.verdict}
          </span>
        </div>
      </div>

      {/* Aviso Académico Institucional */}
      <div className="p-4 bg-[#F5F3EF] border-l-4 border-[#C5A15B] rounded-r-xl text-xs text-[#334155] flex items-start space-x-3">
        <Award className="w-5 h-5 shrink-0 text-[#C5A15B] mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-[#14263D] font-bold uppercase tracking-wider text-[11px]">
            Dictamen Formativo Universitario
          </strong>
          <p className="leading-relaxed text-[11.5px]">{evaluation.academic_disclaimer}</p>
        </div>
      </div>

      {/* Fundamento del Fallo */}
      <div className="bg-[#F5F3EF] p-4 sm:p-5 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center space-x-2 text-[#14263D]">
          <Shield className="w-4 h-4 text-[#C5A15B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Fundamentación Jurídica de la Sala</h3>
        </div>
        <p className="text-xs text-[#334155] leading-relaxed font-normal">
          {evaluation.ruling_summary}
        </p>
      </div>

      {/* Rúbrica de Puntuación Forense */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Coherencia Argumentativa
          </span>
          <span className="text-3xl font-bold text-[#14263D] tracking-tight block">
            {evaluation.score_coherence}
            <span className="text-sm font-normal text-slate-400"> / 100</span>
          </span>
          <span className="text-[10px] text-slate-400 block">Estructura y lógica procesal</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Fidelidad al Expediente
          </span>
          <span className="text-3xl font-bold text-[#C5A15B] tracking-tight block">
            {evaluation.score_fidelity_to_facts}
            <span className="text-sm font-normal text-slate-400"> / 100</span>
          </span>
          <span className="text-[10px] text-slate-400 block">Apego a hechos probados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Manejo de Pruebas
          </span>
          <span className="text-3xl font-bold text-[#243F5B] tracking-tight block">
            {evaluation.score_evidence_usage}
            <span className="text-sm font-normal text-slate-400"> / 100</span>
          </span>
          <span className="text-[10px] text-slate-400 block">Incorporación de medios probatorios</span>
        </div>
      </div>

      {/* Retroalimentación docente constructiva */}
      <div className="bg-[#F5F3EF] p-4 sm:p-5 rounded-xl border border-slate-200 space-y-2">
        <h3 className="text-xs font-bold text-[#14263D] uppercase tracking-wider">
          Observaciones y Recomendación Docente
        </h3>
        <p className="text-xs text-[#334155] leading-relaxed font-normal">
          {evaluation.final_feedback}
        </p>
      </div>

      {/* Fortalezas y Áreas de Mejora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
          <span className="font-bold text-emerald-900 flex items-center space-x-1.5 uppercase tracking-wide text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Fortalezas Identificadas</span>
          </span>
          <ul className="list-disc list-inside text-emerald-950 space-y-1 text-[11px] leading-relaxed">
            {evaluation.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
          <span className="font-bold text-amber-900 flex items-center space-x-1.5 uppercase tracking-wide text-[11px]">
            <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Áreas de Perfeccionamiento</span>
          </span>
          <ul className="list-disc list-inside text-amber-950 space-y-1 text-[11px] leading-relaxed">
            {evaluation.areas_for_improvement.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Acciones Finales */}
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-3 border-t border-slate-200">
        <button
          onClick={() => window.print()}
          className="w-full sm:flex-1 py-3 bg-white hover:bg-[#F5F3EF] text-[#14263D] font-semibold rounded-xl border border-slate-300 flex items-center justify-center space-x-2 text-xs transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#C5A15B]" />
          <span>Imprimir / Descargar Sentencia</span>
        </button>
        <button
          onClick={onReset}
          className="w-full sm:flex-1 py-3 bg-[#243F5B] hover:bg-[#1C3554] text-white font-bold rounded-xl flex items-center justify-center space-x-2 text-xs transition-colors shadow-md cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Simular Nueva Causa Judicial</span>
        </button>
      </div>
    </div>
  );
};
