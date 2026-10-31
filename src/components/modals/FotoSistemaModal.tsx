import React, { useState, useEffect } from 'react';
import { Camera, Upload, Clipboard, Sparkles, Check, X, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { extrairDadosPacienteFoto, PacienteExtraidoOCR } from '../../services/geminiClient';
import { fileToDataURL } from '../../utils/formatters';

interface FotoSistemaModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAplicar: (dados: {
    nome: string;
    especie: string;
    raca: string;
    sexo: string;
    idade: string;
    tutor: string;
    tipoConsulta?: string;
  }) => void;
  chaveUsuario?: string;
}

export const FotoSistemaModal: React.FC<FotoSistemaModalProps> = ({
  aberto,
  onFechar,
  onAplicar,
  chaveUsuario,
}) => {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  // Editable extracted fields
  const [nome, setNome] = useState('');
  const [especie, setEspecie] = useState('');
  const [raca, setRaca] = useState('');
  const [sexo, setSexo] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [idade, setIdade] = useState('');
  const [tutor, setTutor] = useState('');
  const [tipoConsulta, setTipoConsulta] = useState('');
  const [extraidoSucesso, setExtraidoSucesso] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setImagemUrl(null);
      setImagemBase64(null);
      setProcessando(false);
      setErro('');
      setExtraidoSucesso(false);
    }
  }, [aberto]);

  // Support paste (Ctrl+V) anywhere inside the modal
  useEffect(() => {
    if (!aberto) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processarArquivo(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [aberto]);

  if (!aberto) return null;

  async function processarArquivo(file: File) {
    setErro('');
    setExtraidoSucesso(false);
    setProcessando(true);

    try {
      const dataUrl = await fileToDataURL(file);
      setImagemUrl(dataUrl);

      const parts = dataUrl.split(',');
      const base64 = parts[1] || '';
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || file.type || 'image/jpeg';
      setImagemBase64(base64);
      setMimeType(mime);

      // Call extraction API
      const extraido: PacienteExtraidoOCR = await extrairDadosPacienteFoto(base64, mime, chaveUsuario);

      setNome(extraido.nome || '');
      setEspecie(extraido.especie || '');
      setRaca(extraido.raca || '');
      setSexo(extraido.sexo || '');
      setDataNascimento(extraido.dataNascimento || '');
      setIdade(extraido.idade || '');
      setTutor(extraido.tutor || '');
      setTipoConsulta(extraido.tipoConsulta || '');
      setExtraidoSucesso(true);
    } catch (err: any) {
      setErro(err.message || 'Falha ao processar a imagem do sistema hospitalar.');
    } finally {
      setProcessando(false);
    }
  }

  function handleSalvar() {
    let idadeFinal = idade.trim();
    if (dataNascimento.trim() && !idadeFinal) {
      idadeFinal = `Nasc: ${dataNascimento.trim()}`;
    } else if (dataNascimento.trim() && idadeFinal) {
      idadeFinal = `${idadeFinal} (Nasc: ${dataNascimento.trim()})`;
    }

    onAplicar({
      nome: nome.trim(),
      especie: especie.trim(),
      raca: raca.trim(),
      sexo: sexo.trim(),
      idade: idadeFinal,
      tutor: tutor.trim(),
      tipoConsulta: tipoConsulta.trim() || undefined,
    });
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6 overflow-y-auto"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-blue-950">
                Foto da Tela do Sistema Hospitalar
              </h3>
              <p className="text-xs text-blue-700">
                Aponte a câmera para o computador ou cole um print para preencher os dados
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onFechar}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!imagemUrl && (
            <div className="border-2 border-dashed border-blue-200 rounded-2xl p-6 md:p-8 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Camera className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h4 className="font-bold text-slate-800 text-base mb-1">
                Fotografe ou envie a tela do sistema
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                A IA lerá a tela do computador ou ficha impressa e extrairá automaticamente o nome do paciente, espécie, raça, idade/nascimento e tutor.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Take photo directly with mobile camera */}
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm cursor-pointer transition-all active:scale-[0.98]">
                  <Camera className="w-4 h-4" />
                  <span>Tirar Foto (Câmera)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processarArquivo(file);
                    }}
                  />
                </label>

                {/* Choose from gallery / file */}
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-300 shadow-2xs cursor-pointer transition-all active:scale-[0.98]">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Escolher Imagem / Arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processarArquivo(file);
                    }}
                  />
                </label>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-100/70 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <Clipboard className="w-3.5 h-3.5 text-blue-500" />
                <span>No computador, você também pode pressionar <strong>Ctrl + V</strong> para colar um print da tela</span>
              </div>
            </div>
          )}

          {imagemUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Foto selecionada:</span>
                <label className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Trocar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processarArquivo(file);
                    }}
                  />
                </label>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 aspect-video flex items-center justify-center">
                <img src={imagemUrl} alt="Tela do sistema" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          {processando && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
              <div>
                <p className="text-sm font-bold">Lendo a tela com Inteligência Artificial...</p>
                <p className="text-xs text-blue-700">Identificando paciente, espécie, raça, data de nascimento e tutor</p>
              </div>
            </div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 flex items-start gap-2 text-xs md:text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {extraidoSucesso && !processando && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Dados identificados pela IA! Confira e edite se necessário:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Paciente:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tutor(a):</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    value={tutor}
                    onChange={(e) => setTutor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Espécie:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    value={especie}
                    onChange={(e) => setEspecie(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Raça:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    value={raca}
                    onChange={(e) => setRaca(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sexo:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Idade / Nascimento:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: 5 anos (Nasc: 10/05/2019)"
                    value={idade || dataNascimento}
                    onChange={(e) => setIdade(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>

          {extraidoSucesso && (
            <button
              onClick={handleSalvar}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>Preencher Ficha do Paciente</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
