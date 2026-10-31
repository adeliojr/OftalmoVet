import React, { useState } from 'react';
import { Eye, ShieldCheck, Stethoscope, Smartphone } from 'lucide-react';
import { GuiaUsoDiaADiaModal } from './modals/GuiaUsoDiaADiaModal';

export const Header: React.FC = () => {
  const [guiaAberto, setGuiaAberto] = useState(false);

  return (
    <header className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Eye className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Ficha Oftalmológica Veterinária
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-md border border-blue-200/60">
              HVA
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Hospital Veterinário de Araçatuba · Sistema Integrado com Transcrição Inteligente
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={() => setGuiaAberto(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs transition-all active:scale-[0.98]"
          title="Ver o link permanente e como instalar no celular ou computador da clínica"
        >
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Como Usar no Dia a Dia</span>
        </button>

        <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-2 rounded-xl border border-slate-200/60">
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="text-right sm:text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              Dr. Adélio Gurgel do Amaral Jr.
            </div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              CRMV-SP 18.721
            </div>
          </div>
        </div>
      </div>

      <GuiaUsoDiaADiaModal aberto={guiaAberto} onFechar={() => setGuiaAberto(false)} />
    </header>
  );
};
