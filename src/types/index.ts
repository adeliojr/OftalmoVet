export interface Patient {
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  idade: string;
  tutor: string;
}

export interface LocationInfo {
  data: string;
  tipoConsulta: string;
}

export interface EyeExamData {
  schirmer?: string;
  pio?: string;
  palpebras?: string;
  palpebras_photos?: string[];
  terceiraPalpebra?: string;
  terceiraPalpebra_photos?: string[];
  conjuntiva?: string;
  conjuntiva_photos?: string[];
  cornea?: string;
  cornea_photos?: string[];
  camaraAnterior?: string;
  camaraAnterior_photos?: string[];
  iris?: string;
  iris_photos?: string[];
  pupila?: string;
  pupila_photos?: string[];
  cristalino?: string;
  cristalino_photos?: string[];
  vitreo?: string;
  vitreo_photos?: string[];
  retina?: string;
  retina_photos?: string[];
  nervoOptico?: string;
  nervoOptico_photos?: string[];
  fluoresceina?: string;
  rosaBengala?: string;
  fenilefrina?: string;
  [key: string]: any;
}

export interface ComplementaryExamData {
  ultrassom?: string;
  ultrassom_photos?: string[];
  cultura?: string;
  fotocromatico?: string;
  erg?: string;
  laboratoriais?: string;
  [key: string]: any;
}

export interface TopicItem {
  titulo: string;
  itens: string[];
}

export interface ConsultaSummary {
  resumo: string;
  topicos: TopicItem[];
  transcricao: string;
  queixa?: string;
  diagnostico?: string;
  tratamentoOral?: string;
  tratamentoOD?: string;
  tratamentoOE?: string;
  retornoOuAlta?: string;
  geradoEm: string;
}

export interface Atendimento {
  id: string;
  data: string;
  patient: Patient;
  location: LocationInfo;
  chiefComplaint: string;
  examsOD: EyeExamData;
  examsOE: EyeExamData;
  examesComplementares: ComplementaryExamData;
  tratamentoOral: string;
  tratamentoOD: string;
  tratamentoOE: string;
  diagnostico: string;
  retornoOuAlta?: string;
  consulta: ConsultaSummary | null;
}

export interface FichaPaciente {
  id: string;
  criadoEm: number;
  atualizadoEm?: number;
  paciente: Patient;
  atendimentos: Atendimento[];
}

export interface GeminiConfig {
  chave: string;
  modelo: string;
  prompt: string;
}

export interface SegmentoAudio {
  id: string;
  numero: number;
  tempoInicio: string; // "00:00"
  tempoFim: string; // "05:00"
  segundosInicio: number;
  segundosFim: number;
  blobWebm?: Blob;
  base64Mp3?: string;
  mp3Blob?: Blob;
  mp3Url?: string;
  transcricao?: string;
  status: 'gravando' | 'convertendo' | 'transcrevendo' | 'concluido' | 'erro';
  erroMsg?: string;
}

