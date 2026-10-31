import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface TextModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSave: (text: string) => void;
  placeholder?: string;
}

export const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  onSave,
  placeholder,
}) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) setText(value || '');
  }, [isOpen, value]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
          <h3 className="font-bold text-base md:text-lg text-blue-900">{title}</h3>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <textarea
            className="w-full min-h-[260px] p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed"
            placeholder={placeholder || 'Digite o texto detalhado...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-sm font-medium transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
            onClick={() => {
              onSave(text);
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
