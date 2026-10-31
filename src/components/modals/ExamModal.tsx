import React, { useState, useEffect } from 'react';
import { Camera, Trash2, X, Check, Image as ImageIcon } from 'lucide-react';
import { fileToDataURL } from '../../utils/formatters';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value?: string;
  photos?: string[];
  onSave: (text: string, photos: string[]) => void;
  allowPhotos: boolean;
  explicacao?: string;
  normalPadrao?: string;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  photos,
  onSave,
  allowPhotos,
  explicacao,
  normalPadrao,
}) => {
  const [text, setText] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [carregandoFotos, setCarregandoFotos] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(value || '');
      setFotos(photos || []);
    }
  }, [isOpen, value, photos]);

  if (!isOpen) return null;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCarregandoFotos(true);
    try {
      const urls = await Promise.all(files.map(fileToDataURL));
      setFotos((prev) => [...prev, ...urls]);
    } catch {
      alert('Erro ao carregar uma das imagens.');
    } finally {
      setCarregandoFotos(false);
    }
  }

  function removeFoto(idx: number) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/70 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-base md:text-lg text-blue-900">{title}</h3>
            {explicacao && <p className="text-xs text-slate-500 font-normal">{explicacao}</p>}
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Descrição dos Achados Clínicos:
              </label>
              {normalPadrao && (
                <span className="text-[11px] text-slate-400">
                  Padrão normal:{' '}
                  <span className="italic text-slate-600 font-medium">{normalPadrao}</span>
                </span>
              )}
            </div>
            <textarea
              className="w-full min-h-[140px] p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed"
              placeholder="Descreva as alterações encontradas (deixe em branco se exame estiver normal)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </div>

          {allowPhotos && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  Fotografias & Registro de Imagem ({fotos.length})
                </span>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Anexar Fotos</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                </label>
              </div>

              {carregandoFotos && (
                <p className="text-xs text-purple-600 animate-pulse">Carregando fotos...</p>
              )}

              {fotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {fotos.map((f, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-xs"
                    >
                      <img src={f} className="w-full h-full object-cover" alt={`Achado ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeFoto(idx)}
                        className="absolute inset-0 bg-red-950/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity text-xs font-semibold backdrop-blur-2xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end sticky bottom-0 z-10">
          <button
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-sm font-medium transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
            onClick={() => {
              onSave(text, fotos);
              onClose();
            }}
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
