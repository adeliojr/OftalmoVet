import React, { useState } from 'react';
import { Smartphone, Monitor, Globe, Copy, Check, X, ShieldCheck, Download, Bookmark, Sparkles, ExternalLink } from 'lucide-react';

interface GuiaUsoDiaADiaModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export const GuiaUsoDiaADiaModal: React.FC<GuiaUsoDiaADiaModalProps> = ({ aberto, onFechar }) => {
  const [copiado, setCopiado] = useState(false);

  if (!aberto) return null;

  // The permanent production link
  const linkApp = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-jx56ceib3juewoi7sshag6-425411440698.us-east5.run.app';

  function handleCopiarLink() {
    navigator.clipboard.writeText(linkApp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6 overflow-y-auto"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-blue-950">
                Como Usar no Seu Dia a Dia (Clínica, Casa e Celular)
              </h3>
              <p className="text-xs text-blue-700">
                Acesse de qualquer computador, tablet ou celular sem precisar instalar nada pesado
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

        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-sm text-slate-700">
          {/* Link Permanente */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block mb-1">
              Seu Link Permanente de Acesso (Online 24h)
            </span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={linkApp}
                className="flex-1 bg-white border border-blue-200 px-3 py-2 rounded-xl text-xs md:text-sm font-mono text-slate-800 select-all"
              />
              <button
                onClick={handleCopiarLink}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              💡 Guarde este link nos seus favoritos ou envie pelo WhatsApp para abrir no celular e no computador da clínica.
            </p>
          </div>

          {/* Comparativo: Por que esta solução é muito superior ao arquivo .HTML do Claude */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Por que este aplicativo online é muito melhor que o arquivo .HTML do Claude?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
              <div className="bg-white p-3 rounded-xl border border-red-100 text-slate-600">
                <span className="font-bold text-red-700 block mb-1">❌ Arquivo .HTML Antigo (Claude):</span>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Você precisava colar chave de API do Gemini no navegador.</li>
                  <li>Não conseguia ler foto de tela de sistema hospitalar.</li>
                  <li>Gravações no celular falhavam por restrições de arquivos locais.</li>
                  <li>Ficava preso no computador onde salvou o arquivo.</li>
                </ul>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-slate-700">
                <span className="font-bold text-emerald-700 block mb-1">✅ Seu Novo Aplicativo (Hospedado no Google):</span>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong>IA Integrada sem dor de cabeça</strong>: transcreve e resume sem você precisar configurar chave.</li>
                  <li><strong>Leitura de Fotos</strong>: tira foto da tela do sistema e preenche o paciente.</li>
                  <li><strong>Funciona em qualquer aparelho</strong>: celular, tablet ou PC da clínica.</li>
                  <li><strong>Player & Download de áudios</strong> para usar no NotebookLM.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Como transformar em aplicativo no Celular (iPhone e Android) */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              Como colocar como Aplicativo no seu Celular ou Tablet (Ícone na tela):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">📱 No iPhone ou iPad (Safari):</span>
                <ol className="list-decimal ml-4 space-y-1.5 text-slate-600">
                  <li>Abra o link do aplicativo no <strong>Safari</strong>.</li>
                  <li>Toque no botão de <strong>Compartilhar</strong> (o ícone de quadrado com seta para cima ⎋ na parte inferior).</li>
                  <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Pronto! Ele vira um ícone na tela do seu celular, abre em tela cheia e funciona rápido como um app da App Store.</li>
                </ol>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">🤖 No Android (Google Chrome):</span>
                <ol className="list-decimal ml-4 space-y-1.5 text-slate-600">
                  <li>Abra o link no <strong>Chrome</strong>.</li>
                  <li>Toque nos <strong>três pontinhos ⋮</strong> no canto superior direito.</li>
                  <li>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>O ícone aparecerá junto aos seus outros aplicativos.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* No Computador da Clínica */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600" />
              No Computador da Clínica (Chrome ou Edge):
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              Basta salvar o link nos seus <strong>Favoritos</strong> (pressione <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-mono">Ctrl + D</kbd>), ou clicar no ícone de computadorzinho com uma setinha no final da barra de endereços do Chrome para <strong>"Instalar Ficha Oftalmológica HVA"</strong> na sua barra de tarefas do Windows ou Mac!
            </p>
          </div>

          {/* Dica de Segurança e Backup */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong className="block text-sm font-bold mb-1">Seus dados ficam seguros no seu dispositivo:</strong>
              Todas as fichas que você salva com o botão verde <strong>Salvar Ficha</strong> ficam armazenadas no banco de dados local do seu navegador. Para ter uma cópia de segurança permanente, clique em <strong>"Buscar Fichas" ➔ "Exportar Backup (JSON)"</strong> uma vez por semana e guarde o arquivo no seu Google Drive ou computador!
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Dúvidas? Dr. Adélio Gurgel do Amaral Jr. · CRMV-SP 18.721
          </span>
          <button
            onClick={onFechar}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Entendi, fechar guia
          </button>
        </div>
      </div>
    </div>
  );
};
