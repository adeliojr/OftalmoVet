import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '50mb' }));

  // Enable CORS so standalone HTML can call endpoints from anywhere
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key, x-api-key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Helper to instantiate Gemini SDK
  const getAiClient = (userKey?: string) => {
    const key = (userKey && userKey.trim()) || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Chave de API do Gemini não configurada. Configure no AI Studio ou nas Configurações do app.');
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Helper to call model with automatic fallback on 503/429/temporary errors
  const callWithFallback = async (ai: GoogleGenAI, baseParams: any, models: string[]) => {
    let lastError: any = null;
    for (const m of models) {
      try {
        const res = await ai.models.generateContent({
          ...baseParams,
          model: m,
        });
        return res;
      } catch (err: any) {
        console.warn(`Tentativa com o modelo ${m} falhou:`, err.message || err);
        lastError = err;
        const msg = String(err.message || '');
        if (/UNAVAILABLE|503|429|RESOURCE_EXHAUSTED|NOT_FOUND|404|INVALID_ARGUMENT/i.test(msg)) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  // Status endpoint
  app.get('/api/gemini/status', (req, res) => {
    const hasServerKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    res.json({
      hasServerKey,
      defaultModel: 'gemini-3.5-flash',
    });
  });

  // Audio transcription endpoint
  app.post('/api/gemini/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, model } = req.body;
      const userKey = (req.headers['x-goog-api-key'] as string) || (req.headers['x-api-key'] as string) || '';

      if (!audioBase64) {
        return res.status(400).json({ error: 'Nenhum áudio enviado para transcrição.' });
      }

      const ai = getAiClient(userKey);
      const chosenModel = model || 'gemini-3.5-flash';
      const modelsToTry = [
        chosenModel,
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.5-transcribe',
        'gemini-3.1-flash-lite',
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      const PROMPT_TRANSCRICAO = `Transcreva fielmente, em português do Brasil, esta conversa de uma consulta de oftalmologia veterinária entre o veterinário e o tutor do animal.

Regras:
- Identifique quem fala como "Veterinário:" e "Tutor:" (use "Outro:" se houver mais alguém).
- Não resuma, não corrija o conteúdo e não invente nada. Transcreva só o que foi dito.
- Escreva com atenção termos oftalmológicos, nomes de medicamentos, concentrações e doses.
- Se algo estiver inaudível, escreva [inaudível].
- Se não houver nenhuma fala no áudio, responda exatamente: [silêncio]`;

      const response = await callWithFallback(
        ai,
        {
          contents: [
            {
              parts: [
                { text: PROMPT_TRANSCRICAO },
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          config: {
            temperature: 0,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        },
        modelsToTry
      );

      let text = response.text || '';
      if (!text && response.candidates?.[0]?.content?.parts) {
        text = response.candidates[0].content.parts
          .map((p: any) => p.text || '')
          .join('')
          .trim();
      }

      if (/^\[sil[eê]ncio\]$/i.test(text.trim())) {
        text = '';
      }

      res.json({ text });
    } catch (err: any) {
      console.error('Transcription error:', err);
      res.status(500).json({ error: err.message || 'Erro ao transcrever o áudio.' });
    }
  });

  // Helper to convert arbitrary audio buffer (webm, mp4, ogg, wav) to MP3 using ffmpeg
  const convertBufferToMp3 = async (inputBuffer: Buffer, mimeType?: string): Promise<Buffer> => {
    let ext = 'webm';
    if (mimeType?.includes('mp4')) ext = 'mp4';
    else if (mimeType?.includes('ogg')) ext = 'ogg';
    else if (mimeType?.includes('wav')) ext = 'wav';
    else if (mimeType?.includes('aac')) ext = 'aac';

    const tmpDir = os.tmpdir();
    const id = 'hva_mp3_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const inPath = path.join(tmpDir, `${id}.${ext}`);
    const outPath = path.join(tmpDir, `${id}.mp3`);

    await fs.promises.writeFile(inPath, inputBuffer);
    try {
      await execFilePromise('ffmpeg', [
        '-y',
        '-i', inPath,
        '-vn',
        '-ar', '44100',
        '-ac', '1',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        outPath,
      ]);
      return await fs.promises.readFile(outPath);
    } finally {
      try { await fs.promises.unlink(inPath); } catch {}
      try { await fs.promises.unlink(outPath); } catch {}
    }
  };

  // Endpoint to convert an audio recording to MP3
  app.post('/api/audio/convert-mp3', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'Nenhum áudio enviado para conversão em MP3.' });
      }
      const inputBuffer = Buffer.from(audioBase64, 'base64');
      const mp3Buffer = await convertBufferToMp3(inputBuffer, mimeType);
      const mp3Base64 = mp3Buffer.toString('base64');
      res.json({
        mp3Base64,
        mimeType: 'audio/mp3',
        size: mp3Buffer.length,
      });
    } catch (err: any) {
      console.error('Erro na conversão MP3:', err);
      res.status(500).json({ error: err.message || 'Falha ao converter áudio em MP3.' });
    }
  });

  // Endpoint to merge multiple audio chunks into a single continuous MP3
  app.post('/api/audio/merge-mp3', async (req, res) => {
    try {
      const { chunks, mimeType } = req.body;
      if (!Array.isArray(chunks) || chunks.length === 0) {
        return res.status(400).json({ error: 'Nenhum bloco de áudio fornecido para unir.' });
      }

      // If only one chunk, simple conversion
      if (chunks.length === 1) {
        const inputBuffer = Buffer.from(chunks[0], 'base64');
        const mp3Buffer = await convertBufferToMp3(inputBuffer, mimeType);
        return res.json({
          mp3Base64: mp3Buffer.toString('base64'),
          mimeType: 'audio/mp3',
          size: mp3Buffer.length,
        });
      }

      // Multiple chunks: standardize each to intermediate MP3 and concat
      const tmpDir = os.tmpdir();
      const sessionId = 'hva_merge_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const intermediateFiles: string[] = [];
      const outPath = path.join(tmpDir, `${sessionId}_master.mp3`);

      try {
        let ext = 'webm';
        if (mimeType?.includes('mp4')) ext = 'mp4';
        else if (mimeType?.includes('ogg')) ext = 'ogg';

        for (let i = 0; i < chunks.length; i++) {
          const segIn = path.join(tmpDir, `${sessionId}_${i}.${ext}`);
          const segMp3 = path.join(tmpDir, `${sessionId}_${i}.mp3`);
          await fs.promises.writeFile(segIn, Buffer.from(chunks[i], 'base64'));
          await execFilePromise('ffmpeg', [
            '-y',
            '-i', segIn,
            '-vn',
            '-ar', '44100',
            '-ac', '1',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            segMp3,
          ]);
          intermediateFiles.push(segMp3);
          try { await fs.promises.unlink(segIn); } catch {}
        }

        const ffmpegArgs: string[] = ['-y'];
        for (const f of intermediateFiles) {
          ffmpegArgs.push('-i', f);
        }
        const filterInput = intermediateFiles.map((_, i) => `[${i}:0]`).join('');
        ffmpegArgs.push(
          '-filter_complex', `${filterInput}concat=n=${intermediateFiles.length}:v=0:a=1[out]`,
          '-map', '[out]',
          '-c:a', 'libmp3lame',
          '-b:a', '128k',
          outPath
        );

        await execFilePromise('ffmpeg', ffmpegArgs);
        const masterBuffer = await fs.promises.readFile(outPath);
        res.json({
          mp3Base64: masterBuffer.toString('base64'),
          mimeType: 'audio/mp3',
          size: masterBuffer.length,
        });
      } finally {
        for (const f of intermediateFiles) {
          try { await fs.promises.unlink(f); } catch {}
        }
        try { await fs.promises.unlink(outPath); } catch {}
      }
    } catch (err: any) {
      console.error('Erro ao unir blocos de áudio em MP3:', err);
      res.status(500).json({ error: err.message || 'Falha ao unir áudios da consulta.' });
    }
  });

  // Consultation summarization endpoint
  app.post('/api/gemini/summarize', async (req, res) => {
    try {
      const { transcription, patient, customPrompt, model } = req.body;
      const userKey = (req.headers['x-goog-api-key'] as string) || (req.headers['x-api-key'] as string) || '';

      if (!transcription || !transcription.trim()) {
        return res.status(400).json({ error: 'Nenhuma transcrição para resumir.' });
      }

      const ai = getAiClient(userKey);
      const chosenModel = model || 'gemini-3.5-flash';
      const modelsToTry = [
        chosenModel,
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      const REGRAS_RESUMO = `Você organiza a transcrição de uma consulta de oftalmologia veterinária para o Dr. Adélio Gurgel do Amaral Jr. (HVA).

REGRAS OBRIGATÓRIAS (valem mesmo que as instruções do veterinário digam outra coisa):
- Use SOMENTE o que aparece na transcrição. Nunca invente achados, diagnósticos, medicamentos, doses ou prazos.
- Se uma informação não foi dita, deixe o campo correspondente vazio ou omita o tópico.
- "queixa_principal": o motivo da consulta e o histórico relatado pelo tutor, em 1 a 3 frases objetivas.
- "diagnostico": apenas o diagnóstico (ou suspeita) que o VETERINÁRIO afirmou explicitamente. Se não houve, deixe vazio.
- "tratamento_oral": medicamentos por via oral prescritos durante a consulta (ex: "Cefalexina 500mg, 1/2 comprimido a cada 12 horas por 10 dias"). Se nenhum for prescrito, deixe string vazia "".
- "tratamento_topico_od": colírios ou pomadas oftálmicas para o OLHO DIREITO (OD), incluindo concentração, dosagem, frequência e duração (ex: "Tobramicina 0,3% colírio - 1 gota a cada 8 horas por 10 dias"). Se não houver, deixe "".
- "tratamento_topico_oe": colírios ou pomadas oftálmicas para o OLHO ESQUERDO (OE), incluindo concentração, dosagem, frequência e duração. Se não houver, deixe "".
- "retorno_ou_alta": conduta expressa pelo veterinário quanto ao retorno (ex: "Retorno em 7 dias para reteste de fluoresceína", "Retorno em 15 dias", "Retorno em 30 dias") OU "Alta médica". Se não mencionado, deixe "".
- "resumo": o resumo da consulta, destacando queixa, achados, diagnóstico provável, tratamento instituído e conduta de retorno ou alta.
- "topicos": a conversa organizada em tópicos curtos: "Queixa e histórico", "Achados do exame", "Diagnóstico provável", "Tratamento prescrito", "Orientações ao tutor", "Conduta (Retorno ou Alta médica)".
- Escreva em português do Brasil.`;

      const PROMPT_PADRAO = 'Faça um resumo objetivo da consulta, destacando queixa, achados, diagnóstico provável, tratamento oral e tópico (OD/OE) e orientações ao tutor com prazo de retorno ou alta médica.';

      const ctx = [
        patient?.nome && `Paciente: ${patient.nome}`,
        patient?.especie && `Espécie: ${patient.especie}`,
        patient?.raca && `Raça: ${patient.raca}`,
        patient?.idade && `Idade: ${patient.idade}`,
        patient?.sexo && `Sexo: ${patient.sexo}`,
      ].filter(Boolean).join(' | ');

      const promptCompleto = `${REGRAS_RESUMO}

INSTRUÇÕES DO VETERINÁRIO PARA O RESUMO:
${customPrompt || PROMPT_PADRAO}

${ctx ? `DADOS DO PACIENTE: ${ctx}\n\n` : ''}TRANSCRIÇÃO DA CONSULTA:
${transcription}`;

      const response = await callWithFallback(
        ai,
        {
          contents: promptCompleto,
          config: {
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                queixa_principal: { type: Type.STRING },
                diagnostico: { type: Type.STRING },
                tratamento_oral: { type: Type.STRING },
                tratamento_topico_od: { type: Type.STRING },
                tratamento_topico_oe: { type: Type.STRING },
                retorno_ou_alta: { type: Type.STRING },
                resumo: { type: Type.STRING },
                topicos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      titulo: { type: Type.STRING },
                      itens: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['titulo', 'itens'],
                  },
                },
              },
              required: [
                'queixa_principal',
                'diagnostico',
                'resumo',
                'topicos',
                'tratamento_oral',
                'tratamento_topico_od',
                'tratamento_topico_oe',
                'retorno_ou_alta',
              ],
            },
          },
        },
        modelsToTry
      );

      const raw = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const limpo = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(limpo);
      }
      res.json(parsed);
    } catch (err: any) {
      console.error('Summarize error:', err);
      res.status(500).json({ error: err.message || 'Erro ao gerar o resumo da consulta.' });
    }
  });

  // Extract patient info from photo of hospital system screen
  app.post('/api/gemini/extract-patient', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      const userKey = (req.headers['x-goog-api-key'] as string) || (req.headers['x-api-key'] as string) || '';

      if (!imageBase64) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada para extração.' });
      }

      const ai = getAiClient(userKey);
      const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
      ];

      const PROMPT_OCR = `Você é um assistente veterinário especializado em digitalização de cadastros e prontuários.
Analise a imagem fornecida (foto de tela de computador do sistema hospitalar veterinário, ficha médica, receituário ou tela de software) e extraia os dados cadastrais do paciente e do tutor.

Identifique:
- "nome": Nome do animal/paciente.
- "especie": Espécie (Canina, Felina, Equina, etc.).
- "raca": Raça do animal (ex: Shih-tzu, Pug, SRD, Golden Retriever, etc.).
- "sexo": Sexo do animal (ex: Macho, Fêmea, Macho (Castrado), Fêmea (Castrada)).
- "dataNascimento": Data de nascimento se estiver visível (ex: DD/MM/AAAA).
- "idade": Idade do animal (ex: "5 anos", "8 meses"). Se houver apenas a data de nascimento, calcule a idade com base na data atual (2026).
- "tutor": Nome do tutor / proprietário / responsável.
- "tipoConsulta": Tipo de consulta se indicado (ex: Consulta, Retorno).

REGRAS:
- Se algum campo não estiver legível ou visível, preencha com string vazia "".
- Não invente informações ausentes.
- Retorne apenas os dados extraídos no schema JSON especificado.`;

      const response = await callWithFallback(
        ai,
        {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
                { text: PROMPT_OCR },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                especie: { type: Type.STRING },
                raca: { type: Type.STRING },
                sexo: { type: Type.STRING },
                dataNascimento: { type: Type.STRING },
                idade: { type: Type.STRING },
                tutor: { type: Type.STRING },
                tipoConsulta: { type: Type.STRING },
              },
              required: ['nome', 'especie', 'raca', 'sexo', 'dataNascimento', 'idade', 'tutor'],
            },
          },
        },
        modelsToTry
      );

      const raw = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const limpo = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(limpo);
      }
      res.json(parsed);
    } catch (err: any) {
      console.error('OCR patient extraction error:', err);
      res.status(500).json({ error: err.message || 'Erro ao extrair dados do paciente na imagem.' });
    }
  });

  // Store for cross-device photo sync (Dr. Adélio taking photos with a second mobile phone)
  interface PhotoItem {
    id: string;
    dataUrl: string;
    target: string;
    timestamp: number;
  }
  interface PhotoSession {
    id: string;
    patientName: string;
    createdAt: number;
    photos: PhotoItem[];
  }
  const photoSessions = new Map<string, PhotoSession>();

  // Create photo session
  app.post('/api/sync/session', (req, res) => {
    const { patientName } = req.body;
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    photoSessions.set(sessionId, {
      id: sessionId,
      patientName: patientName || 'Paciente',
      createdAt: Date.now(),
      photos: [],
    });
    res.json({ sessionId });
  });

  // Upload photo from second phone
  app.post('/api/sync/:sessionId/upload', (req, res) => {
    const { sessionId } = req.params;
    const session = photoSessions.get(sessionId.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: 'Sessão de fotos não encontrada ou expirada.' });
    }
    const { dataUrl, target } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'Nenhuma foto enviada.' });
    }
    const photo: PhotoItem = {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      dataUrl,
      target: target || 'geral',
      timestamp: Date.now(),
    };
    session.photos.push(photo);
    res.json({ success: true, count: session.photos.length, photoId: photo.id });
  });

  // Poll photos on desktop/tablet
  app.get('/api/sync/:sessionId/photos', (req, res) => {
    const { sessionId } = req.params;
    const session = photoSessions.get(sessionId.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }
    const photos = [...session.photos];
    session.photos = [];
    res.json({ photos });
  });

  // Mobile webpage served to the second phone
  app.get('/sync/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = photoSessions.get(sessionId.toUpperCase());
    const patientName = session ? session.patientName : 'Paciente';

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Câmera Oftalmo HVA</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen p-4 flex flex-col items-center justify-between font-sans">
  <div class="w-full max-w-md">
    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4 text-center">
      <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">📸</div>
      <h1 class="text-lg font-bold text-blue-400">Envio de Fotos Oftalmológicas</h1>
      <p class="text-xs text-slate-300">Paciente: <strong class="text-white text-sm">${patientName}</strong></p>
      <div class="mt-2 inline-block bg-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
        Sessão Conectada: ${sessionId.toUpperCase()}
      </div>
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4 space-y-3">
      <label class="block text-xs font-bold text-slate-300">Destino da Foto no Prontuário:</label>
      <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
        <label class="flex items-center gap-2 p-2.5 bg-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-700 border border-blue-500/40">
          <input type="radio" name="target" value="OD" checked class="text-blue-500 focus:ring-0">
          <span>Olho Direito (OD)</span>
        </label>
        <label class="flex items-center gap-2 p-2.5 bg-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-700 border border-indigo-500/40">
          <input type="radio" name="target" value="OE" class="text-indigo-500 focus:ring-0">
          <span>Olho Esquerdo (OE)</span>
        </label>
        <label class="flex items-center gap-2 p-2.5 bg-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-700 border border-slate-600">
          <input type="radio" name="target" value="OD_cornea" class="text-blue-500 focus:ring-0">
          <span>Córnea OD</span>
        </label>
        <label class="flex items-center gap-2 p-2.5 bg-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-700 border border-slate-600">
          <input type="radio" name="target" value="OE_cornea" class="text-indigo-500 focus:ring-0">
          <span>Córnea OE</span>
        </label>
        <label class="flex items-center gap-2 p-2.5 bg-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-700 border border-slate-600 col-span-2">
          <input type="radio" name="target" value="ultrassom" class="text-emerald-500 focus:ring-0">
          <span>Ultrassom Ocular / Geral</span>
        </label>
      </div>
    </div>

    <div class="space-y-3 mb-4">
      <label class="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base rounded-2xl cursor-pointer shadow-lg transition-all text-center">
        <span>📷 Tirar Foto Agora (Câmera)</span>
        <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden">
      </label>

      <label class="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 cursor-pointer transition-all text-center">
        <span>📁 Escolher da Galeria deste celular</span>
        <input type="file" id="galleryInput" accept="image/*" multiple class="hidden">
      </label>
    </div>

    <div id="statusDiv" class="hidden rounded-xl p-3 text-center text-xs font-semibold mb-4"></div>

    <div id="previewContainer" class="hidden bg-slate-800 border border-slate-700 rounded-2xl p-3 mb-4">
      <p class="text-xs text-slate-400 mb-2">Última foto enviada:</p>
      <img id="previewImg" class="w-full h-44 object-contain rounded-xl bg-black/40">
    </div>
  </div>

  <div class="text-[11px] text-slate-500 text-center pb-2">
    Dr. Adélio Gurgel do Amaral Jr. · Hospital Veterinário de Araçatuba
  </div>

  <script>
    const sessionId = "${sessionId.toUpperCase()}";
    const statusDiv = document.getElementById('statusDiv');
    const previewContainer = document.getElementById('previewContainer');
    const previewImg = document.getElementById('previewImg');

    function getSelectedTarget() {
      const radio = document.querySelector('input[name="target"]:checked');
      return radio ? radio.value : 'OD';
    }

    function showStatus(text, isError) {
      statusDiv.className = isError 
        ? 'rounded-xl p-3 text-center text-xs font-semibold mb-4 bg-red-900/60 border border-red-700 text-red-200 block'
        : 'rounded-xl p-3 text-center text-xs font-semibold mb-4 bg-emerald-900/60 border border-emerald-700 text-emerald-200 block';
      statusDiv.textContent = text;
    }

    async function processAndSendFile(file) {
      if (!file) return;
      showStatus('Comprimindo e enviando foto para o prontuário...', false);

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

          fetch('/api/sync/' + sessionId + '/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, target: getSelectedTarget() })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              showStatus('✅ Foto enviada com sucesso! Já está visível na ficha.', false);
              previewImg.src = dataUrl;
              previewContainer.classList.remove('hidden');
            } else {
              showStatus('Erro ao enviar: ' + (data.error || 'Tente novamente'), true);
            }
          })
          .catch(err => {
            showStatus('Erro de conexão: ' + err.message, true);
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    document.getElementById('cameraInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processAndSendFile(file);
      e.target.value = '';
    });

    document.getElementById('galleryInput').addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          processAndSendFile(files[i]);
        }
      }
      e.target.value = '';
    });
  </script>
</body>
</html>`);
  });

  // Endpoint to download standalone single-file HTML version
  app.get('/api/download-html', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'ficha-oftalmo-hva.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.download(filePath, 'ficha-oftalmo-hva.html');
  });

  app.get('/api/html-content', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'ficha-oftalmo-hva.html');
    res.sendFile(filePath);
  });

  // Serve static in production or use Vite middleware in dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HVA OftalmoVet iniciado na porta ${PORT}`);
  });
}

startServer();
