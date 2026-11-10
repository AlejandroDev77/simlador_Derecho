import React from 'react';
import { Play, CheckCircle2 } from './Icons';
import type { LegalRole } from '../types';

interface RoleSelectStepProps {
  selectedRole: LegalRole;
  onSelectRole: (role: LegalRole) => void;
  loading: boolean;
  onStartSimulation: () => void;
}

export const RoleSelectStep: React.FC<RoleSelectStepProps> = ({
  selectedRole,
  onSelectRole,
  loading,
  onStartSimulation
}) => {
  const roleOptions: { role: LegalRole; title: string; desc: string }[] = [
    {
      role: 'abogado_demandante',
      title: 'Abogado del Demandante / Acusación',
      desc: 'Sostendrás la pretensión de condena o demanda fundamentándote en las pruebas del expediente.'
    },
    {
      role: 'abogado_demandado',
      title: 'Abogado del Demandado / Defensa',
      desc: 'Formularás la contradicción procesal, excepciones y desacreditación de las alegaciones contrarias.'
    },
    {
      role: 'juez',
      title: 'Juez Presidente del Tribunal',
      desc: 'Moderarás el debate, dirigirás las etapas procesales y resolverás incidentes.'
    },
    {
      role: 'fiscal',
      title: 'Ministerio Público / Fiscal',
      desc: 'Promoverás la acción penal y velarás por el interés público y la legalidad.'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto my-auto w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-6 shadow-2xl">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-stone-100">Selecciona tu Rol Procesal</h2>
        <p className="text-xs text-stone-400">
          Elige qué parte asumirás durante la audiencia. Los restantes roles serán gestionados por la IA en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roleOptions.map((opt) => (
          <div
            key={opt.role}
            onClick={() => onSelectRole(opt.role)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedRole === opt.role
                ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40'
                : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-stone-200">{opt.title}</span>
              {selectedRole === opt.role && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-stone-400">{opt.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onStartSimulation}
        disabled={loading}
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-amber-600/30"
      >
        {loading ? (
          <span>Preparando sala 3D...</span>
        ) : (
          <>
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Ingresar a la Sala de Audiencias</span>
          </>
        )}
      </button>
    </div>
  );
};

