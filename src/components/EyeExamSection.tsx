import React, { useState } from 'react';
import { EyeExamData } from '../types';
import { ESTRUTURAS, TESTES_CORNEA } from '../utils/constants';
import { interpretPio, interpretSchirmer } from '../utils/formatters';
import { ExamModal } from './modals/ExamModal';
import { Section } from './Section';
import { Eye, Check, Camera, AlertCircle } from 'lucide-react';

interface OlhoCardProps {
  ladoLabel: string;
  ladoKey: 'OD' | 'OE';
  exame: EyeExamData;
  setExame: React.Dispatch<React.SetStateAction<EyeExamData>>;
}

const OlhoCard: React.FC<OlhoCardProps> = ({ ladoLabel, ladoKey, exame, setExame }) => {
  const [modalKey, setModalKey] = useState<string | null>(null);

  const schirmer = exame.schirmer || '';
  const pio = exame.pio || '';
  const schirmerInterpret = interpretSchirmer(schirmer);
  const pioInterpret = interpretPio(pio);

  const estruturaAtual =
    ESTRUTURAS.find((e) => e.key === modalKey) ||
    TESTES_CORNEA.find((e) => e.key === modalKey);

  return (
    <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                ladoKey === 'OD' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              {ladoKey}
            </span>
            <h3 className="font-bold text-sm md:text-base text-slate-900">{ladoLabel}</h3>
          </div>
        </div>

        {/* Schirmer & PIO tests */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Teste de Schirmer (mm/min)
            </label>
            <input
              type="text"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: 18"
              value={schirmer}
              onChange={(e) => setExame((prev) => ({ ...prev, schirmer: e.target.value }))}
            />
            {schirmerInterpret && (
              <div
                className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                  schirmerInterpret === 'Normal' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {schirmerInterpret === 'Normal' ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span>{schirmerInterpret}</span>
              </div>
            )}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pressão Intraocular - PIO (mmHg)
            </label>
            <input
              type="text"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: 15"
              value={pio}
              onChange={(e) => setExame((prev) => ({ ...prev, pio: e.target.value }))}
            />
            {pioInterpret && (
              <div
                className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                  pioInterpret === 'Normal' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {pioInterpret === 'Normal' ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span>{pioInterpret}</span>
              </div>
            )}
          </div>
        </div>

        {/* 11 Structures */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 mb-2">
            Estruturas Anatômicas (clique para descrever alterações e fotos):
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ESTRUTURAS.map((est) => {
              const preenchido = !!(exame[est.key] && exame[est.key].trim());
              const fotos: string[] = exame[`${est.key}_photos`] || [];
              return (
                <button
                  key={est.key}
                  type="button"
                  className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                    preenchido
                      ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                  onClick={() => setModalKey(est.key)}
                >
                  <span className="truncate pr-1">{est.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {preenchido && (
                      <span className="bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                    {fotos.length > 0 && (
                      <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold">
                        <Camera className="w-2.5 h-2.5" />
                        {fotos.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cornea Stain Tests */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">Testes da Córnea:</label>
          <div className="grid grid-cols-3 gap-2">
            {TESTES_CORNEA.map((t) => {
              const preenchido = !!(exame[t.key] && exame[t.key].trim());
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`text-center px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    preenchido
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                  onClick={() => setModalKey(t.key)}
                >
                  {t.label} {preenchido && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ExamModal
        isOpen={!!modalKey}
        onClose={() => setModalKey(null)}
        title={
          estruturaAtual
            ? `${estruturaAtual.label} — ${ladoLabel}`
            : ''
        }
        explicacao={'explicacao' in (estruturaAtual || {}) ? (estruturaAtual as any).explicacao : undefined}
        normalPadrao={'normal' in (estruturaAtual || {}) ? (estruturaAtual as any).normal : undefined}
        value={modalKey ? exame[modalKey] : ''}
        photos={modalKey ? exame[`${modalKey}_photos`] : []}
        allowPhotos={true}
        onSave={(text, fotos) => {
          if (!modalKey) return;
          setExame((prev) => ({
            ...prev,
            [modalKey]: text,
            [`${modalKey}_photos`]: fotos,
          }));
        }}
      />
    </div>
  );
};

interface EyeExamSectionProps {
  examsOD: EyeExamData;
  setExamsOD: React.Dispatch<React.SetStateAction<EyeExamData>>;
  examsOE: EyeExamData;
  setExamsOE: React.Dispatch<React.SetStateAction<EyeExamData>>;
}

export const EyeExamSection: React.FC<EyeExamSectionProps> = ({
  examsOD,
  setExamsOD,
  examsOE,
  setExamsOE,
}) => {
  return (
    <Section
      title="Exame Oftalmológico Bilateral"
      icon={<Eye className="w-5 h-5 text-blue-600" />}
      subtitle="Avaliação de Schirmer, pressão intraocular, estruturas anatômicas e corantes"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OlhoCard
          ladoLabel="Olho Direito (OD)"
          ladoKey="OD"
          exame={examsOD}
          setExame={setExamsOD}
        />
        <OlhoCard
          ladoLabel="Olho Esquerdo (OE)"
          ladoKey="OE"
          exame={examsOE}
          setExame={setExamsOE}
        />
      </div>
    </Section>
  );
};
