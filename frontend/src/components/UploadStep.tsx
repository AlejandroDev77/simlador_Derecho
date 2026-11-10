import React from 'react';
import { Gavel, Upload, Sparkles, Scale, BookOpen } from './Icons';

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
    <div className="max-w-2xl mx-auto my-auto w-full px-2">
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
        {/* Glow sutil de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Insignia central */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-950/40">
          <Gavel className="w-10 h-10" />
        </div>

        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistema Forense de Juicios Orales</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-100 tracking-tight">
            Cargar Expediente Procesal
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-2 max-w-lg mx-auto leading-relaxed">
            Sube autos judiciales en formato PDF, Word o TXT. El sistema extraerá los hechos probados,
            admitirá las pruebas documentadas y construirá la sala 3D con avatares e interacción oral.
          </p>
        </div>

        {/* Zona de Arrastre de Archivos */}
        <label className="border-2 border-dashed border-stone-700/90 hover:border-amber-500/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-stone-950/60 hover:bg-stone-900/80 transition-all duration-200 group shadow-inner">
          <div className="p-4 rounded-full bg-stone-800/80 group-hover:bg-amber-500/20 text-stone-400 group-hover:text-amber-400 mb-3 transition-colors">
            <Upload className="w-8 h-8" />
          </div>
          <span className="text-sm font-bold text-stone-200 group-hover:text-white">
            {loading ? 'Analizando expediente con IA...' : 'Selecciona o arrastra el expediente aquí'}
          </span>
          <span className="text-xs text-stone-500 mt-1">Admite formatos PDF, DOCX o TXT (hasta 25 MB)</span>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={onFileUpload}
            disabled={loading}
          />
        </label>

        {/* Carga Rápida de Expediente de Ejemplo */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <span className="text-xs text-stone-400">¿Deseas probarlo de inmediato?</span>
          <button
            type="button"
            onClick={onLoadExample}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-stone-800 to-stone-850 hover:from-amber-600/20 hover:to-amber-500/20 border border-stone-700 hover:border-amber-500/40 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all flex items-center space-x-2 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cargar Caso Penal de Prueba (142/2024 - Estafa)</span>
          </button>
        </div>

        {/* Pilares Institucionales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-3">
          <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/90 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
              <Scale className="w-3.5 h-3.5" />
              <span>Fidelidad Estricta</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Sin invenciones. Todas las intervenciones se apegan a los autos procesales.
            </p>
          </div>

          <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/90 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
              <Gavel className="w-3.5 h-3.5" />
              <span>Sala 3D e Iluminación</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Ambiente arquitectónico luminoso, locomoción por turnos y control de cámara.
            </p>
          </div>

          <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/90 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voz Neural Adaptativa</span>
            </div>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              Síntesis OpenAI diferenciada por género (juez, letrados y fiscalía).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
