import { Patient, LocationInfo, EyeExamData, ComplementaryExamData, ConsultaSummary } from '../types';
import { ESTRUTURAS, TESTES_CORNEA, EXAMES_COMPLEMENTARES, TRADUCOES_TUTOR } from './constants';

export function interpretSchirmer(v?: string): string {
  if (!v || isNaN(Number(v))) return '';
  return Number(v) < 15 ? 'Baixa produção lacrimal' : 'Normal';
}

export function interpretPio(v?: string): string {
  if (!v || isNaN(Number(v))) return '';
  const num = Number(v);
  if (num < 11) return 'Hipotonia';
  if (num > 25) return 'Hipertensão ocular';
  return 'Normal';
}

export function traduzirTermo(texto: string): string {
  let t = texto;
  Object.keys(TRADUCOES_TUTOR).forEach((k) => {
    t = t.replace(new RegExp(k, 'gi'), TRADUCOES_TUTOR[k]);
  });
  return t;
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result || ''));
    reader.onerror = () => reject(new Error('Erro ao ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result || '').split(',')[1] || '');
    r.onerror = () => reject(new Error('Não foi possível ler o áudio.'));
    r.readAsDataURL(blob);
  });
}

export function mimeSeguro(m?: string): string {
  const clean = String(m || '').split(';')[0].trim().toLowerCase();
  if (clean === 'audio/mp4' || clean === 'video/mp4' || clean === 'audio/x-m4a') return 'audio/m4a';
  if (clean === 'audio/mpeg') return 'audio/mp3';
  return clean || 'audio/webm';
}

