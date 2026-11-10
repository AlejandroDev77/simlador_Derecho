import React from 'react';
import { BookOpen, FileText, Shield, Users, Gavel, User, ArrowRight } from './Icons';
import type { CaseAnalysis } from '../types';
import type { UploadCaseResponse } from '../services/caseService';

interface AnalysisStepProps {
  caseFile: UploadCaseResponse | null;
  analysis: CaseAnalysis | null;
  loading: boolean;
  onContinue: () => void;
}

export const AnalysisStep: React.FC<AnalysisStepProps> = ({
  caseFile,
  analysis,
  loading,
  onContinue
}) => {
  return (
    <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-100">Análisis Jurídico del Documento</h2>
          <p className="text-xs text-stone-400">
            Archivo procesado: <span className="text-amber-400 font-medium">{caseFile?.filename}</span> ({caseFile?.page_count} páginas)
          </p>
        </div>
        {analysis && (
          <button
            onClick={onContinue}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-stone-950 px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-lg shadow-amber-600/20"
          >
            <span>Continuar a Selección de Rol</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && !analysis && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-stone-300 font-medium">Analizando hechos, pruebas y participantes con OpenAI...</p>
          <p className="text-xs text-stone-500">Extrayendo referencias de páginas y estructura procesal.</p>
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Columna 1: Carátula y Resumen */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Datos de la Causa</span>
            </h3>
            <div>
              <label className="text-[11px] text-stone-400 uppercase font-semibold">Carátula</label>
              <p className="text-sm font-medium text-stone-200">{analysis.case_title}</p>
            </div>
            <div>
              <label className="text-[11px] text-stone-400 uppercase font-semibold">Materia / Proceso</label>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-800/80 text-amber-300">
                {analysis.process_type}
              </span>
            </div>
            <div>
              <label className="text-[11px] text-stone-400 uppercase font-semibold">Resumen de la Controversia</label>
              <p className="text-xs text-stone-300 leading-relaxed mt-1 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* Columna 2: Hechos y Pruebas */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Hechos Probados ({analysis.facts.length})</span>
            </h3>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 text-xs">
              {analysis.facts.map((fact, idx) => (
                <div key={fact.id || idx} className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800/80">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                    <span className="font-bold text-stone-300">Hecho #{idx + 1}</span>
                    {fact.source_references[0]?.page_number && (
                      <span className="bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">
                        Pág. {fact.source_references[0].page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-300">{fact.description}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2 pt-2 border-t border-stone-800">
              <Shield className="w-4 h-4" />
              <span>Pruebas Admitidas ({analysis.evidences.length})</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
              {analysis.evidences.map((ev, idx) => (
                <div key={ev.id || idx} className="p-2 bg-stone-950/60 rounded-lg border border-stone-800 text-stone-300">
                  <span className="font-semibold text-amber-300 block">{ev.name}</span>
                  <span className="text-[11px] text-stone-400">{ev.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Columna 3: Participantes y Roles */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Participantes Identificados</span>
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {analysis.identified_participants.map((p) => (
                <div key={p.id} className="p-3 bg-stone-950/60 rounded-lg border border-stone-800 text-xs flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 text-amber-400">
                    {p.role === 'juez' ? <Gavel className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="font-bold text-stone-200">{p.name}</p>
                      {p.gender && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          p.gender === 'female' ? 'bg-pink-950/70 text-pink-300 border border-pink-800/60' : 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                        }`}>
                          {p.gender === 'female' ? 'Mujer' : 'Varón'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">{p.role.replace(/_/g, ' ')}</span>
                    <p className="text-[11px] text-stone-400 mt-0.5">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

