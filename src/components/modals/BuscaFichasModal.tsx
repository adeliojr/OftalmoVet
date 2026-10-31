import React, { useState, useEffect } from 'react';
import { FichaPaciente } from '../../types';
import { FichasDB, fmtData, hojeISO, normalizarTexto } from '../../services/db';
import {
  Search,
  Download,
  Upload,
  Trash2,
  X,
  User,
  Calendar,
  Clock,
  FolderOpen,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface BuscaFichasModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAbrir: (ficha: FichaPaciente, atendId?: string) => void;
  onRetorno: (ficha: FichaPaciente) => void;
  onExcluida: (id: string) => void;
  onAviso: (msg: string, erro?: boolean) => void;
}

export const BuscaFichasModal: React.FC<BuscaFichasModalProps> = ({
  aberto,
  onFechar,
  onAbrir,
  onRetorno,
  onExcluida,
  onAviso,
}) => {
  const [fichas, setFichas] = useState<FichaPaciente[]>([]);
  const [q, setQ] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function recarregar() {
    setCarregando(true);
    setErro('');
    try {
      const lista = await FichasDB.listar();
      setFichas(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar fichas');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (aberto) {
      setQ('');
      recarregar();
    }
  }, [aberto]);

  if (!aberto) return null;

  const termos = normalizarTexto(q).split(/\s+/).filter(Boolean);

  const lista = fichas
    .map((f) => {
      const p = f.paciente || {};
      const ats = f.atendimentos || [];
      const texto = normalizarTexto(
        [
          p.nome,
          p.tutor,
          p.especie,
          p.raca,
          ...ats.map((a) =>
            [
              a.patient && [a.patient.nome, a.patient.tutor, a.patient.especie, a.patient.raca].join(' '),
              a.diagnostico,
              a.chiefComplaint,
              a.location && a.location.tipoConsulta,
              a.consulta && a.consulta.resumo,
              fmtData(a.data),
            ].join(' ')
          ),
        ].join(' ')
      );
      return { f, texto };
    })
    .filter((x) => termos.every((t) => x.texto.includes(t)))
    .sort((a, b) => (b.f.atualizadoEm || 0) - (a.f.atualizadoEm || 0))
    .map((x) => x.f);

  async function excluir(f: FichaPaciente) {
    const nome = f.paciente?.nome || 'sem nome';
    const total = f.atendimentos?.length || 1;
    if (
      !window.confirm(
        `Excluir permanentemente a ficha de ${nome} com TODOS os ${total} atendimento(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await FichasDB.excluir(f.id);
      onExcluida(f.id);
      await recarregar();
      onAviso('Ficha excluída com sucesso.');
    } catch (e: any) {
      setErro(e.message || 'Erro ao excluir ficha');
    }
  }

  async function handleBackup() {
    try {
      const todas = await FichasDB.listar();
      const payload = {
        app: 'oftalmovet-hva',
        versao: 2,
        exportadoEm: new Date().toISOString(),
        fichas: todas,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fichas-oftalmovet-hva-${hojeISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      onAviso(`Backup de ${todas.length} fichas gerado com sucesso.`);
    } catch (e: any) {
      setErro(e.message || 'Erro ao gerar backup');
    }
  }

  async function handleRestaurar(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;

    try {
      const texto = await arq.text();
      const dados = JSON.parse(texto);
      const novas: FichaPaciente[] = Array.isArray(dados) ? dados : dados.fichas;

      if (!Array.isArray(novas) || !novas.every((f) => f && f.id && f.paciente && Array.isArray(f.atendimentos))) {
        throw new Error('O arquivo selecionado não contém um formato de backup válido de fichas.');
      }

      if (
        !window.confirm(
          `Restaurar ${novas.length} ficha(s) do backup? Fichas com mesmo ID serão mantidas com a versão mais recente.`
        )
      ) {
        return;
      }

      const atuais = await FichasDB.listar();
      let restauradas = 0;
      for (const f of novas) {
        const existente = atuais.find((x) => x.id === f.id);
        if (!existente || (f.atualizadoEm || 0) >= (existente.atualizadoEm || 0)) {
          await FichasDB.salvar(f);
          restauradas++;
        }
      }

      await recarregar();
      onAviso(`Backup restaurado: ${restauradas} ficha(s) importada(s).`);
    } catch (err: any) {
      setErro(err.message || 'Falha ao restaurar o backup.');
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start justify-center p-3 md:p-6 overflow-y-auto"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-slate-900">Buscar Fichas Salvas</h3>
              <p className="text-xs text-slate-500">Histórico de pacientes e atendimentos no dispositivo</p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            onClick={onFechar}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              autoFocus
              className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Buscar por paciente, tutor, espécie, raça, diagnóstico, data..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              {carregando ? 'Carregando banco de dados...' : `${lista.length} de ${fichas.length} ficha(s)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
                onClick={handleBackup}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar Backup</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleRestaurar}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3 bg-slate-50/60">
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {!carregando && fichas.length === 0 && !erro && (
            <div className="text-center py-10 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 stroke-1 text-slate-300" />
              <p className="text-sm font-medium">Nenhuma ficha salva neste dispositivo ainda.</p>
              <p className="text-xs text-slate-400">Preencha um atendimento e clique em "Salvar Ficha".</p>
            </div>
          )}

          {!carregando && fichas.length > 0 && lista.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhuma ficha corresponde aos termos da pesquisa "{q}".
            </div>
          )}

          {lista.map((f) => {
            const ats = [...(f.atendimentos || [])].reverse();
            const ultimo = ats[0] || {};
            return (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-blue-950">
                        {f.paciente.nome || 'Sem nome'}
                      </h4>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {[f.paciente.especie, f.paciente.raca].filter(Boolean).join(' · ') || 'Espécie não informada'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        <strong>Tutor:</strong> {f.paciente.tutor || '—'}
                      </span>
                      <span>
                        <strong>Total:</strong> {ats.length} atendimento(s)
                      </span>
                      <span>
                        <strong>Último:</strong> {fmtData(ultimo.data)}
                      </span>
                    </div>

                    {ultimo.diagnostico && (
                      <div className="text-xs text-slate-700 mt-2 bg-slate-50 border border-slate-100 p-2 rounded-lg line-clamp-2">
                        <span className="font-semibold text-slate-900">Último Dx:</span> {ultimo.diagnostico}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                      onClick={() => onAbrir(f, ultimo.id)}
                    >
                      Abrir Ficha
                    </button>

                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                      onClick={() => onRetorno(f)}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>+ Retorno</span>
                    </button>

                    <button
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 transition-colors"
                      onClick={() => excluir(f)}
                      title="Excluir ficha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {ats.length > 1 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Histórico:</span>
                    {ats.map((a) => (
                      <button
                        key={a.id}
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors"
                        onClick={() => onAbrir(f, a.id)}
                      >
                        {fmtData(a.data)}
                        {a.location?.tipoConsulta ? ` · ${a.location.tipoConsulta}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-white border-t border-slate-100 flex justify-end">
          <button
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
            onClick={onFechar}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
