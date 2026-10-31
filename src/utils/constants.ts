export interface EstruturaDef {
  key: string;
  label: string;
  normal: string;
  explicacao: string;
}

export const ESTRUTURAS: EstruturaDef[] = [
  { key: 'palpebras', label: 'Pálpebras', normal: 'sem alterações', explicacao: 'Pálpebras protegem os olhos' },
  { key: 'terceiraPalpebra', label: '3ª Pálpebra', normal: 'sem alterações', explicacao: 'Membrana de proteção adicional' },
  { key: 'conjuntiva', label: 'Conjuntiva', normal: 'normocorada, sem secreção', explicacao: 'Membrana que reveste o olho' },
  { key: 'cornea', label: 'Córnea', normal: 'transparente, lisa, sem infiltrados', explicacao: 'Parte transparente da frente do olho' },
  { key: 'camaraAnterior', label: 'Câmara Anterior', normal: 'profunda, límpida', explicacao: 'Espaço entre a córnea e a íris' },
  { key: 'iris', label: 'Íris', normal: 'normoconformada', explicacao: 'Parte colorida do olho' },
  { key: 'pupila', label: 'Pupila', normal: 'normorreagente, simétrica', explicacao: 'Abertura central que regula a entrada de luz' },
  { key: 'cristalino', label: 'Cristalino', normal: 'transparente, tópico', explicacao: 'Lente natural do olho' },
  { key: 'vitreo', label: 'Vítreo', normal: 'transparente, sem opacidades', explicacao: 'Gel que preenche o interior do olho' },
  { key: 'retina', label: 'Retina', normal: 'vasos bem definidos, sem hemorragias', explicacao: 'Camada sensível à luz no fundo do olho' },
  { key: 'nervoOptico', label: 'Nervo Óptico', normal: 'normoconformado, sem edema', explicacao: 'Transmite sinais visuais ao cérebro' },
];

export const TESTES_CORNEA = [
  { key: 'fluoresceina', label: 'Fluoresceína' },
  { key: 'rosaBengala', label: 'Rosa Bengala' },
  { key: 'fenilefrina', label: 'Fenilefrina' },
];

export const EXAMES_COMPLEMENTARES = [
  { key: 'ultrassom', label: 'Ultrassom Ocular', hasPhoto: true },
  { key: 'cultura', label: 'Cultura e Antibiograma', hasPhoto: false },
  { key: 'fotocromatico', label: 'Teste Fotocromático', hasPhoto: false },
  { key: 'erg', label: 'ERG (Eletrorretinografia)', hasPhoto: false },
  { key: 'laboratoriais', label: 'Exames Laboratoriais', hasPhoto: false },
];

export const TRADUCOES_TUTOR: Record<string, string> = {
  normocorada: 'com cor saudável',
  'sem secreção': 'limpa, sem secreção',
  transparente: 'cristalina e transparente',
  lisa: 'lisa e uniforme',
  'sem infiltrados': 'sem manchas ou lesões',
  profunda: 'com profundidade normal',
  límpida: 'límpida e clara',
  normoconformada: 'com formato normal',
  normorreagente: 'reagindo normalmente à luz',
  simétrica: 'simétrica',
  tópico: 'na posição correta',
  'sem opacidades': 'sem turvações',
  'vasos bem definidos': 'vasos sanguíneos saudáveis',
  'sem hemorragias': 'sem sangramentos',
  normoconformado: 'com aparência normal',
  'sem edema': 'sem inchaço',
  'sem alterações': 'sem alterações',
};

export const PROMPT_PADRAO =
  'Faça um resumo objetivo da consulta, destacando queixa, achados, diagnóstico, tratamento e orientações dadas ao tutor, além de qualquer assunto que valha lembrar no retorno.';

export const CFG_KEY = 'hva_gemini_cfg_v2';
export const MODELO_PADRAO = 'gemini-3.5-flash';
export const RASCUNHO_KEY = 'hva_gemini_rascunho_v1';
export const SEGMENTO_MS = 5 * 60 * 1000;
