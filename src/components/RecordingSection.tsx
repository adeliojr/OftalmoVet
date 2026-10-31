import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  FileAudio,
  Eye,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Download,
  ClipboardPaste,
  Pill,
  CalendarCheck,
  Layers,
  Clock,
  RefreshCw,
  Loader2,
  Volume2,
} from 'lucide-react';
import { ConsultaSummary, GeminiConfig, Patient, SegmentoAudio } from '../types';
import { CFG_KEY, MODELO_PADRAO, PROMPT_PADRAO, RASCUNHO_KEY } from '../utils/constants';
import { blobParaBase64, fmtTempo, mimeSeguro } from '../utils/formatters';
import {
  checkGeminiStatus,
  converterAudioParaMp3,
  resumirConsulta,
  transcreverAudio,
} from '../services/geminiClient';
import { ConfigGeminiModal } from './modals/ConfigGeminiModal';
import { ColarNotebookModal } from './modals/ColarNotebookModal';
import { Section } from './Section';

const DURACAO_BLOCO_SEGUNDOS = 300; // 5 minutos = 300 segundos

function base64ToBlob(base64: string, mimeType: string = 'audio/mp3'): Blob {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function baixarBlobMp3(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo.endsWith('.mp3') ? nomeArquivo : `${nomeArquivo}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

interface RecordingSectionProps {
  patient: Patient;
  consulta: ConsultaSummary | null;
  setConsulta: React.Dispatch<React.SetStateAction<ConsultaSummary | null>>;
  chiefComplaint: string;
  diagnostico: string;
  onQueixa: (texto: string, replace?: boolean) => void;
  onDiagnostico: (texto: string, replace?: boolean) => void;
  onTratamentoOral?: (texto: string) => void;
  onTratamentoOD?: (texto: string) => void;
  onTratamentoOE?: (texto: string) => void;
  onRetornoOuAlta?: (texto: string) => void;
  onGravando: (gravando: boolean) => void;
  permitirRascunho: boolean;
}

export const RecordingSection: React.FC<RecordingSectionProps> = ({
  patient,
  consulta,
  setConsulta,
  chiefComplaint,
  diagnostico,
  onQueixa,
  onDiagnostico,
  onTratamentoOral,
  onTratamentoOD,
  onTratamentoOE,
  onRetornoOuAlta,
  onGravando,
  permitirRascunho,
}) => {
  const [cfg, setCfg] = useState<GeminiConfig>(() => {
    try {
      const v = localStorage.getItem(CFG_KEY);
      const parsed = v ? JSON.parse(v) : null;
      if (parsed) {
        if (!parsed.modelo || parsed.modelo === 'gemini-3.8-flash') {
          parsed.modelo = MODELO_PADRAO;
        }
        return parsed;
      }
      return { chave: '', modelo: MODELO_PADRAO, prompt: PROMPT_PADRAO };
    } catch {
      return { chave: '', modelo: MODELO_PADRAO, prompt: PROMPT_PADRAO };
    }
  });

  const [cfgAberto, setCfgAberto] = useState(false);
  const [colarModalAberto, setColarModalAberto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [segundos, setSegundos] = useState(0); // Tempo total da consulta
  const [segundosNoBloco, setSegundosNoBloco] = useState(0); // Tempo no bloco atual de 5 min (0 a 300)
  const [blocoAtualNumero, setBlocoAtualNumero] = useState(1);
  const [volumeNivel, setVolumeNivel] = useState(0);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mostrarTranscricao, setMostrarTranscricao] = useState(false);
  const [temChaveServidor, setTemChaveServidor] = useState(false);

  // 5-minute audio segments list
  const [segmentos, setSegmentos] = useState<SegmentoAudio[]>([]);
  const [blocoAbertoId, setBlocoAbertoId] = useState<string | null>(null);

  // Master consultation full audio in MP3 format
  const [masterMp3Blob, setMasterMp3Blob] = useState<Blob | null>(null);
  const [masterMp3Url, setMasterMp3Url] = useState<string | null>(null);
  const [processandoMaster, setProcessandoMaster] = useState(false);

  const [transcricao, setTranscricao] = useState<string>(() => {
    if (consulta?.transcricao) return consulta.transcricao;
    if (permitirRascunho) {
      try {
        const v = localStorage.getItem(RASCUNHO_KEY);
        return v ? JSON.parse(v) : '';
      } catch {
        return '';
      }
    }
    return '';
  });

  // Active refs
  const streamRef = useRef<MediaStream | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentOscRef = useRef<OscillatorNode | null>(null);

  // Buffer for the current 5-min segment
  const currentSegmentChunksRef = useRef<Blob[]>([]);
  // Buffer for the master continuous recording
  const masterAllChunksRef = useRef<Blob[]>([]);

  const gravandoRef = useRef(false);
  const pausadoRef = useRef(false);
  const timerRelRef = useRef<any>(null);
  const inicioGravacaoTotalRef = useRef<number>(0);
  const acumuladoSegundosTotalRef = useRef<number>(0);
  const inicioBlocoRef = useRef<number>(0);
  const acumuladoSegundosBlocoRef = useRef<number>(0);

  const blocoNumeroRef = useRef<number>(1);
  const blocoInicioSecRef = useRef<number>(0);
  const wakeRef = useRef<any>(null);
  const mimeRef = useRef<string>('');
  const transcricaoRef = useRef(transcricao);
  transcricaoRef.current = transcricao;

  // Check server configuration
  useEffect(() => {
    checkGeminiStatus().then((res) => {
      setTemChaveServidor(res.hasServerKey);
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(consulta ? '' : transcricao));
    } catch {}
  }, [transcricao, consulta]);

  useEffect(() => {
    onGravando(gravando);
  }, [gravando, onGravando]);

  useEffect(() => {
    return () => {
      pararTudo();
    };
  }, []);

  function salvarCfg(novaCfg: GeminiConfig) {
    setCfg(novaCfg);
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(novaCfg));
    } catch {}
  }

  const configurado = !!cfg.chave || temChaveServidor;

  function detectarMimeSuportado(): string {
    const tipos = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
    ];
    for (const t of tipos) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  // Update a segment in state
  function atualizarSegmento(id: string, updates: Partial<SegmentoAudio>) {
    setSegmentos((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, ...updates } : seg))
    );
  }

  // Convert and transcribe a single 5-minute segment
  async function processarSegmentoEmSegundoPlano(
    segId: string,
    numero: number,
    tempoInicio: string,
    tempoFim: string,
    blob: Blob
  ) {
    atualizarSegmento(segId, { status: 'convertendo' });
    try {
      const base64 = await blobParaBase64(blob);
      const mime = mimeSeguro(blob.type || mimeRef.current);

      // Step 1: Convert to pure MP3 format via backend ffmpeg
      let mp3Blob: Blob | undefined;
      let mp3Url: string | undefined;
      let base64Mp3: string | undefined;

      try {
        const mp3Res = await converterAudioParaMp3(base64, mime);
        base64Mp3 = mp3Res.mp3Base64;
        mp3Blob = base64ToBlob(base64Mp3, 'audio/mp3');
        mp3Url = URL.createObjectURL(mp3Blob);
        atualizarSegmento(segId, {
          status: 'transcrevendo',
          base64Mp3,
          mp3Blob,
          mp3Url,
        });
      } catch (convErr: any) {
        console.warn('Falha na conversão para MP3 do bloco:', convErr);
        atualizarSegmento(segId, { status: 'transcrevendo' });
      }

      // Step 2: Transcribe via Gemini
      const texto = await transcreverAudio(base64, mime, cfg);
      const textoLimpo = (texto || '').trim();

      if (textoLimpo) {
        const marcadorBloco = `\n\n--- [Bloco ${numero}: ${tempoInicio} às ${tempoFim}] ---\n${textoLimpo}`;
        setTranscricao((prev) => {
          const nova = (prev + marcadorBloco).trim();
          transcricaoRef.current = nova;
          return nova;
        });
      }

      atualizarSegmento(segId, {
        status: 'concluido',
        transcricao: textoLimpo || '[Nenhuma fala identificada neste bloco]',
      });
    } catch (err: any) {
      console.error(`Erro ao processar Bloco ${numero}:`, err);
      atualizarSegmento(segId, {
        status: 'erro',
        erroMsg: err.message || 'Erro na transcrição',
      });
    }
  }

  // Starts recorder for a specific 5-minute segment
  function iniciarGravadorBloco(numero: number, inicioSeg: number) {
    if (!streamRef.current) return;

    currentSegmentChunksRef.current = [];
    blocoNumeroRef.current = numero;
    blocoInicioSecRef.current = inicioSeg;
    setBlocoAtualNumero(numero);
    setSegundosNoBloco(0);
    acumuladoSegundosBlocoRef.current = 0;
    inicioBlocoRef.current = Date.now();

    const opcoes: MediaRecorderOptions = {};
    if (mimeRef.current) opcoes.mimeType = mimeRef.current;
    const rec = new MediaRecorder(streamRef.current, opcoes);

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        currentSegmentChunksRef.current.push(e.data);
        masterAllChunksRef.current.push(e.data);
      }
    };

    rec.start(1000);
    activeRecorderRef.current = rec;
  }

  // Rotates 5-minute segment: stops current segment and seamlessly starts next one
  function rotacionarSegmento5Min() {
    if (!activeRecorderRef.current || !streamRef.current) return;

    const numAtual = blocoNumeroRef.current;
    const inicioSeg = blocoInicioSecRef.current;
    const fimSeg = inicioSeg + DURACAO_BLOCO_SEGUNDOS;
    const tempoInicio = fmtTempo(inicioSeg);
    const tempoFim = fmtTempo(fimSeg);
    const segId = `seg_${numAtual}_${Date.now()}`;

    const oldRec = activeRecorderRef.current;
    const segChunks = [...currentSegmentChunksRef.current];

    // Start next segment immediately so no microphone audio is lost
    const proximoNum = numAtual + 1;
    iniciarGravadorBloco(proximoNum, fimSeg);

    // Stop old segment and flush remaining audio
    oldRec.onstop = () => {
      const type = mimeRef.current || oldRec.mimeType || 'audio/webm';
      const segBlob = new Blob(segChunks, { type });

      const novoSeg: SegmentoAudio = {
        id: segId,
        numero: numAtual,
        tempoInicio,
        tempoFim,
        segundosInicio: inicioSeg,
        segundosFim: fimSeg,
        blobWebm: segBlob,
        status: 'convertendo',
      };

      setSegmentos((prev) => [...prev, novoSeg]);
      setStatus(`⏳ Bloco ${numAtual} (${tempoInicio}-${tempoFim}) gravado! Transcrevendo em segundo plano...`);

      // Launch async MP3 conversion + Gemini transcription
      processarSegmentoEmSegundoPlano(segId, numAtual, tempoInicio, tempoFim, segBlob);
    };

    try {
      oldRec.stop();
    } catch (e) {
      console.warn('Erro ao finalizar recorder do bloco:', e);
    }
  }

  async function iniciar() {
    setErro('');
    if (!configurado) {
      setCfgAberto(true);
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setErro('Este navegador não suporta captura de microfone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Audio monitor + silent oscillator to keep mobile OS background recording alive
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          audioCtxRef.current = actx;

          try {
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            silentOscRef.current = osc;
          } catch {}

          const analyser = actx.createAnalyser();
          analyser.fftSize = 128;
          const source = actx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const monitorarVolume = () => {
            if (!gravandoRef.current) return;
            if (!pausadoRef.current) {
              analyser.getByteFrequencyData(dataArray);
              let soma = 0;
              for (let i = 0; i < dataArray.length; i++) soma += dataArray[i];
              const media = soma / dataArray.length;
              setVolumeNivel(Math.min(100, Math.round((media / 100) * 100)));
            } else {
              setVolumeNivel(0);
            }
            requestAnimationFrame(monitorarVolume);
          };
          requestAnimationFrame(monitorarVolume);
        }
      } catch {}
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErro('O microfone foi bloqueado pelo navegador. Clique no ícone de cadeado ao lado da barra de endereço e altere "Microfone" para "Permitir".');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErro('Nenhum microfone foi encontrado no aparelho.');
      } else {
        setErro(`Não foi possível acessar o microfone (${err.message || err.name}). Verifique as permissões.`);
      }
      return;
    }

    mimeRef.current = detectarMimeSuportado();
    masterAllChunksRef.current = [];
    currentSegmentChunksRef.current = [];
    setSegmentos([]);
    setMasterMp3Blob(null);
    setMasterMp3Url(null);
    setSegundos(0);
    setSegundosNoBloco(0);
    acumuladoSegundosTotalRef.current = 0;
    acumuladoSegundosBlocoRef.current = 0;
    inicioGravacaoTotalRef.current = Date.now();
    inicioBlocoRef.current = Date.now();
    setTranscricao('');
    setConsulta(null);

    // Start segment 1
    iniciarGravadorBloco(1, 0);

    gravandoRef.current = true;
    pausadoRef.current = false;
    setGravando(true);
    setPausado(false);
    setStatus('🎙️ Gravação iniciada! A cada 5 minutos o áudio é dividido e transcrito automaticamente em MP3.');

    try {
      if ('wakeLock' in navigator) {
        wakeRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}

    // Precise 1-second interval tracker
    timerRelRef.current = setInterval(() => {
      if (!pausadoRef.current) {
        const decorridoTotal = Math.floor((Date.now() - inicioGravacaoTotalRef.current) / 1000);
        const tempoTotal = acumuladoSegundosTotalRef.current + decorridoTotal;
        setSegundos(tempoTotal);

        const decorridoBloco = Math.floor((Date.now() - inicioBlocoRef.current) / 1000);
        const tempoBloco = acumuladoSegundosBlocoRef.current + decorridoBloco;
        setSegundosNoBloco(tempoBloco);

        // Check 5-minute threshold (300 seconds)
        if (tempoBloco >= DURACAO_BLOCO_SEGUNDOS) {
          rotacionarSegmento5Min();
        }
      }
    }, 1000);
  }

  function pausar() {
    if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
      try {
        activeRecorderRef.current.pause();
        pausadoRef.current = true;
        setPausado(true);
        acumuladoSegundosTotalRef.current += Math.floor((Date.now() - inicioGravacaoTotalRef.current) / 1000);
        acumuladoSegundosBlocoRef.current += Math.floor((Date.now() - inicioBlocoRef.current) / 1000);
        setStatus('⏸️ Gravação pausada. Clique em "Retomar" para continuar a consulta.');
      } catch {}
    }
  }

  function retomar() {
    if (activeRecorderRef.current && activeRecorderRef.current.state === 'paused') {
      try {
        activeRecorderRef.current.resume();
        pausadoRef.current = false;
        setPausado(false);
        inicioGravacaoTotalRef.current = Date.now();
        inicioBlocoRef.current = Date.now();
        setStatus('🎙️ Gravação retomada... Fale normalmente com o tutor.');
      } catch {}
    }
  }

  function pararTudo() {
    gravandoRef.current = false;
    pausadoRef.current = false;
    setGravando(false);
    setPausado(false);
    clearInterval(timerRelRef.current);

    if (silentOscRef.current) {
      try { silentOscRef.current.stop(); } catch {}
      silentOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      streamRef.current = null;
    }
    if (activeRecorderRef.current && activeRecorderRef.current.state !== 'inactive') {
      try { activeRecorderRef.current.stop(); } catch {}
    }
    if (wakeRef.current) {
      try { wakeRef.current.release(); } catch {}
      wakeRef.current = null;
    }
  }

  // Stops recording and creates Master Full MP3 + final block
  async function pararGravacao() {
    setStatus('Finalizando gravação da consulta e gerando áudio completo em MP3...');
    gravandoRef.current = false;
    pausadoRef.current = false;
    setGravando(false);
    setPausado(false);
    clearInterval(timerRelRef.current);

    const numFinal = blocoNumeroRef.current;
    const inicioSegFinal = blocoInicioSecRef.current;
    const tempoTotalFinal = segundos;
    const duracaoBlocoFinal = tempoTotalFinal - inicioSegFinal;

    const rec = activeRecorderRef.current;
    const lastBlockChunks = [...currentSegmentChunksRef.current];

    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch {}
    }

    if (silentOscRef.current) {
      try { silentOscRef.current.stop(); } catch {}
      silentOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      streamRef.current = null;
    }
    if (wakeRef.current) {
      try { wakeRef.current.release(); } catch {}
      wakeRef.current = null;
    }

    // Process the final segment if it has audio (> 1s)
    let finalSegmentPromise: Promise<void> | null = null;
    if (duracaoBlocoFinal >= 1 && lastBlockChunks.length > 0) {
      const type = mimeRef.current || rec?.mimeType || 'audio/webm';
      const finalSegBlob = new Blob(lastBlockChunks, { type });
      const segId = `seg_${numFinal}_${Date.now()}`;
      const tempoInicio = fmtTempo(inicioSegFinal);
      const tempoFim = fmtTempo(tempoTotalFinal);

      const finalSeg: SegmentoAudio = {
        id: segId,
        numero: numFinal,
        tempoInicio,
        tempoFim,
        segundosInicio: inicioSegFinal,
        segundosFim: tempoTotalFinal,
        blobWebm: finalSegBlob,
        status: 'convertendo',
      };

      setSegmentos((prev) => [...prev, finalSeg]);
      finalSegmentPromise = processarSegmentoEmSegundoPlano(
        segId,
        numFinal,
        tempoInicio,
        tempoFim,
        finalSegBlob
      );
    }

    // Process Master Full Consultation MP3
    setProcessandoMaster(true);
    try {
      const masterType = mimeRef.current || 'audio/webm';
      const masterBlob = new Blob(masterAllChunksRef.current, { type: masterType });

      if (masterBlob.size > 200) {
        const masterBase64 = await blobParaBase64(masterBlob);
        const convRes = await converterAudioParaMp3(masterBase64, masterType);
        const mp3Blob = base64ToBlob(convRes.mp3Base64, 'audio/mp3');
        const mp3Url = URL.createObjectURL(mp3Blob);
        setMasterMp3Blob(mp3Blob);
        setMasterMp3Url(mp3Url);
      }
    } catch (err: any) {
      console.warn('Erro ao gerar MP3 master completo:', err);
    } finally {
      setProcessandoMaster(false);
    }

    // Wait for the final segment transcription to complete before auto-summarizing
    if (finalSegmentPromise) {
      await finalSegmentPromise;
    }

    // After all transcriptions are collected, run consultation summarizer
    setTimeout(() => {
      finalizarResumoConsulta();
    }, 800);
  }

  // Automatically summarizes consultation and fills clinical fields
  async function finalizarResumoConsulta() {
    const textoCompleto = transcricaoRef.current.trim();
    if (!textoCompleto) {
      setStatus('Gravação concluída. Nenhuma fala expressiva foi captada no microfone.');
      return;
    }

    setOcupado(true);
    setStatus('Estruturando resumo da consulta, diagnóstico provável e receituário com IA...');
    try {
      const resumo = await resumirConsulta(textoCompleto, patient, cfg);
      setConsulta(resumo);

      // Auto-fill fields if not already typed
      if (resumo.queixa && !chiefComplaint.trim()) {
        onQueixa(resumo.queixa, true);
      }
      if (resumo.diagnostico && !diagnostico.trim()) {
        onDiagnostico(resumo.diagnostico, true);
      }
      if (resumo.tratamentoOral && onTratamentoOral) {
        onTratamentoOral(resumo.tratamentoOral);
      }
      if (resumo.tratamentoOD && onTratamentoOD) {
        onTratamentoOD(resumo.tratamentoOD);
      }
      if (resumo.tratamentoOE && onTratamentoOE) {
        onTratamentoOE(resumo.tratamentoOE);
      }
      if (resumo.retornoOuAlta && onRetornoOuAlta) {
        onRetornoOuAlta(resumo.retornoOuAlta);
      }

      setStatus('✅ Consulta concluída! Áudios em MP3 salvos, resumo clínico e receituário preenchidos.');
    } catch (err: any) {
      console.error('Erro ao estruturar resumo final:', err);
      setStatus('');
      setErro(`Não foi possível gerar o resumo automático: ${err.message || 'Falha na IA'}. Você pode baixar o áudio MP3 da consulta inteira.`);
    } finally {
      setOcupado(false);
    }
  }

  // Handle uploaded audio files
  async function enviarArquivoAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    if (arq.size > 50 * 1024 * 1024) {
      setErro('Arquivo de áudio muito grande (limite de 50 MB).');
      return;
    }

    setErro('');
    setOcupado(true);
    setProcessandoMaster(true);
    setStatus('Convertendo áudio enviado para MP3 e transcrevendo com IA...');
    try {
      const base64 = await blobParaBase64(arq);
      const mime = mimeSeguro(arq.type);

      // Convert to MP3
      try {
        const mp3Res = await converterAudioParaMp3(base64, mime);
        const mp3Blob = base64ToBlob(mp3Res.mp3Base64, 'audio/mp3');
        setMasterMp3Blob(mp3Blob);
        setMasterMp3Url(URL.createObjectURL(mp3Blob));
      } catch (convErr) {
        console.warn('Erro ao converter arquivo para MP3:', convErr);
      }

      // Transcribe
      const texto = await transcreverAudio(base64, mime, cfg);
      if (!texto || !texto.trim()) {
        setStatus('Nenhuma fala audível foi identificada no arquivo enviado.');
        return;
      }

      setTranscricao(texto);
      transcricaoRef.current = texto;

      // Summarize
      const resumo = await resumirConsulta(texto, patient, cfg);
      setConsulta(resumo);

      if (resumo.queixa && !chiefComplaint.trim()) onQueixa(resumo.queixa, true);
      if (resumo.diagnostico && !diagnostico.trim()) onDiagnostico(resumo.diagnostico, true);
      if (resumo.tratamentoOral && onTratamentoOral) onTratamentoOral(resumo.tratamentoOral);
      if (resumo.tratamentoOD && onTratamentoOD) onTratamentoOD(resumo.tratamentoOD);
      if (resumo.tratamentoOE && onTratamentoOE) onTratamentoOE(resumo.tratamentoOE);
      if (resumo.retornoOuAlta && onRetornoOuAlta) onRetornoOuAlta(resumo.retornoOuAlta);

      setStatus('✅ Áudio processado com sucesso! Resumo e receituário preenchidos.');
    } catch (err: any) {
      setErro(`Erro ao processar áudio enviado: ${err.message || 'Falha na IA'}`);
    } finally {
      setOcupado(false);
      setProcessandoMaster(false);
    }
  }

  function baixarMasterMp3() {
    if (!masterMp3Blob) return;
    const nomePaciente = patient.nome ? patient.nome.replace(/\s+/g, '_') : 'consulta';
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `consulta_${nomePaciente}_COMPLETA_${dataHoje}.mp3`;
    baixarBlobMp3(masterMp3Blob, nomeArquivo);
  }

  function baixarBlocoMp3(seg: SegmentoAudio) {
    if (!seg.mp3Blob && !seg.blobWebm) return;
    const blobToDownload = seg.mp3Blob || seg.blobWebm!;
    const nomePaciente = patient.nome ? patient.nome.replace(/\s+/g, '_') : 'consulta';
    const tempoLimpo = `${seg.tempoInicio.replace(':', 'm')}-${seg.tempoFim.replace(':', 'm')}`;
    const nomeArquivo = `consulta_${nomePaciente}_bloco_${seg.numero}_${tempoLimpo}.mp3`;
    baixarBlobMp3(blobToDownload, nomeArquivo);
  }

  async function refazerResumo() {
    if (!transcricaoRef.current.trim()) return;
    setErro('');
    setOcupado(true);
    setStatus('Estruturando resumo clínico e receituário com IA...');
    try {
      const novo = await resumirConsulta(transcricaoRef.current, patient, cfg);
      setConsulta(novo);
      if (novo.queixa && !chiefComplaint.trim()) onQueixa(novo.queixa, true);
      if (novo.diagnostico && !diagnostico.trim()) onDiagnostico(novo.diagnostico, true);
      if (novo.tratamentoOral && onTratamentoOral) onTratamentoOral(novo.tratamentoOral);
      if (novo.tratamentoOD && onTratamentoOD) onTratamentoOD(novo.tratamentoOD);
      if (novo.tratamentoOE && onTratamentoOE) onTratamentoOE(novo.tratamentoOE);
      if (novo.retornoOuAlta && onRetornoOuAlta) onRetornoOuAlta(novo.retornoOuAlta);
      setStatus('✅ Resumo e receituário atualizados com sucesso.');
    } catch (e: any) {
      setStatus('');
      setErro(`Não foi possível gerar o resumo: ${e.message}`);
    } finally {
      setOcupado(false);
    }
  }

  const progressoBlocoPerc = Math.min(100, Math.round((segundosNoBloco / DURACAO_BLOCO_SEGUNDOS) * 100));
  const segundosParaProximoBloco = Math.max(0, DURACAO_BLOCO_SEGUNDOS - segundosNoBloco);

  return (
    <Section
      title="🎙️ Gravação Contínua & Transcrição em Blocos de 5 Min (.MP3)"
      subtitle="Grava a consulta inteira, divide a cada 5 min com transcrição automática e gera todos os arquivos em formato .MP3"
      badge={
        temChaveServidor ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> IA Ativa · MP3
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {cfg.modelo || MODELO_PADRAO}
          </span>
        )
      }
    >
      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-3">
        {!gravando ? (
          <button
            disabled={ocupado}
            onClick={iniciar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>Iniciar Gravação da Consulta</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {!pausado ? (
              <button
                onClick={pausar}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
                title="Pausar gravação temporariamente"
              >
                <Pause className="w-4 h-4" />
                <span>Pausar</span>
              </button>
            ) : (
              <button
                onClick={retomar}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
                title="Retomar gravação na mesma consulta"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Retomar</span>
              </button>
            )}

            <button
              onClick={pararGravacao}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Finalizar Consulta</span>
            </button>
          </div>
        )}

        {/* Live Recording Stats */}
        {gravando && (
          <div className={`flex flex-wrap items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
            pausado ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {/* Total Consultation Time */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${pausado ? 'bg-amber-500' : 'bg-red-600 animate-ping'}`} />
              <span>Total: {fmtTempo(segundos)}</span>
              {pausado && <span className="text-[11px] font-bold text-amber-700 uppercase ml-1">(Pausado)</span>}
            </div>

            {/* Current 5-Minute Block Badge & Countdown */}
            {!pausado && (
              <div className="flex items-center gap-2 pl-2 border-l border-red-200 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Bloco {blocoAtualNumero}: {fmtTempo(segundosNoBloco)} / 05:00
                </span>
                <span className="text-[11px] text-slate-600 hidden sm:inline">
                  (auto-transcrição em {fmtTempo(segundosParaProximoBloco)})
                </span>
              </div>
            )}

            {/* Voice Volume Level */}
            {!pausado && (
              <div className="flex items-center gap-0.5 h-4 px-1.5 bg-red-100/70 rounded-md" title="Nível de captação da voz">
                <Volume2 className="w-3 h-3 text-red-700 mr-0.5" />
                {[15, 35, 55, 75].map((threshold, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      volumeNivel >= threshold ? 'bg-emerald-600 h-3.5' : 'bg-red-300 h-1.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setColarModalAberto(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-sm font-semibold border border-purple-200 shadow-2xs transition-all active:scale-[0.98]"
          title="Colar texto avaliado no Gemini Notebook / NotebookLM"
        >
          <ClipboardPaste className="w-4 h-4 text-purple-600" />
          <span>Colar do NotebookLM</span>
        </button>

        <label
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium border border-slate-200 cursor-pointer transition-all ${
            gravando || ocupado ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span>Enviar Áudio</span>
          <input type="file" accept="audio/*" className="hidden" onChange={enviarArquivoAudio} />
        </label>

        <button
          disabled={gravando}
          onClick={() => setCfgAberto(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium border border-slate-200 transition-all disabled:opacity-50 ml-auto"
          title="Configurações do modelo e prompt de resumo"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Configurar</span>
        </button>
      </div>

      {/* 5-Minute Block Progress Bar when actively recording */}
      {gravando && !pausado && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span className="font-semibold flex items-center gap-1 text-slate-800">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Progresso do Bloco {blocoAtualNumero} (5 minutos):
            </span>
            <span className="font-mono text-slate-700 font-medium">
              {fmtTempo(segundosNoBloco)} / 05:00 · {progressoBlocoPerc}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressoBlocoPerc}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ao atingir 5 minutos (05:00), este bloco será imediatamente transcrito com IA e convertido em .MP3, enquanto a gravação continua no Bloco {blocoAtualNumero + 1} sem interrupção.
          </p>
        </div>
      )}

      {/* MASTER AUDIO PLAYER: Áudio da Consulta Inteira (.MP3) */}
      {(masterMp3Url || processandoMaster) && !gravando && (
        <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border-2 border-blue-300 rounded-2xl p-4 mb-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    🎧 Áudio da Consulta Inteira (.MP3)
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                    Formato .MP3
                  </span>
                  {segundos > 0 && (
                    <span className="text-[11px] font-mono text-slate-600">
                      Duração: {fmtTempo(segundos)}
                    </span>
                  )}
                </div>

                {processandoMaster ? (
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Processando e unificando o áudio completo da consulta em formato MP3...</span>
                  </div>
                ) : masterMp3Url ? (
                  <audio src={masterMp3Url} controls className="w-full h-8 mt-1" />
                ) : null}
              </div>
            </div>

            {masterMp3Blob && !processandoMaster && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={baixarMasterMp3}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                  title="Baixar áudio da consulta inteira em formato .mp3"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Consulta Completa (.mp3)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5-MINUTE SEGMENTS LIST */}
      {segmentos.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Blocos de 5 Minutos da Consulta ({segmentos.length} {segmentos.length === 1 ? 'bloco' : 'blocos'} gerados)
            </h4>
            <span className="text-[11px] text-slate-500">
              Cada bloco possui áudio .MP3 independente e transcrição própria
            </span>
          </div>

          <div className="space-y-2">
            {segmentos.map((seg) => {
              const aberto = blocoAbertoId === seg.id;
              return (
                <div
                  key={seg.id}
                  className="border border-slate-200 rounded-xl bg-white p-3 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        #{seg.numero}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Bloco {seg.numero}: {seg.tempoInicio} às {seg.tempoFim}
                          </span>
                          {seg.status === 'convertendo' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Loader2 className="w-3 h-3 animate-spin" /> Convertendo MP3...
                            </span>
                          )}
                          {seg.status === 'transcrevendo' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" /> Transcrevendo com IA...
                            </span>
                          )}
                          {seg.status === 'concluido' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Transcrito (.MP3)
                            </span>
                          )}
                          {seg.status === 'erro' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" /> Falha
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio Player for this segment */}
                      {seg.mp3Url ? (
                        <audio src={seg.mp3Url} controls className="h-7 w-44 sm:w-56" />
                      ) : seg.blobWebm ? (
                        <audio src={URL.createObjectURL(seg.blobWebm)} controls className="h-7 w-44 sm:w-56" />
                      ) : null}

                      {/* Download MP3 button */}
                      {(seg.mp3Blob || seg.blobWebm) && (
                        <button
                          onClick={() => baixarBlocoMp3(seg)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                          title={`Baixar Bloco ${seg.numero} em formato .mp3`}
                        >
                          <Download className="w-3 h-3 text-slate-600" />
                          <span>Baixar MP3</span>
                        </button>
                      )}

                      {/* Toggle transcription text */}
                      {seg.transcricao && (
                        <button
                          onClick={() => setBlocoAbertoId(aberto ? null : seg.id)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <span>{aberto ? 'Ocultar' : 'Ver Texto'}</span>
                          {aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Retry button if error */}
                      {seg.status === 'erro' && seg.blobWebm && (
                        <button
                          onClick={() =>
                            processarSegmentoEmSegundoPlano(
                              seg.id,
                              seg.numero,
                              seg.tempoInicio,
                              seg.tempoFim,
                              seg.blobWebm!
                            )
                          }
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Tentar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Transcription for this block */}
                  {aberto && seg.transcricao && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                      {seg.transcricao}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status banner */}
      {status && (
        <div className="flex items-center gap-2 text-sm text-blue-900 bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 mb-3 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{status}</span>
        </div>
      )}

      {/* Error banner */}
      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
          <div className="flex-1">{erro}</div>
        </div>
      )}

      {/* CLINICAL SUMMARY & PRESCRIPTION RESULT CARDS */}
      {consulta && (
        <div className="mt-4 space-y-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Resumo da Consulta <span className="text-xs font-normal text-slate-500">({consulta.geradoEm})</span>
              </h4>
              <button
                disabled={ocupado}
                onClick={refazerResumo}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline disabled:opacity-50"
              >
                Refazer resumo
              </button>
            </div>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
              rows={4}
              value={consulta.resumo || ''}
              onChange={(e) => setConsulta((c) => (c ? { ...c, resumo: e.target.value } : null))}
            />
          </div>

          {/* Cards com Queixa, Diagnóstico, Receituário e Retorno identificados */}
          <div className="grid md:grid-cols-2 gap-3">
            {consulta.queixa && (
              <div className="border border-blue-200/90 rounded-xl p-3.5 bg-blue-50/60">
                <div className="flex items-center gap-1 text-xs font-bold text-blue-900 mb-1">
                  <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
                  Queixa Identificada
                </div>
                <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap mb-2 leading-relaxed">
                  {consulta.queixa}
                </p>
                <button
                  onClick={() => onQueixa(consulta.queixa || '', false)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  + Adicionar à Queixa Principal
                </button>
              </div>
            )}

            {consulta.diagnostico && (
              <div className="border border-emerald-200/90 rounded-xl p-3.5 bg-emerald-50/60">
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-900 mb-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  Diagnóstico Provável Identificado
                </div>
                <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap mb-2 leading-relaxed">
                  {consulta.diagnostico}
                </p>
                <button
                  onClick={() => onDiagnostico(consulta.diagnostico || '', false)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  + Adicionar ao Diagnóstico
                </button>
              </div>
            )}

            {(consulta.tratamentoOral || consulta.tratamentoOD || consulta.tratamentoOE) && (
              <div className="border border-purple-200/90 rounded-xl p-3.5 bg-purple-50/60">
                <div className="flex items-center gap-1 text-xs font-bold text-purple-900 mb-1">
                  <Pill className="w-3.5 h-3.5 text-purple-600" />
                  Prescrição Escutada na Consulta (Receituário)
                </div>
                <div className="text-xs text-slate-700 space-y-1 mb-2">
                  {consulta.tratamentoOral && <p><strong>Oral:</strong> {consulta.tratamentoOral}</p>}
                  {consulta.tratamentoOD && <p><strong>Tópico OD:</strong> {consulta.tratamentoOD}</p>}
                  {consulta.tratamentoOE && <p><strong>Tópico OE:</strong> {consulta.tratamentoOE}</p>}
                </div>
                <span className="text-[11px] font-semibold text-purple-700 bg-white/80 px-2 py-0.5 rounded border border-purple-200 inline-block">
                  ✓ Inserido automaticamente no receituário
                </span>
              </div>
            )}

            {consulta.retornoOuAlta && (
              <div className="border border-amber-200/90 rounded-xl p-3.5 bg-amber-50/60">
                <div className="flex items-center gap-1 text-xs font-bold text-amber-900 mb-1">
                  <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                  Conduta: Retorno ou Alta Médica
                </div>
                <p className="text-xs md:text-sm text-slate-800 font-medium mb-1">
                  {consulta.retornoOuAlta}
                </p>
                <span className="text-[11px] font-semibold text-amber-800 bg-white/80 px-2 py-0.5 rounded border border-amber-200 inline-block">
                  ✓ Salvo no resumo do relatório
                </span>
              </div>
            )}
          </div>

          {/* Topics */}
          {consulta.topicos && consulta.topicos.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {consulta.topicos.map((t, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                    <ListFilter className="w-3.5 h-3.5 text-blue-600" />
                    {t.titulo}
                  </div>
                  <ul className="list-disc ml-5 text-xs md:text-sm text-slate-700 space-y-1">
                    {(t.itens || []).map((it, j) => (
                      <li key={j} className="leading-snug">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Full consultation transcript accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setMostrarTranscricao((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-slate-500" />
                Transcrição Completa da Consulta ({transcricao.length} caracteres)
              </span>
              {mostrarTranscricao ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {mostrarTranscricao && (
              <div className="p-3 bg-white">
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={8}
                  value={transcricao}
                  onChange={(e) => setTranscricao(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal to paste NotebookLM summaries */}
      <ColarNotebookModal
        aberto={colarModalAberto}
        onFechar={() => setColarModalAberto(false)}
        onAplicar={(dados) => {
          if (dados.queixa) onQueixa(dados.queixa, true);
          if (dados.diagnostico) onDiagnostico(dados.diagnostico, true);
          if (dados.tratamentoOral && onTratamentoOral) onTratamentoOral(dados.tratamentoOral);
          if (dados.tratamentoOD && onTratamentoOD) onTratamentoOD(dados.tratamentoOD);
          if (dados.tratamentoOE && onTratamentoOE) onTratamentoOE(dados.tratamentoOE);
          if (dados.retornoOuAlta && onRetornoOuAlta) onRetornoOuAlta(dados.retornoOuAlta);
          if (dados.consulta) setConsulta(dados.consulta);
        }}
      />

      <ConfigGeminiModal
        aberto={cfgAberto}
        onFechar={() => setCfgAberto(false)}
        cfg={cfg}
        onSalvar={salvarCfg}
        temChaveServidor={temChaveServidor}
      />
    </Section>
  );
};
