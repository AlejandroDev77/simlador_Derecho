import React from 'react';
import { AlertTriangle } from './Icons';

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
    { label: 'Hecho no documentado ni probado', desc: 'La contraparte alega datos no incorporados al expediente.' },
    { label: 'Pregunta capciosa o sugestiva', desc: 'Induce a error o presupone una respuesta forzada.' },
    { label: 'Impertinencia o inconducencia', desc: 'No guarda relación con los puntos controvertidos de la causa.' },
    { label: 'Falta de relevancia probatoria', desc: 'El medio o afirmación carece de idoneidad para esclarecer los hechos.' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-100">Interponer Objeción Forense</h3>
            <p className="text-xs text-stone-400">Selecciona el fundamento jurídico para el Tribunal</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {groundsList.map((m, idx) => (
            <button
              key={idx}
              onClick={() => onSelectGrounds(m.label)}
              className="w-full text-left p-3 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-red-600/60 hover:bg-red-950/20 transition-all text-xs"
            >
              <span className="font-bold text-stone-200 block mb-0.5">{m.label}</span>
              <span className="text-[11px] text-stone-400">{m.desc}</span>
            </button>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

