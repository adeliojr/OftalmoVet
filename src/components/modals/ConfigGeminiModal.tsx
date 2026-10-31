import React, { useState, useEffect } from 'react';
import { GeminiConfig } from '../../types';
import { MODELO_PADRAO, PROMPT_PADRAO } from '../../utils/constants';
import { Settings, Key, Sparkles, Check, X, ShieldCheck } from 'lucide-react';

interface ConfigGeminiModalProps {
  aberto: boolean;
  onFechar: () => void;
  cfg: GeminiConfig;
  onSalvar: (c: GeminiConfig) => void;
  temChaveServidor: boolean;
}

export const ConfigGeminiModal: React.FC<ConfigGeminiModalProps> = ({
  aberto,
  onFechar,
  cfg,
  onSalvar,
  temChaveServidor,
}) => {
  const [chave, setChave] = useState('');
  const [modelo, setModelo] = useState('');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (aberto) {
      setChave(cfg.chave || '');
      setModelo(cfg.modelo || MODELO_PADRAO);
      setPrompt(cfg.prompt || PROMPT_PADRAO);
    }
  }, [aberto, cfg]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Configuração de IA & Gravação</h3>
              <p className="text-xs text-slate-500">Parâmetros do modelo Gemini e diretrizes de resumo</p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {temChaveServidor && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Chave do servidor ativa:</strong> O AI Studio já possui uma chave configurada no servidor. Não
                é obrigatório preencher a chave abaixo a menos que você queira usar uma chave pessoal específica.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Chave de API do Google Gemini (Opcional se já configurada no ambiente)
            </label>
            <input
              type="password"
              autoComplete="off"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Cole aqui sua chave se desejar sobrepor a do servidor"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Fica salva com segurança no seu navegador e não é exposta a terceiros.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Prompt de Instruções para o Resumo
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
              rows={7}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Você pode colar aqui o mesmo prompt que costuma usar no NotebookLM. O sistema sempre estruturará em
              queixa, diagnóstico, resumo e tópicos objetivos.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Modelo de IA</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder={MODELO_PADRAO}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">Padrão recomendado: {MODELO_PADRAO}</p>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex items-center justify-end gap-2">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-xs md:text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSalvar({
                chave: chave.trim(),
                modelo: modelo.trim() || MODELO_PADRAO,
                prompt: prompt.trim() || PROMPT_PADRAO,
              });
              onFechar();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
