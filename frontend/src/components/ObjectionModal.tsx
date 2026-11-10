import React from 'react';
import { AlertTriangle, X } from './Icons';

interface ObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGrounds: (grounds: string) => void;
}

export const ObjectionModal: React.FC<ObjectionModalProps> = ({
  isOpen,
  onClose,
  onSelectGrounds
}) => {
  if (!isOpen) return null;

  const groundsList = [
    { label: 'Hecho no documentado ni probado', desc: 'La contraparte alega datos no incorporados oportunamente al expediente.' },
    { label: 'Pregunta capciosa o sugestiva', desc: 'Induce a error procesal o presupone una respuesta forzada.' },
    { label: 'Impertinencia o inconducencia', desc: 'No guarda relación directa con los puntos controvertidos de la causa.' },
    { label: 'Falta de relevancia probatoria', desc: 'El medio o afirmación carece de idoneidad procesal para esclarecer los hechos.' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#14263D]">Interponer Objeción Forense</h3>
              <p className="text-xs text-[#334155]">Selecciona el fundamento procesal para el Tribunal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {groundsList.map((m, idx) => (
            <button
              key={idx}
              onClick={() => onSelectGrounds(m.label)}
              className="w-full text-left p-3.5 rounded-xl bg-[#F5F3EF] border border-slate-200 hover:border-red-600 hover:bg-red-50/50 transition-all text-xs group cursor-pointer"
            >
              <span className="font-bold text-[#14263D] group-hover:text-red-700 block mb-0.5">
                {m.label}
              </span>
              <span className="text-[11px] text-[#334155] block leading-relaxed">
                {m.desc}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#334155] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Desestimar y Volver
          </button>
        </div>
      </div>
    </div>
  );
};