export function fmtTempo(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function gerarReceita(
  tipo: 'oral' | 'od' | 'oe' | 'ambos',
  medicamentos: string,
  patient: Patient,
  location: LocationInfo
): string {
  const linhas: string[] = [];
  linhas.push('', '', '', '', '', '', '', '');
  linhas.push('RECEITUÁRIO');
  linhas.push('');
  linhas.push(`Data: ${location.data || new Date().toLocaleDateString('pt-BR')}`);
  linhas.push(`Paciente: ${patient.nome || '_______________________________'}`);
  linhas.push(`Tutor: ${patient.tutor || '_______________________________'}`);
  linhas.push('');
  linhas.push('');

  if (tipo === 'oral') linhas.push('USO ORAL:');
  else if (tipo === 'ambos') linhas.push('USO OFTÁLMICO (AMBOS OS OLHOS):');
  else if (tipo === 'od') linhas.push('USO OFTÁLMICO (OLHO DIREITO):');
  else if (tipo === 'oe') linhas.push('USO OFTÁLMICO (OLHO ESQUERDO):');
  linhas.push('');

  const meds = medicamentos.split('\n').filter((m) => m.trim());

  meds.forEach((med, idx) => {
    let medicamento = '';
    let frequencia = '';
    let duracao = '';

    if (tipo !== 'oral') {
      const percentIndex = med.indexOf('%');
      if (percentIndex === -1) {
        linhas.push(`${idx + 1}. ${med.trim()}`);
        linhas.push('');
        return;
      }
      medicamento = med.substring(0, percentIndex + 1).trim();
      const resto = med.substring(percentIndex + 1).trim();
      const partes = resto.split(/[\s,]+/).filter((p) => p.trim());
      frequencia = partes[0] || 'conforme orientação';
      duracao = partes[1] || 'uso contínuo';
    } else {
      const partes = med.split(',').map((p) => p.trim());
      if (partes.length < 4) {
        linhas.push(`${idx + 1}. ${med.trim()}`);
        linhas.push('');
        return;
      }
      medicamento = partes[0];
      frequencia = partes[2];
      duracao = partes[3];
    }

    medicamento = medicamento.charAt(0).toUpperCase() + medicamento.slice(1);

    if (tipo !== 'oral' && !medicamento.toLowerCase().includes('colírio')) {
      const partesMed = medicamento.split(/\s+/);
      let inserido = false;
      for (let i = 0; i < partesMed.length; i++) {
        if (partesMed[i].match(/\d/) && partesMed[i].includes('%')) {
          partesMed.splice(i, 0, 'colírio');
          inserido = true;
          break;
        }
      }
      if (!inserido) partesMed.push('colírio');
      medicamento = partesMed.join(' ');
    }

    linhas.push(`${idx + 1}. ${medicamento} _________________________________ ${tipo === 'oral' ? '1cx' : '1fco'}`);
    linhas.push('');

    let instrucao = '';
    if (tipo === 'oral') {
      const partes = med.split(',').map((p) => p.trim());
      const doseNumero = (partes[1] || '1').replace(/\s*comp(rimidos?)?/gi, '').trim();
      const doseCapitalizada = doseNumero.charAt(0).toUpperCase() + doseNumero.slice(1);
      const doseLower = doseNumero.toLowerCase();
      const textoComprimido =
        doseLower.includes('meio') ||
        doseLower === '0,5' ||
        doseLower === '1/2' ||
        doseLower === '1' ||
        doseLower === 'um' ||
        doseLower === 'uma'
          ? ' comprimido'
          : ' comprimidos';
      instrucao = `   Dê ${doseCapitalizada}${textoComprimido} por via oral`;
    } else if (tipo === 'od') instrucao = '   Pingue uma gota no olho direito';
    else if (tipo === 'oe') instrucao = '   Pingue uma gota no olho esquerdo';
    else if (tipo === 'ambos') instrucao = '   Pingue uma gota em ambos os olhos';

    const freq = frequencia.toLowerCase().replace(/\s/g, '');
    let intervalo = '';
    if (freq.includes('1x') || freq === 'sid' || freq === 'q24h') intervalo = 'a cada 24 horas';
    else if (freq.includes('2x') || freq === 'bid' || freq === 'q12h') intervalo = 'a cada 12 horas';
    else if (freq.includes('3x') || freq === 'tid' || freq === 'q8h') intervalo = 'a cada 8 horas';
    else if (freq.includes('4x') || freq === 'qid' || freq === 'q6h') intervalo = 'a cada 6 horas';
    else if (freq.includes('5x')) intervalo = '5 vezes ao dia';
    else if (freq.includes('6x')) intervalo = '6 vezes ao dia';
    else intervalo = frequencia;

    instrucao += `, ${intervalo}`;

    let duracaoFormatada = duracao;
    const durMatch = duracao.match(/^(\d+)d$/i);
    if (durMatch) duracaoFormatada = `${durMatch[1]} dias`;

    instrucao += `, por ${duracaoFormatada}.`;
    linhas.push(instrucao);
    linhas.push('');
  });

  linhas.push('');
  linhas.push('');
  linhas.push('');
  linhas.push('_________________________________________________');
  linhas.push('Dr. Adélio Gurgel do Amaral Jr.');
  linhas.push('CRMV-SP 18.721');
  linhas.push('');
  linhas.push('');
  linhas.push('OBSERVAÇÕES IMPORTANTES:');
  linhas.push('');
  linhas.push('• Uso de colar protetor (elizabetano) é IMPRESCINDÍVEL durante todo o tratamento');
  linhas.push('• Realizar limpeza ocular com Soro Fisiológico quando observar secreção');
  linhas.push('• Em caso de piora ou emergência, contatar o HVA: (14) 3626-5287');

  return linhas.join('\n');
}

export function gerarRelatorioTutorHTML(
  patient: Patient,
  location: LocationInfo,
  examsOD: EyeExamData,
  examsOE: EyeExamData,
  diagnostico: string,
  tratamentoOral?: string,
  tratamentoOD?: string,
  tratamentoOE?: string,
  retornoOuAlta?: string
): string {
  let html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1e293b;background:#ffffff;">
      <div style="text-align:center;margin-bottom:28px;border-bottom:3px solid #2563eb;padding-bottom:18px;">
        <h1 style="color:#1e40af;margin:0 0 6px 0;font-size:24px;letter-spacing:-0.5px;">Relatório do Exame Oftalmológico</h1>
        <p style="color:#64748b;margin:0;font-size:14px;font-weight:500;">Serviço de Oftalmologia Veterinária - HVA</p>
      </div>

      <div style="background:#f8fafc;padding:18px 22px;border-radius:12px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e40af;font-size:16px;margin:0 0 12px 0;font-weight:700;">📋 Informações do Paciente</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
          <div><strong>Paciente:</strong> ${patient.nome || '_'}</div>
          <div><strong>Data:</strong> ${location.data || new Date().toLocaleDateString('pt-BR')}</div>
          <div><strong>Espécie/Raça:</strong> ${patient.especie || '_'} / ${patient.raca || '_'}</div>
          <div><strong>Idade:</strong> ${patient.idade || '_'}</div>
          <div style="grid-column:1/-1;"><strong>Tutor(a):</strong> ${patient.tutor || '_'}</div>
        </div>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin-bottom:24px;font-size:13px;color:#92400e;">
        <strong>Nota:</strong> Este relatório usa linguagem simplificada para compreensão do tutor. Detalhes técnicos e posologia encontram-se no prontuário médico.
      </div>
  `;

  function blocoOlho(label: string, exame: EyeExamData, schirmer?: string, pio?: string) {
    let h = `<div style="background:#ffffff;border:2px solid #dbeafe;border-radius:12px;padding:20px;margin-bottom:20px;">
      <h3 style="color:#2563eb;font-size:17px;margin:0 0 14px 0;font-weight:700;">👁️ ${label}</h3>`;

    if (schirmer || pio) {
      h += `<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:#334155;">Testes Realizados:</div>`;
      if (schirmer) {
        const r = interpretSchirmer(schirmer);
        const cor = r === 'Normal' ? '#059669' : '#dc2626';
        h += `<div style="padding:10px 14px;background:#f0fdf4;border-radius:8px;margin-bottom:8px;font-size:13px;border:1px solid #bbf7d0;">
          <strong>Teste de Lágrima (Schirmer):</strong> ${schirmer} mm/min
          <span style="color:${cor};font-weight:bold;margin-left:6px;"> - ${r === 'Normal' ? '✓ Normal' : '⚠ ' + r}</span>
        </div>`;
      }
      if (pio) {
        const r = interpretPio(pio);
        const cor = r === 'Normal' ? '#059669' : '#dc2626';
        h += `<div style="padding:10px 14px;background:#f0fdf4;border-radius:8px;margin-bottom:8px;font-size:13px;border:1px solid #bbf7d0;">
          <strong>Pressão Ocular (PIO):</strong> ${pio} mmHg
          <span style="color:${cor};font-weight:bold;margin-left:6px;"> - ${r === 'Normal' ? '✓ Normal' : '⚠ ' + r}</span>
        </div>`;
      }
    }

    h += `<div style="margin-top:16px;margin-bottom:8px;font-size:14px;font-weight:600;color:#334155;">Estruturas Examinadas:</div>`;
    ESTRUTURAS.forEach((est) => {
      const valor = exame[est.key];
      const temAlteracao = valor && valor.trim();
      const texto = traduzirTermo(temAlteracao ? valor : est.normal);
      const cor = temAlteracao ? '#dc2626' : '#059669';
      const icone = temAlteracao ? '⚠️' : '✓';
      h += `<div style="padding:10px 14px;background:${temAlteracao ? '#fef2f2' : '#f8fafc'};border-radius:8px;margin:8px 0;border-left:3px solid ${cor};font-size:13px;">
        <strong style="color:${cor};">${icone} ${est.label}:</strong> ${texto}
        <br><small style="color:#64748b;font-size:11px;">${est.explicacao}</small>
      </div>`;
      const fotos: string[] = exame[`${est.key}_photos`] || [];
      if (fotos.length > 0) {
        h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:10px 0 10px 14px;">`;
        fotos.forEach((f, i) => {
          h += `<img src="${f}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" alt="Foto ${i + 1}"/>`;
        });
        h += `</div>`;
      }
    });

    h += `</div>`;
    return h;
  }

  html += blocoOlho('Olho Direito (OD)', examsOD, examsOD.schirmer, examsOD.pio);
  html += blocoOlho('Olho Esquerdo (OE)', examsOE, examsOE.schirmer, examsOE.pio);

  // Formatação do Tratamento para o resumo
  const linhasTrat: string[] = [];
  if (tratamentoOral && tratamentoOral.trim()) {
    linhasTrat.push(`<li><strong>Uso Oral:</strong> ${tratamentoOral.trim().replace(/\n/g, '; ')}</li>`);
  }
  if (tratamentoOD && tratamentoOD.trim()) {
    linhasTrat.push(`<li><strong>Olho Direito (OD):</strong> ${tratamentoOD.trim().replace(/\n/g, '; ')}</li>`);
  }
  if (tratamentoOE && tratamentoOE.trim()) {
    linhasTrat.push(`<li><strong>Olho Esquerdo (OE):</strong> ${tratamentoOE.trim().replace(/\n/g, '; ')}</li>`);
  }
  const blocoTratamento = linhasTrat.length > 0
    ? `<ul style="margin:6px 0 0 18px;padding:0;line-height:1.7;">${linhasTrat.join('')}</ul>`
    : `<p style="margin:4px 0 0 0;color:#64748b;font-style:italic;">Nenhum medicamento específico prescrito no momento.</p>`;

  const textoRetorno = (retornoOuAlta && retornoOuAlta.trim())
    ? retornoOuAlta.trim()
    : 'Retorno caso observe qualquer piora, desconforto ou secreção ocular. Seguir as orientações recomendadas.';

  html += `
      <!-- RESUMO DO ATENDIMENTO -->
      <div style="background:#eff6ff;border:2px solid #2563eb;border-radius:14px;padding:22px;margin:28px 0;box-shadow:0 2px 6px rgba(37,99,235,0.06);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;border-bottom:1.5px solid #bfdbfe;padding-bottom:10px;">
          <h3 style="color:#1e40af;font-size:18px;margin:0;font-weight:700;">📌 Resumo do Atendimento</h3>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;font-size:14px;color:#1e293b;">
          <div>
            <span style="font-weight:700;color:#1e40af;display:block;margin-bottom:3px;">🔍 Diagnóstico Provável:</span>
            <p style="margin:0;line-height:1.6;white-space:pre-wrap;font-weight:500;">${
              diagnostico.trim() || 'Avaliação clínica dentro dos parâmetros normais observados no momento.'
            }</p>
          </div>

          <div>
            <span style="font-weight:700;color:#1e40af;display:block;margin-bottom:3px;">💊 Tratamento Instituído:</span>
            ${blocoTratamento}
          </div>

          <div style="background:#ffffff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;">
            <span style="font-weight:700;color:#1e40af;display:block;margin-bottom:3px;">🗓️ Retorno / Conduta Médica:</span>
            <p style="margin:0;line-height:1.6;font-weight:600;color:#0f172a;">${textoRetorno}</p>
          </div>
        </div>
      </div>

      <div style="margin-top:36px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px;">
        <p style="margin:4px 0;color:#1e293b;font-weight:700;font-size:14px;">Dr. Adélio Gurgel do Amaral Jr.</p>
        <p style="margin:2px 0;">CRMV-SP 18.721</p>
        <p style="margin:2px 0;">Serviço de Oftalmologia Veterinária - HVA</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#2563eb;font-weight:600;">Dúvidas ou emergências? Contate o HVA: (14) 3626-5287</p>
      </div>
    </div>
  `;
  return html;
}

