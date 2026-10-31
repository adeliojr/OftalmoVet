import React, { useState, useEffect } from 'react';
import { FileText, Printer, Copy, Check, X } from 'lucide-react';

interface RelatorioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  content: string;
  isHTML: boolean;
}

export const RelatorioModal: React.FC<RelatorioModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  content,
  isHTML,
}) => {
  const [texto, setTexto] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTexto(content);
      setCopiado(false);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  function handleCopiar() {
    if (isHTML) {
      const temp = document.createElement('div');
      temp.innerHTML = texto;
      navigator.clipboard.writeText(temp.textContent || temp.innerText || '');
    } else {
      navigator.clipboard.writeText(texto);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function handleImprimir() {
    const w = window.open('', '_blank');
    if (!w) return;
    if (isHTML) {
      w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body {
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  ${texto}
</body>
</html>`);
    } else {
      w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.7;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      margin: 0;
    }
  </style>
</head>
<body>
  <pre>${texto}</pre>
</body>
</html>`);
    }
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-blue-950">{title}</h3>
              {subtitle && <p className="text-xs text-blue-700">{subtitle}</p>}
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/70">
          {isHTML ? (
            <div
              className="bg-white p-6 md:p-8 rounded-xl shadow-xs border border-slate-200"
              dangerouslySetInnerHTML={{ __html: texto }}
            />
          ) : (
            <textarea
              className="w-full h-full min-h-[420px] p-5 rounded-xl border border-slate-200 bg-white shadow-xs text-slate-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Pronto para impressão em formato A4 ou cópia para sistema de gestão.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold border border-slate-200 transition-all active:scale-[0.98]"
              onClick={handleCopiar}
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              onClick={handleImprimir}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
