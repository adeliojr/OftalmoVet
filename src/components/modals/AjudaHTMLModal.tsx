import React, { useState } from 'react';
import { Download, Copy, Check, X, Smartphone, Globe, ShieldCheck, HelpCircle, Laptop } from 'lucide-react';

interface AjudaHTMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBaixarNovamente: () => void;
  htmlContent: string;
}

export const AjudaHTMLModal: React.FC<AjudaHTMLModalProps> = ({
  isOpen,
  onClose,
  onBaixarNovamente,
  htmlContent,
}) => {
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  function copiarCodigo() {
    if (!htmlContent) return;
    navigator.clipboard.writeText(htmlContent);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight">
                Arquivo .HTML Pronto para Uso
              </h3>
              <p className="text-xs text-blue-200">
                Ficha Oftalmológica autônoma para abrir em qualquer navegador
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 bg-slate-50/70 text-slate-700 text-xs md:text-sm">
          {/* Sucesso do download */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-sm mb-0.5">Download Local Concluído!</strong>
              <p className="text-xs text-emerald-800 leading-relaxed">
                O arquivo <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">ficha-oftalmo-hva.html</code> foi gerado e salvo diretamente na sua pasta <strong>Downloads</strong>.
              </p>
            </div>
          </div>

          {/* Explicação do erro do cookie */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Por que apareceu aquele aviso de "verificação de cookie"?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              No celular, o botão de download anterior ativou o gerenciador de downloads externo do Android, que não tinha o login do Google aberto — por isso ele baixou a tela de bloqueio do Google. <strong>Agora corrigimos isso:</strong> o arquivo é gerado diretamente pela memória do aplicativo, garantindo que o arquivo baixado seja 100% a sua ficha oftalmológica completa!
            </p>
          </div>

          {/* Dicas de abertura */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <span>💡</span> Como Usar no Dia a Dia:
            </h4>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-800 font-semibold text-xs">No Celular:</strong>
                  <p className="text-xs text-slate-600">
                    Abra o app <strong>"Arquivos"</strong> ou <strong>"Downloads"</strong> do seu celular, toque em <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">ficha-oftalmo-hva.html</code> e escolha abrir com o <strong>Google Chrome</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Laptop className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-800 font-semibold text-xs">No Computador da Clínica:</strong>
                  <p className="text-xs text-slate-600">
                    Envie o arquivo para o computador ou transfira por pendrive. Dê dois cliques e ele abre em tela cheia no Chrome ou Edge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-blue-950 font-bold text-xs">Dica Prática (Instalar como App):</strong>
                  <p className="text-xs text-blue-900">
                    No Chrome do celular, toque nos <strong>3 pontinhos</strong> no topo à direita e selecione <strong>"Adicionar à tela inicial"</strong>. O app ficará como um ícone no seu celular, sem depender de arquivo avulso!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={onBaixarNovamente}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Novamente</span>
            </button>

            {htmlContent && (
              <button
                onClick={copiarCodigo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all active:scale-95"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? 'Código Copiado!' : 'Copiar Código HTML'}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold ml-auto transition-all"
          >
            Entendi / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
