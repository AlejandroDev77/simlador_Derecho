import React from 'react';
import { Award, Printer, RotateCcw } from './Icons';
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
    <div className="max-w-3xl mx-auto my-auto w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[85vh]">
      {/* Aviso Académico Obligatorio */}
      <div className="p-3.5 bg-amber-950/40 border border-amber-700/60 rounded-xl text-xs text-amber-300 flex items-start space-x-2.5">
        <Award className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong className="block mb-0.5">AVISO ACADÉMICO</strong>
          <span>{evaluation.academic_disclaimer}</span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-stone-100">Sentencia y Evaluación Pedagógica</h2>
        <p className="text-xs text-stone-400">
          Veredicto simulado: <span className="font-bold text-amber-400">{evaluation.verdict}</span>
        </p>
      </div>

      {/* Fundamento del Fallo */}
      <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-2">
        <h3 className="text-xs font-bold text-stone-300 uppercase">Fundamentación Jurídica</h3>
        <p className="text-xs text-stone-300 leading-relaxed">{evaluation.ruling_summary}</p>
      </div>

      {/* Rúbrica de Puntuación */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 text-center">
          <span className="text-[11px] text-stone-400 block mb-1">Coherencia Argumentativa</span>
          <span className="text-2xl font-bold text-amber-400">{evaluation.score_coherence} / 100</span>
        </div>
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 text-center">
          <span className="text-[11px] text-stone-400 block mb-1">Fidelidad al Expediente</span>
          <span className="text-2xl font-bold text-emerald-400">{evaluation.score_fidelity_to_facts} / 100</span>
        </div>
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 text-center">
          <span className="text-[11px] text-stone-400 block mb-1">Manejo de Pruebas</span>
          <span className="text-2xl font-bold text-sky-400">{evaluation.score_evidence_usage} / 100</span>
        </div>
      </div>

      {/* Retroalimentación constructiva */}
      <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-2">
        <h3 className="text-xs font-bold text-stone-300 uppercase">Comentario Docente</h3>
        <p className="text-xs text-stone-300 leading-relaxed">{evaluation.final_feedback}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-1.5">
          <span className="font-bold text-emerald-400 block">Fortalezas Identificadas</span>
          <ul className="list-disc list-inside text-stone-300 space-y-1 text-[11px]">
            {evaluation.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1.5">
          <span className="font-bold text-amber-400 block">Áreas de Mejora Técnica</span>
          <ul className="list-disc list-inside text-stone-300 space-y-1 text-[11px]">
            {evaluation.areas_for_improvement.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl border border-stone-700 flex items-center justify-center space-x-2 text-xs transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Imprimir / Guardar Sentencia</span>
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl flex items-center justify-center space-x-2 text-xs transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Simular Otro Expediente</span>
        </button>
      </div>
    </div>
  );
};

