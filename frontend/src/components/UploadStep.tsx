import React from 'react';
import { Gavel, Upload, Scale, BookOpen, Shield, FileText } from './Icons';

interface UploadStepProps {
  loading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadExample: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  loading,
  onFileUpload,
  onLoadExample
}) => {
  return (
    <div className="max-w-3xl mx-auto my-auto w-full px-4 font-sans">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Insignia central institucional */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-[#14263D] border-2 border-[#C5A15B]/60 flex items-center justify-center text-[#C5A15B] shadow-lg">
          <Gavel className="w-10 h-10 text-[#C5A15B]" />
        </div>

        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14263D]/5 border border-[#243F5B]/20 text-[#14263D] text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5 text-[#C5A15B]" />
            <span>Sistema Institucional de Práctica Procesal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#14263D] tracking-tight">
            Ingreso de Expediente Judicial
          </h2>
          <p className="text-xs sm:text-sm text-[#334155] mt-2 max-w-lg mx-auto leading-relaxed">
            Adjunte las piezas procesales en formato PDF, Word o TXT. El sistema procesará los hechos probados,
            admitirá las pruebas de autos y constituirá la Sala de Vistas Orales correspondiente.
          </p>
        </div>

        {/* Zona de Carga de Documentación */}
        <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 ${
          loading
            ? 'border-[#243F5B] bg-[#F5F3EF] cursor-wait opacity-90'
            : 'border-[#C5A15B]/40 hover:border-[#243F5B] cursor-pointer bg-[#F5F3EF]/60 hover:bg-[#F5F3EF] group'
        }`}>
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#243F5B] group-hover:text-[#14263D] group-hover:border-[#C5A15B] mb-3 transition-colors shadow-sm">
            {loading ? (
              <div className="w-8 h-8 border-3 border-[#243F5B]/30 border-t-[#243F5B] rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-[#243F5B]" />
            )}
          </div>
          <span className="text-sm font-bold text-[#14263D]">
            {loading ? 'Ingresando autos en Registro General del Tribunal...' : 'Seleccione o arrastre el expediente aquí'}
          </span>
          <span className="text-xs text-[#64748B] mt-1">
            {loading ? 'Verificando formato y transfiriendo a Secretaría de Sala' : 'Formatos admitidos: PDF, DOCX o TXT (hasta 25 MB)'}
          </span>
          {loading && (
            <div className="w-48 h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className="w-full h-full bg-[#243F5B] rounded-full animate-pulse" />
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={onFileUpload}
            disabled={loading}
          />
        </label>

        {/* Carga Rápida de Expediente Penal de Ejemplo */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <span className="text-xs text-[#64748B]">¿Desea iniciar con un caso documentado?</span>
          <button
            type="button"
            onClick={onLoadExample}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F3EF] border border-[#C5A15B]/60 text-xs font-bold text-[#14263D] hover:text-[#243F5B] transition-all flex items-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-[#14263D]/30 border-t-[#14263D] rounded-full animate-spin" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-[#C5A15B]" />
            )}
            <span>{loading ? 'Cargando autos...' : 'Cargar Causa Penal Testigo (142/2024 - Estafa y Falsedad)'}</span>
          </button>
        </div>

        {/* Garantías Institucionales de Sala */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-3">
          <div className="p-4 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-[#14263D] font-bold">
              <Scale className="w-3.5 h-3.5 text-[#C5A15B]" />
              <span>Sujeción a Autos</span>
            </div>
            <p className="text-[#64748B] text-[11px] leading-relaxed">
              Fidelidad probatoria estricta. Todo debate se fundamenta en las constancias del expediente.
            </p>
          </div>

          <div className="p-4 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-[#14263D] font-bold">
              <Gavel className="w-3.5 h-3.5 text-[#C5A15B]" />
              <span>Sala de Vistas Oral</span>
            </div>
            <p className="text-[#64748B] text-[11px] leading-relaxed">
              Entorno ceremonial 3D con estrado, tribuna presidencial, estrados de partes y oratoria central.
            </p>
          </div>

          <div className="p-4 bg-[#F5F3EF] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-[#14263D] font-bold">
              <FileText className="w-3.5 h-3.5 text-[#C5A15B]" />
              <span>Resolución Motivada</span>
            </div>
            <p className="text-[#64748B] text-[11px] leading-relaxed">
              Fallo judicial formal con Resultandos, Considerandos y rúbrica técnica de desempeño forense.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
