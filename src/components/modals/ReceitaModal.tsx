import React, { useState, useEffect } from 'react';
import { Patient, LocationInfo } from '../../types';
import { gerarReceita } from '../../utils/formatters';
import { Pill, Printer, Copy, Check, X, Eye } from 'lucide-react';

interface ReceitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  location: LocationInfo;
  tratamentoOD: string;
  tratamentoOE: string;
  tratamentoOral: string;
}

export const ReceitaModal: React.FC<ReceitaModalProps> = ({
  isOpen,
  onClose,
  patient,
  location,
  tratamentoOD,
  tratamentoOE,
  tratamentoOral,
}) => {
  const [tipoReceita, setTipoReceita] = useState<'oral' | 'od' | 'oe' | 'ambos'>('oral');
  const [receitaEditavel, setReceitaEditavel] = useState('');
  const [copiado, setCopiado] = useState(false);

  function getReceitaAtual(tipo: 'oral' | 'od' | 'oe' | 'ambos') {
    if (tipo === 'oral' && tratamentoOral.trim()) return gerarReceita('oral', tratamentoOral, patient, location);
    if (tipo === 'od' && tratamentoOD.trim()) return gerarReceita('od', tratamentoOD, patient, location);
    if (tipo === 'oe' && tratamentoOE.trim()) return gerarReceita('oe', tratamentoOE, patient, location);
    if (tipo === 'ambos') return gerarReceita('ambos', tratamentoOD.trim() ? tratamentoOD : tratamentoOE, patient, location);
    return 'Nenhum medicamento prescrito para esta modalidade.\n\nPreencha os campos de tratamento na ficha clínica para gerar automaticamente a receita formatada.';
  }

  useEffect(() => {
    if (isOpen) {
      setReceitaEditavel(getReceitaAtual(tipoReceita));
      setCopiado(false);
    }
  }, [isOpen, tipoReceita, tratamentoOral, tratamentoOD, tratamentoOE, patient, location]);

  if (!isOpen) return null;

  function handleCopiar() {
    navigator.clipboard.writeText(receitaEditavel);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function handleImprimir() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receituário - ${patient.nome || 'Veterinária'}</title>
  <style>
    @page {
      size: A4;
      margin: 3.5cm 2.5cm 2.5cm 2.5cm;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.7;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    pre {
      font-family: 'Segoe UI', Arial, sans-serif;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
    }
  </style>
</head>
<body>
  <pre>${receitaEditavel}</pre>
</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-emerald-950">
                Receituário Médico Veterinário
              </h3>
              <p className="text-xs text-emerald-700">Dr. Adélio Gurgel do Amaral Jr. · CRMV-SP 18.721</p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Modalidade:</span>
          {(
            [
              ['oral', 'Uso Oral'],
              ['od', 'Olho Direito (OD)'],
              ['oe', 'Olho Esquerdo (OE)'],
              ['ambos', 'Ambos os Olhos'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                tipoReceita === val
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => setTipoReceita(val)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/70">
          <textarea
            className="w-full h-full min-h-[380px] p-5 rounded-xl border border-slate-200 bg-white shadow-xs text-slate-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            value={receitaEditavel}
            onChange={(e) => setReceitaEditavel(e.target.value)}
          />
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            O texto pode ser editado livremente antes de imprimir ou copiar.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold border border-slate-200 transition-all active:scale-[0.98]"
              onClick={handleCopiar}
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              onClick={handleImprimir}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Receituário</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
