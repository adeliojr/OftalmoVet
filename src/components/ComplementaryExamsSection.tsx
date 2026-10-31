import React, { useState } from 'react';
import { ComplementaryExamData } from '../types';
import { EXAMES_COMPLEMENTARES } from '../utils/constants';
import { ExamModal } from './modals/ExamModal';
import { Section } from './Section';
import { Activity, Camera, Check } from 'lucide-react';

interface ComplementaryExamsSectionProps {
  dados: ComplementaryExamData;
  setDados: React.Dispatch<React.SetStateAction<ComplementaryExamData>>;
}

export const ComplementaryExamsSection: React.FC<ComplementaryExamsSectionProps> = ({
  dados,
  setDados,
}) => {
  const [modalKey, setModalKey] = useState<string | null>(null);

  const atual = EXAMES_COMPLEMENTARES.find((e) => e.key === modalKey);

  return (
    <Section
      title="Exames Complementares"
      icon={<Activity className="w-5 h-5 text-blue-600" />}
      subtitle="Ultrassom ocular, microbiologia, eletrorretinografia e exames laboratoriais"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {EXAMES_COMPLEMENTARES.map((ex) => {
          const preenchido = !!(dados[ex.key] && dados[ex.key].trim());
          const fotos: string[] = dados[`${ex.key}_photos`] || [];
          return (
            <button
              key={ex.key}
              type="button"
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold border transition-all flex items-center justify-between ${
                preenchido
                  ? 'bg-blue-50/90 border-blue-300 text-blue-950 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
              }`}
              onClick={() => setModalKey(ex.key)}
            >
              <span>{ex.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {preenchido && (
                  <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
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

      <ExamModal
        isOpen={!!modalKey}
        onClose={() => setModalKey(null)}
        title={atual ? atual.label : ''}
        value={modalKey ? dados[modalKey] : ''}
        photos={modalKey ? dados[`${modalKey}_photos`] : []}
        allowPhotos={atual ? !!atual.hasPhoto : false}
        onSave={(text, fotos) => {
          if (!modalKey) return;
          setDados((prev) => ({
            ...prev,
            [modalKey]: text,
            [`${modalKey}_photos`]: fotos,
          }));
        }}
      />
    </Section>
  );
};
