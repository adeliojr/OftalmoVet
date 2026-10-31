import React, { useState } from 'react';
import { Save, PlusCircle, Search, UserCheck, Calendar, Clock, AlertTriangle, CheckCircle2, FlaskConical, Download, Smartphone, Loader2 } from 'lucide-react';
import { FichaPaciente } from '../types';
import { fmtData } from '../services/db';
import { AjudaHTMLModal } from './modals/AjudaHTMLModal';

interface ToolbarProps {
  onSalvar: () => void;
  onNovaConsulta: () => void;
  onCarregarExemplo?: () => void;
  onBuscarFichas: () => void;
  onConectarCelular?: () => void;
  sujo: boolean;
  fichaId: string | null;
  atendId: string | null;
  fichaAtual: FichaPaciente | null;
  onAbrirAtendimento: (ficha: FichaPaciente, atendId: string) => void;
  onNovoRetorno: (ficha: FichaPaciente) => void;
  salvando?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSalvar,
  onNovaConsulta,
  onCarregarExemplo,
  onBuscarFichas,
  onConectarCelular,
  sujo,
  fichaId,
  atendId,
  fichaAtual,
  onAbrirAtendimento,
  onNovoRetorno,
  salvando,
}) => {
  const [modalAjudaAberta, setModalAjudaAberta] = useState(false);
  const [baixandoHTML, setBaixandoHTML] = useState(false);
  const [conteudoHTML, setConteudoHTML] = useState('');

  async function baixarHTMLDireto() {
    setBaixandoHTML(true);
    try {
      // Busca o arquivo dentro da sessão autenticada do app
      let texto = '';
      try {
        const res = await fetch('/api/html-content');
        if (res.ok) texto = await res.text();
      } catch {}

      if (!texto) {
        const res2 = await fetch('/ficha-oftalmo-hva.html');
        if (res2.ok) texto = await res2.text();
      }

      if (!texto) {
        throw new Error('Não foi possível obter o código do arquivo.');
      }

      setConteudoHTML(texto);

      // Cria Blob diretamente na memória do navegador (evita o gerenciador de downloads do Android que perde o cookie)
      const blob = new Blob([texto], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ficha-oftalmo-hva.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      setModalAjudaAberta(true);
    } catch (err: any) {
      alert('Não foi possível baixar o arquivo: ' + err.message);
    } finally {
      setBaixandoHTML(false);
    }
  }
  return (
    <div className="sticky top-2 z-30 mb-5 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/90 p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{salvando ? 'Salvando...' : 'Salvar Ficha'}</span>
        </button>

        <button
          onClick={onNovaConsulta}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Consulta</span>
        </button>

        {onCarregarExemplo && (
          <button
            onClick={onCarregarExemplo}
            title="Preencher com um caso de teste para experimentar as funções do app"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-sm border border-purple-200/80 transition-all active:scale-[0.98]"
          >
            <FlaskConical className="w-4 h-4 text-purple-600" />
            <span>Exemplo de Teste</span>
          </button>
        )}

        <button
          onClick={onBuscarFichas}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm border border-slate-200 transition-all active:scale-[0.98]"
        >
          <Search className="w-4 h-4 text-slate-500" />
          <span>Buscar Fichas</span>
        </button>

        {onConectarCelular && (
          <button
            onClick={onConectarCelular}
            title="Conectar câmera de outro celular para enviar fotos diretamente para este prontuário"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm border border-blue-200 transition-all active:scale-[0.98]"
          >
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>Fotos do 2º Celular</span>
          </button>
        )}

        <button
          onClick={baixarHTMLDireto}
          disabled={baixandoHTML}
          title="Baixar arquivo .HTML avulso para abrir no seu navegador sem precisar de internet ou conta"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs md:text-sm border border-slate-200 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {baixandoHTML ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-slate-500" />
          )}
          <span>{baixandoHTML ? 'Gerando...' : 'Baixar .HTML'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-1">
          {sujo ? (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/70">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {fichaId ? 'Alterações não salvas' : 'Ficha nova (ainda não salva)'}
            </span>
          ) : (
            fichaId && (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/70">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Salva neste dispositivo
              </span>
            )
          )}
        </div>
      </div>

      {fichaId && fichaAtual && (
        <div className="flex flex-wrap items-center gap-2 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200/70 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>{fichaAtual.paciente.nome || 'Paciente'}</span>
            <span className="text-indigo-500 font-normal">
              ({fichaAtual.atendimentos.length} atendimento{fichaAtual.atendimentos.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <select
              className="border border-indigo-200 rounded-lg px-2 py-1 bg-white text-indigo-900 text-xs font-medium focus:ring-2 focus:ring-indigo-400"
              value={atendId || ''}
              onChange={(e) => onAbrirAtendimento(fichaAtual, e.target.value)}
            >
              {!atendId && <option value="">(novo atendimento em edição)</option>}
              {[...fichaAtual.atendimentos].reverse().map((a) => (
                <option key={a.id} value={a.id}>
                  {fmtData(a.data)} {a.location?.tipoConsulta ? `— ${a.location.tipoConsulta}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNovoRetorno(fichaAtual)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Clock className="w-3 h-3" />
            <span>+ Retorno</span>
          </button>
        </div>
      )}

      <AjudaHTMLModal
        isOpen={modalAjudaAberta}
        onClose={() => setModalAjudaAberta(false)}
        onBaixarNovamente={baixarHTMLDireto}
        htmlContent={conteudoHTML}
      />
    </div>
  );
};
