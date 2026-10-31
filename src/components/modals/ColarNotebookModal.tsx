import React, { useState } from 'react';
import { Sparkles, Check, X, ClipboardPaste, ArrowRight, FileText } from 'lucide-react';
import { ConsultaSummary } from '../../types';

interface ColarNotebookModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAplicar: (dados: {
    queixa?: string;
    diagnostico?: string;
    resumo?: string;
    tratamentoOral?: string;
    tratamentoOD?: string;
    tratamentoOE?: string;
    retornoOuAlta?: string;
    consulta?: ConsultaSummary;
  }) => void;
}

export const ColarNotebookModal: React.FC<ColarNotebookModalProps> = ({
  aberto,
  onFechar,
  onAplicar,
}) => {
  const [textoColado, setTextoColado] = useState('');
  const [analisado, setAnalisado] = useState<{
    queixa: string;
    diagnostico: string;
    tratamentoOral: string;
    tratamentoOD: string;
    tratamentoOE: string;
    retornoOuAlta: string;
    resumo: string;
    topicos: { titulo: string; itens: string[] }[];
  } | null>(null);

  if (!aberto) return null;

  function analisarTexto(texto: string) {
    const linhas = texto.split('\n').map((l) => l.trim());
    let queixa = '';
    let diagnostico = '';
    let tratamentoOral = '';
    let tratamentoOD = '';
    let tratamentoOE = '';
    let retornoOuAlta = '';
    let resumo = '';
    const topicos: { titulo: string; itens: string[] }[] = [];

    let secaoAtual = '';
    let bufferSecao: string[] = [];

    const flushSecao = () => {
      if (!secaoAtual && !bufferSecao.length) return;
      const conteudo = bufferSecao.join('\n').trim();
      const sLower = secaoAtual.toLowerCase();

      if (sLower.includes('queixa') || sLower.includes('histórico') || sLower.includes('historico') || sLower.includes('motivo')) {
        queixa = conteudo;
      } else if (sLower.includes('diagnóstico') || sLower.includes('diagnostico') || sLower.includes('dx')) {
        diagnostico = conteudo;
      } else if (sLower.includes('od') || sLower.includes('direito')) {
        tratamentoOD = conteudo;
      } else if (sLower.includes('oe') || sLower.includes('esquerdo')) {
        tratamentoOE = conteudo;
      } else if (sLower.includes('oral') || sLower.includes('comprimido') || sLower.includes('xarope')) {
        tratamentoOral = conteudo;
      } else if (sLower.includes('tratamento') || sLower.includes('prescrição') || sLower.includes('prescricao') || sLower.includes('conduta') || sLower.includes('medicamento')) {
        // If not separated by eye, split lines by OD/OE if present
        const lns = conteudo.split('\n');
        const odLines: string[] = [];
        const oeLines: string[] = [];
        const oralLines: string[] = [];

        lns.forEach((l) => {
          const lLower = l.toLowerCase();
          if (lLower.includes('od:') || lLower.includes('olho direito') || lLower.includes('(od)')) {
            odLines.push(l.replace(/^(od|olho direito)[:\s-]*/i, '').trim());
          } else if (lLower.includes('oe:') || lLower.includes('olho esquerdo') || lLower.includes('(oe)')) {
            oeLines.push(l.replace(/^(oe|olho esquerdo)[:\s-]*/i, '').trim());
          } else {
            oralLines.push(l);
          }
        });

        if (odLines.length) tratamentoOD = odLines.join('\n');
        if (oeLines.length) tratamentoOE = oeLines.join('\n');
        if (oralLines.length) tratamentoOral = oralLines.join('\n');
        if (!odLines.length && !oeLines.length && !oralLines.length) {
          tratamentoOral = conteudo;
        }
      } else if (sLower.includes('retorno') || sLower.includes('alta') || sLower.includes('reavaliação')) {
        retornoOuAlta = conteudo;
      } else if (sLower.includes('resumo') || sLower.includes('síntese') || sLower.includes('sintese')) {
        resumo = conteudo;
      } else if (secaoAtual) {
        const itens = bufferSecao
          .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
          .filter(Boolean);
        if (itens.length > 0) {
          topicos.push({ titulo: secaoAtual, itens });
        }
      }
      bufferSecao = [];
    };

    for (const linha of linhas) {
      if (!linha) continue;
      const headerMatch = linha.match(/^(?:#{1,4}\s*|\*\*|__)?([A-Za-zÀ-ÿ\s/()]{3,35})(?:\*\*|__)?[:\s]*$/);
      if (headerMatch && (
        /queixa|motivo|histórico|historico|diagnóstico|diagnostico|tratamento|conduta|prescrição|prescricao|achados|retorno|alta|reavaliação|orientações|orientacoes|resumo/i.test(headerMatch[1])
      )) {
        flushSecao();
        secaoAtual = headerMatch[1].trim();
      } else {
        bufferSecao.push(linha);
      }
    }
    flushSecao();

    if (!queixa && !diagnostico && !resumo) {
      resumo = texto.trim();
    }

    setAnalisado({
      queixa,
      diagnostico,
      tratamentoOral,
      tratamentoOD,
      tratamentoOE,
      retornoOuAlta,
      resumo: resumo || texto.slice(0, 300) + '...',
      topicos,
    });
  }

  function handleProcessar() {
    if (!textoColado.trim()) return;
    analisarTexto(textoColado);
  }

  function handleSalvarNaFicha() {
    if (!analisado) return;
    const consulta: ConsultaSummary = {
      resumo: analisado.resumo || textoColado,
      topicos: analisado.topicos.length > 0 ? analisado.topicos : [
        { titulo: 'Resumo Importado', itens: [analisado.resumo || textoColado.slice(0, 200)] }
      ],
      transcricao: textoColado,
      queixa: analisado.queixa,
      diagnostico: analisado.diagnostico,
      tratamentoOral: analisado.tratamentoOral,
      tratamentoOD: analisado.tratamentoOD,
      tratamentoOE: analisado.tratamentoOE,
      retornoOuAlta: analisado.retornoOuAlta,
      geradoEm: new Date().toLocaleString('pt-BR'),
    };

    onAplicar({
      queixa: analisado.queixa,
      diagnostico: analisado.diagnostico,
      resumo: analisado.resumo,
      tratamentoOral: analisado.tratamentoOral,
      tratamentoOD: analisado.tratamentoOD,
      tratamentoOE: analisado.tratamentoOE,
      retornoOuAlta: analisado.retornoOuAlta,
      consulta,
    });
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-purple-950">
                Colar do NotebookLM / Gemini
              </h3>
              <p className="text-xs text-purple-700">
                Cole o resumo gerado pelo NotebookLM para preencher a ficha e o receituário automaticamente
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onFechar}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Cole aqui o texto gerado pelo NotebookLM:</span>
              <span className="text-[11px] text-purple-600 font-normal">
                Você pode colar resumos, tópicos ou notas completas
              </span>
            </label>
            <textarea
              className="w-full min-h-[180px] p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-sans leading-relaxed"
              placeholder={`Exemplo:
Queixa: Olho direito fechado há 2 dias com secreção.
Diagnóstico: Úlcera de córnea superficial e CCS em OD.
Tratamento Oral: Cefalexina 500mg 1/2 comp a cada 12h por 10 dias.
Tópico OD: Tobramicina 0,3% colírio 1 gota a cada 8h por 10 dias.
Retorno: Retorno em 7 dias para reteste com fluoresceína.`}
              value={textoColado}
              onChange={(e) => {
                setTextoColado(e.target.value);
                setAnalisado(null);
              }}
              autoFocus
            />
          </div>

          {!analisado ? (
            <button
              onClick={handleProcessar}
              disabled={!textoColado.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analisar e Separar Campos Clínicos</span>
            </button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Campos identificados com sucesso! Revise antes de aplicar:
                </span>
                <button
                  onClick={() => setAnalisado(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Editar texto colado
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {analisado.queixa && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Queixa Principal:</span>
                    <p className="text-slate-600 whitespace-pre-wrap">{analisado.queixa}</p>
                  </div>
                )}

                {analisado.diagnostico && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Diagnóstico:</span>
                    <p className="text-slate-600 whitespace-pre-wrap">{analisado.diagnostico}</p>
                  </div>
                )}

                {analisado.tratamentoOral && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">💊 Tratamento Oral:</span>
                    <p className="text-slate-600 whitespace-pre-wrap">{analisado.tratamentoOral}</p>
                  </div>
                )}

                {(analisado.tratamentoOD || analisado.tratamentoOE) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">👁️ Tratamento Tópico (Colírios):</span>
                    {analisado.tratamentoOD && <p className="text-blue-900 font-semibold mb-1">OD: {analisado.tratamentoOD}</p>}
                    {analisado.tratamentoOE && <p className="text-indigo-900 font-semibold">OE: {analisado.tratamentoOE}</p>}
                  </div>
                )}

                {analisado.retornoOuAlta && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 md:col-span-2">
                    <span className="font-bold text-emerald-900 block mb-1">🔄 Conduta (Retorno ou Alta):</span>
                    <p className="text-emerald-800 whitespace-pre-wrap font-medium">{analisado.retornoOuAlta}</p>
                  </div>
                )}

                {analisado.resumo && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 md:col-span-2">
                    <span className="font-bold text-slate-700 block mb-1">Resumo da Consulta:</span>
                    <p className="text-slate-600 whitespace-pre-wrap">{analisado.resumo}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>

          {analisado && (
            <button
              onClick={handleSalvarNaFicha}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <span>Inserir na Ficha Clínica & Receituário</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
