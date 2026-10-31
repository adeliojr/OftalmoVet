import React from 'react';
import { Pill, CalendarClock, CheckCircle } from 'lucide-react';
import { Section } from './Section';

interface TreatmentSectionProps {
  tratamentoOral: string;
  setTratamentoOral: (v: string) => void;
  tratamentoOD: string;
  setTratamentoOD: (v: string) => void;
  tratamentoOE: string;
  setTratamentoOE: (v: string) => void;
  retornoOuAlta?: string;
  setRetornoOuAlta?: (v: string) => void;
}

const OPCOES_CONDUTA = [
  'Retorno em 7 dias',
  'Retorno em 15 dias',
  'Retorno em 30 dias',
  'Retorno se piora dos sintomas',
  'Alta Médica',
];

export const TreatmentSection: React.FC<TreatmentSectionProps> = ({
  tratamentoOral,
  setTratamentoOral,
  tratamentoOD,
  setTratamentoOD,
  tratamentoOE,
  setTratamentoOE,
  retornoOuAlta = '',
  setRetornoOuAlta,
}) => {
  return (
    <Section
      title="Conduta Terapêutica & Prescrição"
      icon={<Pill className="w-5 h-5 text-emerald-600" />}
      subtitle="Defina o tratamento oral e tópico para geração automática da receita formatada e resumo final"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">Tratamento por Via Oral</label>
            <span className="text-[11px] text-slate-400 font-mono">
              medicamento, quantidade, frequência, duração
            </span>
          </div>
          <textarea
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium leading-relaxed"
            rows={2}
            placeholder="Ex: Cefalexina comp 500mg, 1, bid, 10d"
            value={tratamentoOral}
            onChange={(e) => setTratamentoOral(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">Tratamento Tópico — Olho Direito (OD)</label>
              <span className="text-[11px] text-slate-400 font-mono">medicamento % freq duração</span>
            </div>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium leading-relaxed"
              rows={2}
              placeholder="Ex: Tobramicina 0,3% bid 10d"
              value={tratamentoOD}
              onChange={(e) => setTratamentoOD(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">Tratamento Tópico — Olho Esquerdo (OE)</label>
              <span className="text-[11px] text-slate-400 font-mono">medicamento % freq duração</span>
            </div>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium leading-relaxed"
              rows={2}
              placeholder="Ex: Tobramicina 0,3% bid 10d"
              value={tratamentoOE}
              onChange={(e) => setTratamentoOE(e.target.value)}
            />
          </div>
        </div>

        {/* Retorno caso precise OU Alta médica */}
        {setRetornoOuAlta && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                <span>Conduta / Retorno ou Alta Médica (Resumo do Atendimento)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Aparece no final do relatório do tutor e prontuário
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {OPCOES_CONDUTA.map((opt) => {
                const ativo = retornoOuAlta.toLowerCase().includes(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRetornoOuAlta(opt)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      ativo
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {opt === 'Alta Médica' && <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-500" />}
                    {opt}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
              placeholder="Ex: Retorno em 7 dias para reavaliação corneana e novo teste de fluoresceína (ou Alta Médica)"
              value={retornoOuAlta}
              onChange={(e) => setRetornoOuAlta(e.target.value)}
            />
          </div>
        )}
      </div>
    </Section>
  );
};
