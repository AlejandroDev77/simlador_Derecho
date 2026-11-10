import React from 'react';
import { Gavel, CheckCircle2, Shield, User, Scale, AlertTriangle } from './Icons';
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
  const roleOptions: {
    role: LegalRole;
    title: string;
    stagePosition: string;
    desc: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
  }[] = [
    {
      role: 'abogado_demandante',
      title: 'Abogado del Demandante / Acusación',
      stagePosition: 'Mesa de la Acusación (Izquierda)',
      desc: 'Sostendrás la pretensión de condena o estimación de demanda, formulando alegatos orales e incorporando pruebas de autos.',
      icon: User
    },
    {
      role: 'abogado_demandado',
      title: 'Abogada del Demandado / Defensa',
      stagePosition: 'Mesa de la Defensa (Derecha)',
      desc: 'Formularás la contradicción procesal, excepciones jurídicas y desacreditación probatoria para desvirtuar las imputaciones.',
      icon: Shield
    },
    {
      role: 'juez',
      title: 'Juez Presidente del Tribunal',
      stagePosition: 'Estrado Presidencial Central',
      desc: 'Dirigirás la vista oral plenario, moderarás las intervenciones de las partes, resolverás objeciones y dictarás la sentencia motivada.',
      icon: Scale
    }
  ];

  return (
    <div className="max-w-4xl mx-auto my-auto w-full bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl font-sans">
      {/* Encabezado Institucional */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#14263D]/5 border border-[#243F5B]/20 text-[#14263D] text-xs font-semibold mb-1">
          <Shield className="w-3.5 h-3.5 text-[#C5A15B]" />
          <span>Fase 3 • Personación Procesal</span>
        </div>
        <h2 className="text-2xl font-bold text-[#14263D]">Asignación de Rol en Audiencia</h2>
        <p className="text-xs text-[#64748B] max-w-lg mx-auto leading-relaxed">
          Seleccione la posición procesal que ejercerá en estrados. Los restantes intervinientes comparecerán de forma autónoma respetando las constancias del expediente.
        </p>
      </div>

      {/* Tarjeta de Alerta Institucional: Exclusividad de 3 Roles en Demo */}
      <div className="p-4 bg-[#F5F3EF] border-l-4 border-[#C5A15B] rounded-r-2xl flex items-start space-x-3 text-xs shadow-xs">
        <AlertTriangle className="w-5 h-5 text-[#C5A15B] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[#334155]">
          <strong className="block text-[#14263D] font-bold text-[11px] uppercase tracking-wider">
            Aviso de Disponibilidad Procesal • Versión Demostración
          </strong>
          <p className="leading-relaxed text-[11.5px]">
            Esta versión de prueba cuenta con <strong>3 roles procesales activos y simulables</strong> en sala: 
            <em> Abogado de la Acusación</em>, <em>Abogada de la Defensa</em> y <em>Juez Presidente del Tribunal</em>. 
            Las partes materiales (demandante y demandado) comparecen en estrados asistidos por sus letrados.
          </p>
        </div>
      </div>

      {/* Cuadrícula de los 3 Roles Simulables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roleOptions.map((opt) => {
          const isSelected = selectedRole === opt.role;
          const IconComp = opt.icon;

          return (
            <div
              key={opt.role}
              onClick={() => onSelectRole(opt.role)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-[#14263D]/5 border-[#243F5B] ring-2 ring-[#243F5B]/30 shadow-md border-t-4 border-t-[#C5A15B]'
                  : 'bg-[#F5F3EF]/70 border-[#E2E8F0] hover:border-slate-300 hover:bg-[#F5F3EF]'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                    isSelected
                      ? 'bg-[#243F5B] text-[#C5A15B] border-[#C5A15B]/50'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-[#243F5B] bg-[#243F5B]/10 px-2 py-0.5 rounded-full border border-[#243F5B]/20">
                      <CheckCircle2 className="w-3 h-3 text-[#C5A15B]" />
                      <span>Seleccionado</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#14263D] leading-tight">{opt.title}</h3>
                  <span className="text-[10px] text-[#C5A15B] font-semibold block mt-0.5">
                    {opt.stagePosition}
                  </span>
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed">
                  {opt.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className={`text-[10.5px] font-semibold block ${
                  isSelected ? 'text-[#243F5B]' : 'text-slate-400'
                }`}>
                  {isSelected ? '✓ Rol asignado a tu usuario' : 'Haga clic para asumir este rol'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón de Ingreso a Sala */}
      <button
        onClick={onStartSimulation}
        disabled={loading}
        className="w-full py-3.5 bg-[#243F5B] hover:bg-[#14263D] text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#243F5B]/20 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <span>Constituyendo la Sala de Audiencias...</span>
        ) : (
          <>
            <Gavel className="w-4 h-4 text-[#C5A15B]" />
            <span>Constituir Tribunal e Ingresar a Sala</span>
          </>
        )}
      </button>
    </div>
  );
};
