import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Shield, Users, Gavel, User, ArrowRight, CheckCircle2, Scale } from './Icons';
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
  // Simulación de progreso visual secuencial mientras la IA analiza los autos
  const [progressStage, setProgressStage] = useState(1);

  useEffect(() => {
    if (!analysis) {
      const timer1 = setTimeout(() => setProgressStage(2), 2000);
      const timer2 = setTimeout(() => setProgressStage(3), 4500);
      const timer3 = setTimeout(() => setProgressStage(4), 7500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [analysis]);

  const isProcessing = loading || !analysis;

  return (
    <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col space-y-6 font-sans">
      {/* Cabecera de la Fase 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A15B] block">
            Fase 2 • Admisión y Trámite
          </span>
          <h2 className="text-xl font-bold text-[#14263D]">Cotejo y Calificación de la Causa</h2>
          <p className="text-xs text-[#64748B]">
            Pieza documental: <span className="text-[#243F5B] font-semibold">{caseFile?.filename || 'Expediente Judicial'}</span> ({caseFile?.page_count || 1} folios)
          </p>
        </div>
        {!isProcessing && analysis ? (
          <button
            onClick={onContinue}
            className="flex items-center space-x-2 bg-[#243F5B] hover:bg-[#14263D] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <span>Continuar a Asignación de Rol</span>
            <ArrowRight className="w-4 h-4 text-[#C5A15B]" />
          </button>
        ) : (
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#F5F3EF] border border-[#C5A15B]/40 text-xs text-[#14263D] self-start sm:self-auto shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5A15B] animate-ping shrink-0" />
            <span className="font-semibold text-[11px]">Trámite en Secretaría de Sala</span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ESTADO DE CARGA Y EJECUCIÓN ACTIVA DEL EXPEDIENTE */}
      {/* ======================================================== */}
      {isProcessing ? (
        <div className="space-y-6">
          {/* Tarjeta Principal de Progreso Judicial */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#14263D] border border-[#C5A15B]/50 flex items-center justify-center text-[#C5A15B] shadow-sm shrink-0">
                  <Scale className="w-6 h-6 animate-pulse text-[#C5A15B]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#14263D]">
                    Examen Procesal y Calificación de Autos en Curso
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    La Secretaría del Tribunal está digitalizando los hechos controvertidos y admitiendo los medios probatorios.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <div className="w-4 h-4 border-2 border-[#243F5B]/30 border-t-[#243F5B] rounded-full animate-spin" />
                <span className="text-xs font-semibold text-[#243F5B]">Extrayendo autos...</span>
              </div>
            </div>

            {/* Barra de Progreso Continua */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#14263D]">Estado del trámite documental:</span>
                <span className="text-[#C5A15B] font-bold">
                  {progressStage === 1 && 'Fase 1/4: Recepción e Ingesta'}
                  {progressStage === 2 && 'Fase 2/4: Fijación de Controversia'}
                  {progressStage === 3 && 'Fase 3/4: Cotejo de Hechos H#'}
                  {progressStage >= 4 && 'Fase 4/4: Admisión de Pruebas y Partes'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F5F3EF] border border-[#E2E8F0] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[#243F5B] via-[#C5A15B] to-[#243F5B] rounded-full transition-all duration-700 animate-pulse"
                  style={{
                    width: progressStage === 1 ? '25%' : progressStage === 2 ? '50%' : progressStage === 3 ? '75%' : '92%'
                  }}
                />
              </div>
            </div>

            {/* Fases Procesales del Trámite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {/* Paso 1 */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                progressStage >= 1
                  ? 'bg-[#F5F3EF] border-[#243F5B]/40 shadow-xs'
                  : 'bg-white border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#14263D] text-[11px]">1. Ingesta de Autos</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B]" />
                </div>
                <p className="text-[10.5px] text-[#64748B] leading-relaxed">
                  Lectura de folios y verificación de validez formal.
                </p>
              </div>

              {/* Paso 2 */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                progressStage >= 2
                  ? 'bg-[#F5F3EF] border-[#243F5B]/40 shadow-xs'
                  : 'bg-white border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#14263D] text-[11px]">2. Puntos en Disputa</span>
                  {progressStage >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </div>
                <p className="text-[10.5px] text-[#64748B] leading-relaxed">
                  Fijación de la controversia y petitorio de partes.
                </p>
              </div>

              {/* Paso 3 */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                progressStage >= 3
                  ? 'bg-[#F5F3EF] border-[#243F5B]/40 shadow-xs'
                  : 'bg-white border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#14263D] text-[11px]">3. Cuadro de Hechos</span>
                  {progressStage >= 3 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A15B]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </div>
                <p className="text-[10.5px] text-[#64748B] leading-relaxed">
                  Extracción cronológica de hechos acreditados en autos.
                </p>
              </div>

              {/* Paso 4 */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                progressStage >= 4
                  ? 'bg-[#F5F3EF] border-[#243F5B]/40 shadow-xs'
                  : 'bg-white border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#14263D] text-[11px]">4. Cuaderno de Prueba</span>
                  {progressStage >= 4 ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C5A15B] animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </div>
                <p className="text-[10.5px] text-[#64748B] leading-relaxed">
                  Admisión de pruebas documentales y testificales.
                </p>
              </div>
            </div>
          </div>

          {/* Esqueleto Visual de las 3 Columnas Procesales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/70 border border-dashed border-[#C5A15B]/50 rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-[#C5A15B]" />
                <span className="text-xs font-bold text-[#14263D]">Carátula de Autos</span>
              </div>
              <div className="h-4 bg-[#F5F3EF] rounded w-3/4" />
              <div className="h-3 bg-[#F5F3EF] rounded w-1/2" />
              <div className="h-20 bg-[#F5F3EF] rounded w-full" />
            </div>

            <div className="bg-white/70 border border-dashed border-[#C5A15B]/50 rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-[#C5A15B]" />
                <span className="text-xs font-bold text-[#14263D]">Hechos Acreditados</span>
              </div>
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
            </div>

            <div className="bg-white/70 border border-dashed border-[#C5A15B]/50 rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Shield className="w-4 h-4 text-[#C5A15B]" />
                <span className="text-xs font-bold text-[#14263D]">Pruebas y Personación</span>
              </div>
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
              <div className="h-10 bg-[#F5F3EF] rounded w-full" />
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* EXPEDIENTE ANALIZADO: VISTA DEFINITIVA DE LAS 3 COLUMNAS */
        /* ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Columna 1: Carátula y Resumen */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#14263D] uppercase tracking-wide flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
              <BookOpen className="w-4 h-4 text-[#C5A15B]" />
              <span>Autos de la Causa</span>
            </h3>
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Identificación / Carátula</label>
              <p className="text-xs font-bold text-[#14263D] mt-0.5">{analysis.case_title || 'Causa Judicial'}</p>
            </div>
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Procedimiento Aplicable</label>
              <span className="inline-block mt-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#14263D]/5 border border-[#243F5B]/20 text-[#243F5B]">
                {analysis.process_type || 'Procedimiento Ordinario'}
              </span>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Resumen de la Controversia</label>
              <p className="text-xs text-[#334155] leading-relaxed mt-1.5 bg-[#F5F3EF] p-3 rounded-xl border border-[#E2E8F0]">
                {analysis.summary || 'Sin resumen disponible.'}
              </p>
            </div>
          </div>

          {/* Columna 2: Hechos Probados y Pruebas */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#14263D] uppercase tracking-wide flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
              <FileText className="w-4 h-4 text-[#C5A15B]" />
              <span>Hechos Acreditados ({(analysis.facts || []).length})</span>
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {(analysis.facts || []).map((fact, idx) => (
                <div key={fact.id || idx} className="p-3 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                    <span className="font-bold text-[#14263D]">Hecho #{idx + 1}</span>
                    {fact.source_references?.[0]?.page_number && (
                      <span className="bg-white px-2 py-0.5 rounded border border-[#E2E8F0] font-semibold text-[#243F5B]">
                        Folio {fact.source_references[0].page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-[#334155] text-[11px] leading-relaxed">{fact.description}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-[#14263D] uppercase tracking-wide flex items-center space-x-2 pt-3 border-t border-[#E2E8F0]">
              <Shield className="w-4 h-4 text-[#C5A15B]" />
              <span>Pruebas Admitidas ({(analysis.evidences || []).length})</span>
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {(analysis.evidences || []).map((ev, idx) => (
                <div key={ev.id || idx} className="p-3 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                    <span className="font-bold text-[#14263D]">{ev.name}</span>
                    <span className="bg-[#243F5B]/10 text-[#243F5B] px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {ev.evidence_type}
                    </span>
                  </div>
                  <p className="text-[#334155] text-[11px] leading-relaxed">{ev.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna 3: Partes Personadas y Letrados */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#14263D] uppercase tracking-wide flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
              <Users className="w-4 h-4 text-[#C5A15B]" />
              <span>Partes Personadas en Autos ({(analysis.identified_participants || []).length})</span>
            </h3>
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 text-xs">
              {(analysis.identified_participants || []).map((p, idx) => (
                <div key={p.id || idx} className="p-3 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#C5A15B] uppercase flex items-center space-x-1">
                      <User className="w-3 h-3 text-[#C5A15B]" />
                      <span>{p.role ? p.role.replace(/_/g, ' ') : 'Interviniente'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white text-[#243F5B] border border-[#E2E8F0] font-semibold text-[9.5px] uppercase">
                      {p.gender === 'female' ? 'Femenino' : 'Masculino'}
                    </span>
                  </div>
                  <p className="font-bold text-[#14263D] text-[11.5px]">{p.name}</p>
                  {p.description && (
                    <p className="text-[#64748B] text-[11px] leading-relaxed">{p.description}</p>
                  )}
                </div>
              ))}
              {(!analysis.identified_participants || analysis.identified_participants.length === 0) && (
                <p className="text-xs text-[#64748B] italic p-3 text-center">
                  Partes procesales en autos admitidas según rol.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
