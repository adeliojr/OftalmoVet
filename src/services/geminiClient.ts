import { ConsultaSummary, GeminiConfig, Patient } from '../types';

export async function checkGeminiStatus(): Promise<{ hasServerKey: boolean; defaultModel: string }> {
  try {
    const res = await fetch('/api/gemini/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // offline or static fallback
  }
  return { hasServerKey: false, defaultModel: 'gemini-3.8-flash' };
}

export async function transcreverAudio(
  audioBase64: string,
  mimeType: string,
  cfg: GeminiConfig
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.chave && cfg.chave.trim()) {
    headers['x-goog-api-key'] = cfg.chave.trim();
  }

  const res = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audioBase64,
      mimeType,
      model: cfg.modelo || 'gemini-3.8-flash',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Falha na transcrição (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.text || '';
}

export async function resumirConsulta(
  transcricao: string,
  patient: Patient,
  cfg: GeminiConfig
): Promise<ConsultaSummary> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.chave && cfg.chave.trim()) {
    headers['x-goog-api-key'] = cfg.chave.trim();
  }

  const res = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transcription: transcricao,
      patient,
      customPrompt: cfg.prompt,
      model: cfg.modelo || 'gemini-3.8-flash',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao gerar resumo (HTTP ${res.status})`);
  }

  const r = await res.json();
  const topicos = Array.isArray(r.topicos)
    ? r.topicos
        .filter((t: any) => t && t.titulo)
        .map((t: any) => ({
          titulo: String(t.titulo),
          itens: Array.isArray(t.itens) ? t.itens.map(String) : [],
        }))
    : [];

  return {
    resumo: String(r.resumo || ''),
    topicos,
    transcricao,
    queixa: String(r.queixa_principal || ''),
    diagnostico: String(r.diagnostico || ''),
    tratamentoOral: String(r.tratamento_oral || ''),
    tratamentoOD: String(r.tratamento_topico_od || ''),
    tratamentoOE: String(r.tratamento_topico_oe || ''),
    retornoOuAlta: String(r.retorno_ou_alta || ''),
    geradoEm: new Date().toLocaleString('pt-BR'),
  };
}

export interface PacienteExtraidoOCR {
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  dataNascimento: string;
  idade: string;
  tutor: string;
  tipoConsulta?: string;
}

export async function extrairDadosPacienteFoto(
  imageBase64: string,
  mimeType: string,
  chaveUsuario?: string
): Promise<PacienteExtraidoOCR> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (chaveUsuario && chaveUsuario.trim()) {
    headers['x-goog-api-key'] = chaveUsuario.trim();
  }

  const res = await fetch('/api/gemini/extract-patient', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64,
      mimeType,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao extrair dados da foto (HTTP ${res.status})`);
  }

  return await res.json();
}

export async function converterAudioParaMp3(
  audioBase64: string,
  mimeType?: string
): Promise<{ mp3Base64: string; size: number }> {
  const res = await fetch('/api/audio/convert-mp3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao converter áudio em MP3 (HTTP ${res.status})`);
  }

  return await res.json();
}

export async function unirAudiosParaMp3(
  chunks: string[],
  mimeType?: string
): Promise<{ mp3Base64: string; size: number }> {
  const res = await fetch('/api/audio/merge-mp3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunks, mimeType }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Falha ao unir áudios em MP3 (HTTP ${res.status})`);
  }

  return await res.json();
}

