# Pedido para o AI Studio — corrigir a transcrição do app de oftalmologia

Cole este texto inteiro no AI Studio, no projeto do app OftalmoVet.

---

Preciso de duas correções na transcrição de áudio do app. Aplique exatamente como descrito abaixo, sem mudar mais nada, e depois envie as alterações para o GitHub (repositório adeliojr/OftalmoVet).

**Problema:** o app converte o áudio para MP3, mas manda o arquivo original (webm/mp4) para o Gemini, e isso falha às vezes. Quando eu envio o MP3 direto no Gemini, funciona. Além disso, quando falha, o app não tenta de novo sozinho e os usuários precisam clicar em "Tentar".

**Correção 1 — o app deve mandar o MP3 para o Gemini (quando a conversão deu certo), e tentar de novo sozinho se falhar.**

No arquivo `src/services/geminiClient.ts`, substitua a função `transcreverAudio` inteira (ela fica entre `checkGeminiStatus` e `resumirConsulta`) por este código:

```ts
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function transcreverUmaVez(
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
    const err: any = new Error(data.error || `Falha na transcrição (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.text || '';
}

// Transcreve com tentativas automáticas: se falhar, tenta de novo sozinho
// (assim ninguém precisa clicar em "Tentar"). Erros de chave/pedido inválido
// (400, 401, 403) não adiantam repetir e são devolvidos na hora.
export async function transcreverAudio(
  audioBase64: string,
  mimeType: string,
  cfg: GeminiConfig,
  audioAlternativo?: { base64: string; mimeType: string }
): Promise<string> {
  const esperas = [0, 2000, 5000];
  let ultimoErro: any = null;

  for (let i = 0; i < esperas.length; i++) {
    if (esperas[i]) await esperar(esperas[i]);
    try {
      return await transcreverUmaVez(audioBase64, mimeType, cfg);
    } catch (e: any) {
      ultimoErro = e;
      if (e && [400, 401, 403].includes(e.status)) break;
    }
  }

  // Última chance: tenta com o outro formato do mesmo áudio, se houver
  if (audioAlternativo) {
    try {
      return await transcreverUmaVez(audioAlternativo.base64, audioAlternativo.mimeType, cfg);
    } catch (e: any) {
      ultimoErro = e;
    }
  }

  throw ultimoErro || new Error('Falha na transcrição');
}
```

**Correção 2 — usar o MP3 nas duas chamadas de transcrição.**

No arquivo `src/components/RecordingSection.tsx`, são dois trechos.

**Trecho A**, dentro da função `processarSegmentoEmSegundoPlano`. Troque estas linhas:

```ts
      // Step 2: Transcribe via Gemini
      const texto = await transcreverAudio(base64, mime, cfg);
```

por:

```ts
      // Step 2: Transcribe via Gemini — prefere o MP3; se a conversão falhou, usa o original.
      const texto = base64Mp3
        ? await transcreverAudio(base64Mp3, 'audio/mp3', cfg, { base64, mimeType: mime })
        : await transcreverAudio(base64, mime, cfg);
```

**Trecho B**, dentro da função `enviarArquivoAudio`. Troque este bloco:

```ts
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
```

por:

```ts
      // Convert to MP3
      let base64Mp3: string | undefined;
      try {
        const mp3Res = await converterAudioParaMp3(base64, mime);
        base64Mp3 = mp3Res.mp3Base64;
        const mp3Blob = base64ToBlob(mp3Res.mp3Base64, 'audio/mp3');
        setMasterMp3Blob(mp3Blob);
        setMasterMp3Url(URL.createObjectURL(mp3Blob));
      } catch (convErr) {
        console.warn('Erro ao converter arquivo para MP3:', convErr);
      }

      // Transcribe (prefere MP3; tenta de novo sozinho; cai para o original se precisar)
      const texto = base64Mp3
        ? await transcreverAudio(base64Mp3, 'audio/mp3', cfg, { base64, mimeType: mime })
        : await transcreverAudio(base64, mime, cfg);
```

Não altere mais nenhum arquivo. Depois de aplicar, confirme que o projeto continua compilando e envie para o GitHub.
