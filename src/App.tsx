/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Patient,
  LocationInfo,
  EyeExamData,
  ComplementaryExamData,
  ConsultaSummary,
  FichaPaciente,
  Atendimento,
} from './types';
import { FichasDB, hojeISO, novoId, normalizarTexto, fmtData } from './services/db';
import { RASCUNHO_KEY } from './utils/constants';
import { gerarRelatorioTutorHTML, gerarRelatorioProntuario } from './utils/formatters';

import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Section } from './components/Section';
import { PatientSection } from './components/PatientSection';
import { RecordingSection } from './components/RecordingSection';
import { EyeExamSection } from './components/EyeExamSection';
import { ComplementaryExamsSection } from './components/ComplementaryExamsSection';
import { TreatmentSection } from './components/TreatmentSection';

import { TextModal } from './components/modals/TextModal';
import { ReceitaModal } from './components/modals/ReceitaModal';
import { RelatorioModal } from './components/modals/RelatorioModal';
import { BuscaFichasModal } from './components/modals/BuscaFichasModal';
import { FotoOutroCelularModal } from './components/modals/FotoOutroCelularModal';

import { FileQuestion, Eye, FileText, Pill, Printer, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';

export default function App() {
  const [patient, setPatient] = useState<Patient>({
    nome: '',
    especie: '',
    raca: '',
    sexo: '',
    idade: '',
    tutor: '',
  });

  const [location, setLocation] = useState<LocationInfo>({
    data: hojeISO(),
    tipoConsulta: 'Consulta',
  });

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [queixaModalOpen, setQueixaModalOpen] = useState(false);

  const [examsOD, setExamsOD] = useState<EyeExamData>({});
  const [examsOE, setExamsOE] = useState<EyeExamData>({});
  const [examesComplementares, setExamesComplementares] = useState<ComplementaryExamData>({});

  const [tratamentoOral, setTratamentoOral] = useState('');
  const [tratamentoOD, setTratamentoOD] = useState('');
  const [tratamentoOE, setTratamentoOE] = useState('');
  const [retornoOuAlta, setRetornoOuAlta] = useState('');

  const [diagnostico, setDiagnostico] = useState('');
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);

  const [consulta, setConsulta] = useState<ConsultaSummary | null>(null);

  const [receitaModalOpen, setReceitaModalOpen] = useState(false);
  const [relatorioTutorOpen, setRelatorioTutorOpen] = useState(false);
  const [relatorioProntuarioOpen, setRelatorioProntuarioOpen] = useState(false);
  const [fotoCelularOpen, setFotoCelularOpen] = useState(false);

  /* Fichas salvas & Estado de persistência */
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [atendId, setAtendId] = useState<string | null>(null);
  const [fichaAtual, setFichaAtual] = useState<FichaPaciente | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [gravandoAgora, setGravandoAgora] = useState(false);

  const snapshotRef = useRef<string | null>(null);
  const avisoTimer = useRef<any>(null);

  function montarDados(): Atendimento {
    return {
      id: atendId || novoId(),
      data: location.data || hojeISO(),
      patient,
      location,
      chiefComplaint,
      examsOD,
      examsOE,
      examesComplementares,
      tratamentoOral,
      tratamentoOD,
      tratamentoOE,
      retornoOuAlta,
      diagnostico,
      consulta,
    };
  }

  const montarRef = useRef(montarDados);
  montarRef.current = montarDados;

  const estaSujo = () => JSON.stringify(montarRef.current()) !== snapshotRef.current;

  function mostrarAviso(texto: string, erro = false) {
    setAviso({ texto, erro });
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 4000);
  }

  useEffect(() => {
    snapshotRef.current = JSON.stringify(montarRef.current());
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
      }
    } catch {}

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (estaSujo()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (snapshotRef.current === null) {
        snapshotRef.current = JSON.stringify(montarRef.current());
      }
      setSujo(estaSujo());
    }, 400);
    return () => clearTimeout(timer);
  }, [
    patient,
    location,
    chiefComplaint,
    examsOD,
    examsOE,
    examesComplementares,
    tratamentoOral,
    tratamentoOD,
    tratamentoOE,
    retornoOuAlta,
    diagnostico,
    consulta,
  ]);

  function aplicar(
    d: Partial<Atendimento>,
    novoFichaId: string | null,
    novoAtendId: string | null,
    ficha: FichaPaciente | null
  ) {
    const dados: Atendimento = {
      id: novoAtendId || novoId(),
      data: d.location?.data || hojeISO(),
      patient: {
        nome: '',
        especie: '',
        raca: '',
        sexo: '',
        idade: '',
        tutor: '',
        ...(d.patient || {}),
      },
      location: {
        data: hojeISO(),
        tipoConsulta: 'Consulta',
        ...(d.location || {}),
      },
      chiefComplaint: d.chiefComplaint || '',
      examsOD: d.examsOD || {},
      examsOE: d.examsOE || {},
      examesComplementares: d.examesComplementares || {},
      tratamentoOral: d.tratamentoOral || '',
      tratamentoOD: d.tratamentoOD || '',
      tratamentoOE: d.tratamentoOE || '',
      retornoOuAlta: d.retornoOuAlta || '',
      diagnostico: d.diagnostico || '',
      consulta: d.consulta || null,
    };

    snapshotRef.current = JSON.stringify(dados);
    try {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(''));
    } catch {}

    setPatient(dados.patient);
    setLocation(dados.location);
    setChiefComplaint(dados.chiefComplaint);
    setExamsOD(dados.examsOD);
    setExamsOE(dados.examsOE);
    setExamesComplementares(dados.examesComplementares);
    setTratamentoOral(dados.tratamentoOral);
    setTratamentoOD(dados.tratamentoOD);
    setTratamentoOE(dados.tratamentoOE);
    setRetornoOuAlta(dados.retornoOuAlta || '');
    setDiagnostico(dados.diagnostico);
    setConsulta(dados.consulta);

    setFichaId(novoFichaId);
    setAtendId(novoAtendId);
    setFichaAtual(ficha || null);
    setSujo(false);
    setFormKey((k) => k + 1);

    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }

  async function salvar(): Promise<boolean> {
    if (!patient.nome.trim()) {
      mostrarAviso('⚠️ Preencha pelo menos o nome do paciente para salvar a ficha.', true);
      return false;
    }

    setSalvando(true);
    try {
      let ficha = fichaId ? await FichasDB.obter(fichaId) : null;

      if (!ficha) {
        const todas = await FichasDB.listar();
        const dup = todas.find(
          (f) =>
            normalizarTexto(f.paciente?.nome) === normalizarTexto(patient.nome) &&
            normalizarTexto(f.paciente?.tutor) === normalizarTexto(patient.tutor)
        );

        if (
          dup &&
          window.confirm(
            `Já existe uma ficha cadastrada para ${dup.paciente.nome}${
              dup.paciente.tutor ? ' (tutor: ' + dup.paciente.tutor + ')' : ''
            }, contendo ${dup.atendimentos.length} atendimento(s).\n\nClique em OK para adicionar este atendimento à ficha existente, ou Cancelar para criar uma ficha nova separada.`
          )
        ) {
          ficha = dup;
        } else {
          ficha = {
            id: novoId(),
            criadoEm: Date.now(),
            paciente: { ...patient },
            atendimentos: [],
          };
        }
      }

      const loc: LocationInfo = { ...location, data: location.data || hojeISO() };
      if (!location.data) setLocation(loc);

      const id = atendId || novoId();
      const registro: Atendimento = { ...montarDados(), id, data: loc.data, location: loc };

      const idx = ficha.atendimentos.findIndex((a) => a.id === id);
      if (idx >= 0) {
        ficha.atendimentos[idx] = registro;
      } else {
        ficha.atendimentos.push(registro);
      }

      ficha.atendimentos.sort((a, b) => String(a.data).localeCompare(String(b.data)));
      if (ficha.atendimentos[ficha.atendimentos.length - 1].id === id || !ficha.paciente) {
        ficha.paciente = { ...patient };
      }
      ficha.atualizadoEm = Date.now();

      await FichasDB.salvar(ficha);
      snapshotRef.current = JSON.stringify(registro);
      setFichaId(ficha.id);
      setAtendId(id);
      setFichaAtual(ficha);
      setSujo(false);

      mostrarAviso(
        `✅ Ficha salva com sucesso neste dispositivo (${ficha.atendimentos.length} atendimento${
          ficha.atendimentos.length > 1 ? 's' : ''
        }).`
      );
      return true;
    } catch (e: any) {
      mostrarAviso('❌ Falha ao salvar: ' + (e.message || 'erro no banco de dados local'), true);
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarSaida(): Promise<boolean> {
    if (gravandoAgora) {
      window.alert('Uma gravação está em andamento. Conclua ou pare a gravação antes de mudar de ficha.');
      return false;
    }
    if (!estaSujo()) return true;

    if (window.confirm('Existem alterações não salvas nesta ficha.\n\nOK = Salvar antes de sair\nCancelar = Continuar sem salvar')) {
      return await salvar();
    }
    return window.confirm('Tem certeza de que deseja descartar as alterações não salvas?');
  }

  async function novaConsulta() {
    if (!(await confirmarSaida())) return;
    aplicar({}, null, null, null);
    mostrarAviso('Nova ficha em branco iniciada.');
  }

  async function carregarExemplo() {
    if (!(await confirmarSaida())) return;
    aplicar(
      {
        patient: {
          nome: 'Thor',
          especie: 'Canina',
          raca: 'Shih-tzu',
          sexo: 'Macho',
          idade: '6 anos',
          tutor: 'Carlos Silva',
        },
        location: {
          data: hojeISO(),
          tipoConsulta: 'Primeira Consulta',
        },
        chiefComplaint:
          'Tutor relata olho direito vermelho e irritado há 3 dias, piscando com frequência (blefaroespasmo) e com secreção mucosa abundante. Sem melhora com soro caseiro.',
        examsOD: {
          schirmer: '8',
          pio: '14',
          conjuntiva: 'hiperêmica moderada com secreção mucosa',
          cornea: 'descontinuidade epitelial paracentral em terço inferior, neovascularização incipiente',
          fluoresceina: 'positivo em área de 3mm no terço inferior',
        },
        examsOE: {
          schirmer: '19',
          pio: '15',
          conjuntiva: '',
          cornea: '',
        },
        tratamentoOral: 'Cefalexina comp 500mg, 1/2, bid, 10d',
        tratamentoOD: 'Tobramicina 0,3% tid 10d\nPomada Ciclosporina 1% bid 30d',
        tratamentoOE: 'Lubrificante colírio tid uso contínuo',
        retornoOuAlta: 'Retorno em 7 dias para novo teste de fluoresceína e reavaliação corneana.',
        diagnostico:
          'Ceratoconjuntivite Seca (CCS) e Úlcera de Córnea Superficial em Olho Direito (OD). Olho esquerdo hígido com boa produção lacrimal.',
        consulta: {
          resumo:
            'Thor (Shih-tzu, 6 anos) atendido com blefaroespasmo e secreção em olho direito há 3 dias. Ao exame oftalmológico, constatou-se baixa produção lacrimal em OD (Schirmer 8 mm/min) e defeito epitelial corneano fluoresceína-positivo. Olho esquerdo normal (Schirmer 19 mm/min, PIO 15 mmHg). Prescrito antibiótico tópico, imunomodulador e cefalexina oral, com uso imprescindível de colar elizabetano.',
          topicos: [
            {
              titulo: 'Queixa e Histórico',
              itens: ['Olho direito vermelho e com secreção há 3 dias', 'Esfrega a pata no olho'],
            },
            {
              titulo: 'Achados do Exame',
              itens: [
                'Schirmer OD: 8 mm/min (baixa produção lacrimal)',
                'Schirmer OE: 19 mm/min (normal)',
                'Fluoresceína OD positiva (úlcera superficial 3mm)',
                'PIO OD 14 mmHg / OE 15 mmHg (normotensão)',
              ],
            },
            {
              titulo: 'Diagnóstico',
              itens: ['Ceratoconjuntivite Seca (CCS) OD', 'Úlcera de Córnea Superficial OD'],
            },
            {
              titulo: 'Tratamento Prescrito',
              itens: [
                'Tobramicina 0,3% colírio (OD, 3x ao dia, 10 dias)',
                'Ciclosporina 1% (OD, 2x ao dia, 30 dias)',
                'Cefalexina 500mg oral (1/2 comprimido a cada 12h, 10 dias)',
                'Colar elizabetano 24h por dia',
              ],
            },
            {
              titulo: 'Retorno',
              itens: ['Reavaliação em 7 dias para novo teste de fluoresceína'],
            },
          ],
          transcricao:
            'Veterinário: Boa tarde, Carlos! O que está acontecendo com o Thor?\nTutor: Boa tarde, Dr. Adélio! Ele começou há uns 3 dias a piscar muito o olho direito e tá saindo uma secreção esbranquiçada...\nVeterinário: Vamos examinar. Vamos colocar a tirinha do teste de Schirmer primeiro... No olho direito deu 8 mm, que é bem abaixo de 15, indicando olho seco. No olho esquerdo deu 19, que é normal.\nTutor: E essa manchinha verde que o senhor colocou agora?\nVeterinário: Esse é o teste de fluoresceína, corou verde no olho direito, indicando uma úlcera de córnea superficial. Vamos tratar com colírio antibiótico, medicação para o olho seco e colar protetor!',
          queixa:
            'Olho direito vermelho e irritado há 3 dias, piscando com frequência e com secreção mucosa abundante.',
          diagnostico:
            'Ceratoconjuntivite Seca (CCS) e Úlcera de Córnea Superficial em Olho Direito (OD).',
          geradoEm: new Date().toLocaleString('pt-BR'),
        },
      },
      null,
      null,
      null
    );
    mostrarAviso('🧪 Exemplo do paciente Thor carregado! Experimente os relatórios e receituário.');
  }

  function abrirRetorno(ficha: FichaPaciente) {
    aplicar(
      {
        patient: ficha.paciente,
        location: { data: hojeISO(), tipoConsulta: 'Retorno' },
      },
      ficha.id,
      null,
      ficha
    );
    mostrarAviso(`Novo retorno iniciado para ${ficha.paciente.nome}. Preencha e salve a ficha.`);
  }

  async function abrirFicha(ficha: FichaPaciente, idAtend?: string) {
    if (!(await confirmarSaida())) return;
    const f = (await FichasDB.obter(ficha.id)) || ficha;
    const at =
      (idAtend && f.atendimentos.find((a) => a.id === idAtend)) ||
      f.atendimentos[f.atendimentos.length - 1];

    if (!at) return;
    aplicar({ ...at, patient: at.patient || f.paciente }, f.id, at.id, f);
    setBuscaAberta(false);
  }

  async function novoRetornoDe(ficha: FichaPaciente) {
    if (!(await confirmarSaida())) return;
    const f = (await FichasDB.obter(ficha.id)) || ficha;
    abrirRetorno(f);
    setBuscaAberta(false);
  }

  function fichaExcluida(id: string) {
    if (id === fichaId) {
      setFichaId(null);
      setAtendId(null);
      setFichaAtual(null);
      snapshotRef.current = '';
      setSujo(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/80 p-3 sm:p-5 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <Header />

        <Toolbar
          onSalvar={salvar}
          onNovaConsulta={novaConsulta}
          onCarregarExemplo={carregarExemplo}
          onBuscarFichas={() => setBuscaAberta(true)}
          onConectarCelular={() => setFotoCelularOpen(true)}
          sujo={sujo}
          fichaId={fichaId}
          atendId={atendId}
          fichaAtual={fichaAtual}
          onAbrirAtendimento={abrirFicha}
          onNovoRetorno={novoRetornoDe}
          salvando={salvando}
        />

        <main key={formKey} className="space-y-5">
          <PatientSection
            patient={patient}
            location={location}
            onPatientChange={(field, val) => setPatient((p) => ({ ...p, [field]: val }))}
            onLocationChange={(field, val) => setLocation((l) => ({ ...l, [field]: val }))}
            onAplicarDadosCompletos={(novosDados, tipoConsulta) => {
              setPatient((p) => ({ ...p, ...novosDados }));
              if (tipoConsulta) {
                setLocation((l) => ({ ...l, tipoConsulta }));
              }
              mostrarAviso(`✨ Dados de ${novosDados.nome || 'paciente'} preenchidos pela foto da tela!`);
            }}
          />

          <RecordingSection
            patient={patient}
            consulta={consulta}
            setConsulta={setConsulta}
            chiefComplaint={chiefComplaint}
            diagnostico={diagnostico}
            onQueixa={(texto, replace) =>
              setChiefComplaint((prev) => (replace || !prev.trim() ? texto : `${prev}\n${texto}`))
            }
            onDiagnostico={(texto, replace) =>
              setDiagnostico((prev) => (replace || !prev.trim() ? texto : `${prev}\n${texto}`))
            }
            onTratamentoOral={(texto) =>
              setTratamentoOral((prev) => (prev && prev.trim() ? `${prev}\n${texto}` : texto))
            }
            onTratamentoOD={(texto) =>
              setTratamentoOD((prev) => (prev && prev.trim() ? `${prev}\n${texto}` : texto))
            }
            onTratamentoOE={(texto) =>
              setTratamentoOE((prev) => (prev && prev.trim() ? `${prev}\n${texto}` : texto))
            }
            onRetornoOuAlta={(texto) =>
              setRetornoOuAlta((prev) => (prev && prev.trim() ? `${prev}\n${texto}` : texto))
            }
            onGravando={setGravandoAgora}
            permitirRascunho={!fichaId}
          />

          {/* Queixa Principal */}
          <Section
            title="Queixa Principal & Histórico"
            icon={<FileQuestion className="w-5 h-5 text-blue-600" />}
            subtitle="Clique no campo para expandir o editor detalhado"
          >
            <div
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all min-h-[75px] flex items-center shadow-2xs"
              onClick={() => setQueixaModalOpen(true)}
            >
              {chiefComplaint ? (
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {chiefComplaint}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Toque aqui para digitar a queixa principal e histórico relatado pelo tutor...
                </p>
              )}
            </div>
          </Section>

          <EyeExamSection
            examsOD={examsOD}
            setExamsOD={setExamsOD}
            examsOE={examsOE}
            setExamsOE={setExamsOE}
          />

          <ComplementaryExamsSection
            dados={examesComplementares}
            setDados={setExamesComplementares}
          />

          <TreatmentSection
            tratamentoOral={tratamentoOral}
            setTratamentoOral={setTratamentoOral}
            tratamentoOD={tratamentoOD}
            setTratamentoOD={setTratamentoOD}
            tratamentoOE={tratamentoOE}
            setTratamentoOE={setTratamentoOE}
            retornoOuAlta={retornoOuAlta}
            setRetornoOuAlta={setRetornoOuAlta}
          />

          {/* Diagnóstico */}
          <Section
            title="Diagnóstico Definitivo / Suspeita Clínica"
            icon={<Eye className="w-5 h-5 text-blue-600" />}
            subtitle="Conclusão do exame oftalmológico ou hipóteses diagnósticas"
          >
            <div
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all min-h-[75px] flex items-center shadow-2xs"
              onClick={() => setDiagnosticoModalOpen(true)}
            >
              {diagnostico ? (
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                  {diagnostico}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Toque aqui para inserir o diagnóstico, achados conclusivos e conduta...
                </p>
              )}
            </div>
          </Section>

          {/* Ações Finais / Documentos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap gap-3.5 items-center justify-center">
            <button
              onClick={() => setReceitaModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              <Pill className="w-4 h-4" />
              <span>Gerar Receituário</span>
            </button>

            <button
              onClick={() => setRelatorioTutorOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              <span>Relatório para o Tutor</span>
            </button>

            <button
              onClick={() => setRelatorioProntuarioOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>Relatório Prontuário Médico</span>
            </button>
          </div>
        </main>
      </div>

      {/* Modals */}
      <TextModal
        isOpen={queixaModalOpen}
        onClose={() => setQueixaModalOpen(false)}
        title="Queixa Principal & Histórico"
        value={chiefComplaint}
        onSave={setChiefComplaint}
        placeholder="Descreva o motivo da consulta, início dos sintomas, tratamentos prévios e evolução..."
      />

      <TextModal
        isOpen={diagnosticoModalOpen}
        onClose={() => setDiagnosticoModalOpen(false)}
        title="Diagnóstico Clínico"
        value={diagnostico}
        onSave={setDiagnostico}
        placeholder="Ex: Ceratoconjuntivite Seca (CCS), Úlcera de córnea superficial, Uveíte anterior..."
      />

      <ReceitaModal
        isOpen={receitaModalOpen}
        onClose={() => setReceitaModalOpen(false)}
        patient={patient}
        location={location}
        tratamentoOD={tratamentoOD}
        tratamentoOE={tratamentoOE}
        tratamentoOral={tratamentoOral}
      />

      <RelatorioModal
        isOpen={relatorioTutorOpen}
        onClose={() => setRelatorioTutorOpen(false)}
        title="Relatório Oftalmológico para o Tutor"
        subtitle="Serviço de Oftalmologia Veterinária - HVA"
        content={gerarRelatorioTutorHTML(
          patient,
          location,
          examsOD,
          examsOE,
          diagnostico,
          tratamentoOral,
          tratamentoOD,
          tratamentoOE,
          retornoOuAlta
        )}
        isHTML={true}
      />

      <RelatorioModal
        isOpen={relatorioProntuarioOpen}
        onClose={() => setRelatorioProntuarioOpen(false)}
        title="Relatório para Prontuário Médico"
        subtitle="Síntese técnica de alterações e conduta"
        content={gerarRelatorioProntuario(
          patient,
          location,
          examsOD,
          examsOE,
          examesComplementares,
          diagnostico,
          consulta,
          tratamentoOral,
          tratamentoOD,
          tratamentoOE,
          retornoOuAlta
        )}
        isHTML={false}
      />

      <FotoOutroCelularModal
        isOpen={fotoCelularOpen}
        onClose={() => setFotoCelularOpen(false)}
        patientName={patient.nome}
        examsOD={examsOD}
        setExamsOD={setExamsOD}
        examsOE={examsOE}
        setExamsOE={setExamsOE}
        examesComplementares={examesComplementares}
        setExamesComplementares={setExamesComplementares}
        onAviso={(m, err) => mostrarAviso(m, err)}
      />

      <BuscaFichasModal
        aberto={buscaAberta}
        onFechar={() => setBuscaAberta(false)}
        onAbrir={abrirFicha}
        onRetorno={novoRetornoDe}
        onExcluida={fichaExcluida}
        onAviso={(m, err) => mostrarAviso(m, err)}
      />

      {/* Notificação Flutuante (Toast) */}
      {aviso && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-2xl text-xs md:text-sm font-semibold shadow-xl text-white max-w-[92vw] flex items-center gap-2 border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            aviso.erro
              ? 'bg-red-600 border-red-500'
              : 'bg-slate-900/95 border-slate-700/80 backdrop-blur-md'
          }`}
        >
          {aviso.erro ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{aviso.texto}</span>
        </div>
      )}
    </div>
  );
}