export function gerarRelatorioProntuario(
  patient: Patient,
  location: LocationInfo,
  examsOD: EyeExamData,
  examsOE: EyeExamData,
  examesComplementares: ComplementaryExamData,
  diagnostico: string,
  consulta: ConsultaSummary | null,
  tratamentoOral?: string,
  tratamentoOD?: string,
  tratamentoOE?: string,
  retornoOuAlta?: string
): string {
  const linhas: string[] = [];
  linhas.push('RELATÓRIO - PRONTUÁRIO MÉDICO OFTALMOLÓGICO');
  linhas.push('=================================================');
  linhas.push(`Data: ${location.data || new Date().toLocaleDateString('pt-BR')}  |  Tipo: ${location.tipoConsulta || 'Consulta'}`);
  linhas.push(
    `Paciente: ${patient.nome || '_'}  |  Espécie/Raça: ${patient.especie || '_'}/${patient.raca || '_'}  |  Idade: ${
      patient.idade || '_'
    }`
  );
  linhas.push(`Tutor: ${patient.tutor || '_'}`);
  linhas.push('');
  linhas.push('ALTERAÇÕES ENCONTRADAS NO EXAME CLÍNICO:');
  linhas.push('-------------------------------------------------');

  let temAlteracao = false;

  function listarAlteracoes(label: string, exame: EyeExamData, schirmer?: string, pio?: string) {
    const bloco: string[] = [];
    if (schirmer) {
      const r = interpretSchirmer(schirmer);
      if (r !== 'Normal') bloco.push(`- Schirmer: ${schirmer} mm/min (${r})`);
    }
    if (pio) {
      const r = interpretPio(pio);
      if (r !== 'Normal') bloco.push(`- PIO: ${pio} mmHg (${r})`);
    }
    ESTRUTURAS.forEach((est) => {
      const v = exame[est.key];
      if (v && v.trim()) bloco.push(`- ${est.label}: ${v.trim()}`);
    });
    TESTES_CORNEA.forEach((t) => {
      const v = exame[t.key];
      if (v && v.trim()) bloco.push(`- ${t.label}: ${v.trim()}`);
    });
    if (bloco.length > 0) {
      temAlteracao = true;
      linhas.push(`${label}:`);
      linhas.push(...bloco);
      linhas.push('');
    }
  }

  listarAlteracoes('Olho Direito (OD)', examsOD, examsOD.schirmer, examsOD.pio);
  listarAlteracoes('Olho Esquerdo (OE)', examsOE, examsOE.schirmer, examsOE.pio);

  EXAMES_COMPLEMENTARES.forEach((ex) => {
    const v = examesComplementares[ex.key];
    if (v && v.trim()) {
      temAlteracao = true;
      linhas.push(`${ex.label}: ${v.trim()}`);
      linhas.push('');
    }
  });

  if (!temAlteracao) {
    linhas.push('Nenhuma alteração patológica identificada (exame ocular nos limites da normalidade).');
    linhas.push('');
  }

  if (consulta && (consulta.resumo || (consulta.topicos || []).length)) {
    linhas.push('RESUMO E TRANSCRIÇÃO DA CONSULTA:');
    linhas.push('-------------------------------------------------');
    if (consulta.resumo) {
      linhas.push(consulta.resumo.trim());
      linhas.push('');
    }
    (consulta.topicos || []).forEach((tp) => {
      linhas.push(`${tp.titulo}:`);
      (tp.itens || []).forEach((it) => linhas.push(`  • ${it}`));
      linhas.push('');
    });
  }

  linhas.push('=================================================');
  linhas.push('RESUMO DO ATENDIMENTO:');
  linhas.push('-------------------------------------------------');
  linhas.push(`DIAGNÓSTICO PROVÁVEL: ${diagnostico.trim() || 'A definir / Sem diagnóstico formal registrado'}`);
  linhas.push('');

  linhas.push('TRATAMENTO INSTITUÍDO:');
  let temTrat = false;
  if (tratamentoOral && tratamentoOral.trim()) {
    linhas.push(`• Uso Oral: ${tratamentoOral.trim().replace(/\n/g, ' / ')}`);
    temTrat = true;
  }
  if (tratamentoOD && tratamentoOD.trim()) {
    linhas.push(`• Olho Direito (OD): ${tratamentoOD.trim().replace(/\n/g, ' / ')}`);
    temTrat = true;
  }
  if (tratamentoOE && tratamentoOE.trim()) {
    linhas.push(`• Olho Esquerdo (OE): ${tratamentoOE.trim().replace(/\n/g, ' / ')}`);
    temTrat = true;
  }
  if (!temTrat) {
    linhas.push('• Nenhum tratamento medicamentoso prescrito nesta data.');
  }
  linhas.push('');

  const condutaFinal = (retornoOuAlta && retornoOuAlta.trim())
    ? retornoOuAlta.trim()
    : 'Retorno caso necessário / a critério clínico';
  linhas.push(`RETORNO OU ALTA MÉDICA: ${condutaFinal}`);
  linhas.push('=================================================');
  linhas.push('');
  linhas.push('Dr. Adélio Gurgel do Amaral Jr. - CRMV-SP 18.721');
  linhas.push('Serviço de Oftalmologia Veterinária - HVA');

  return linhas.join('\n');
}
