import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, QrCode, CheckCircle2, Copy, Check, X, Camera, RefreshCw, Eye, Image as ImageIcon } from 'lucide-react';
import { EyeExamData, ComplementaryExamData } from '../../types';

interface FotoOutroCelularModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  examsOD: EyeExamData;
  setExamsOD: React.Dispatch<React.SetStateAction<EyeExamData>>;
  examsOE: EyeExamData;
  setExamsOE: React.Dispatch<React.SetStateAction<EyeExamData>>;
  examesComplementares: ComplementaryExamData;
  setExamesComplementares: React.Dispatch<React.SetStateAction<ComplementaryExamData>>;
  onAviso: (msg: string, erro?: boolean) => void;
}

interface FotoRecebida {
  id: string;
  dataUrl: string;
  target: string;
  timestamp: number;
}

export const FotoOutroCelularModal: React.FC<FotoOutroCelularModalProps> = ({
  isOpen,
  onClose,
  patientName,
  examsOD,
  setExamsOD,
  examsOE,
  setExamsOE,
  examesComplementares,
  setExamesComplementares,
  onAviso,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [fotosRecebidas, setFotosRecebidas] = useState<FotoRecebida[]>([]);
  const [novaFotoAlerta, setNovaFotoAlerta] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Play gentle ding on new photo
  function tocarSomSucesso() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const actx = new AudioContextClass();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, actx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, actx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.35);
    } catch {}
  }

  // Criar ou renovar sessão
  async function iniciarSessao() {
    setCarregando(true);
    try {
      const res = await fetch('/api/sync/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: patientName || 'Paciente HVA' }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (err) {
      console.error('Erro ao criar sessão de fotos:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (!sessionId) {
        iniciarSessao();
      }
    } else {
      clearInterval(pollTimerRef.current);
    }
  }, [isOpen]);

  // Polling para checar novas fotos enviadas pelo segundo celular
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/${sessionId}/photos`);
        if (!res.ok) return;
        const data = await res.json();
        const novas: FotoRecebida[] = data.photos || [];

        if (novas.length > 0) {
          tocarSomSucesso();
          setFotosRecebidas((prev) => [...novas, ...prev]);

          novas.forEach((item) => {
            distribuirFoto(item);
          });

          const msg = novas.length === 1
            ? `📸 Foto recebida do 2º celular e inserida no prontuário!`
            : `📸 ${novas.length} fotos recebidas e inseridas no prontuário!`;
          setNovaFotoAlerta(msg);
          onAviso(msg);
          setTimeout(() => setNovaFotoAlerta(null), 4000);
        }
      } catch (err) {
        // silencioso
      }
    }, 2000);

    return () => clearInterval(pollTimerRef.current);
  }, [isOpen, sessionId]);

  function distribuirFoto(item: FotoRecebida) {
    const { target, dataUrl } = item;

    if (target === 'OD') {
      setExamsOD((prev) => ({
        ...prev,
        anexos_photos: [...(prev.anexos_photos || []), dataUrl],
      }));
    } else if (target === 'OE') {
      setExamsOE((prev) => ({
        ...prev,
        anexos_photos: [...(prev.anexos_photos || []), dataUrl],
      }));
    } else if (target === 'OD_cornea') {
      setExamsOD((prev) => ({
        ...prev,
        cornea_photos: [...(prev.cornea_photos || []), dataUrl],
      }));
    } else if (target === 'OE_cornea') {
      setExamsOE((prev) => ({
        ...prev,
        cornea_photos: [...(prev.cornea_photos || []), dataUrl],
      }));
    } else if (target === 'ultrassom') {
      setExamesComplementares((prev) => ({
        ...prev,
        ultrassom_photos: [...(prev.ultrassom_photos || []), dataUrl],
      }));
    } else {
      // geral -> Olho Direito anexos
      setExamsOD((prev) => ({
        ...prev,
        anexos_photos: [...(prev.anexos_photos || []), dataUrl],
      }));
    }
  }

  if (!isOpen) return null;

  const urlSessao = sessionId
    ? `${window.location.origin}/sync/${sessionId}`
    : '';
  const qrCodeUrl = sessionId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlSessao)}&margin=10`
    : '';

  function copiarLink() {
    if (!urlSessao) return;
    navigator.clipboard.writeText(urlSessao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight">
                Fotos de Outro Celular (Câmera Secundária)
              </h3>
              <p className="text-xs text-blue-200">
                Aponte a câmera do seu segundo celular para o QR Code para enviar fotos direto para esta ficha
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 bg-slate-50/60">
          {novaFotoAlerta && (
            <div className="bg-emerald-600 text-white p-3 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md animate-bounce">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{novaFotoAlerta}</span>
            </div>
          )}

          {/* QR Code and Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              {carregando ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-xs">Gerando código de conexão...</span>
                </div>
              ) : qrCodeUrl ? (
                <div className="text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm inline-block">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code para conectar câmera"
                      className="w-48 h-48 md:w-52 md:h-52 object-contain"
                    />
                  </div>
                  <div className="mt-2.5 inline-block bg-blue-50 text-blue-800 font-mono font-bold text-xs px-3 py-1 rounded-lg border border-blue-200">
                    Sessão: {sessionId}
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-red-500 text-xs">
                  Erro ao carregar QR Code
                </div>
              )}
            </div>

            <div className="space-y-3.5 text-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-xs md:text-sm">
                  Abra a câmera do seu celular com lente macro/oftalmológica e <strong>aponte para o QR Code ao lado</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-xs md:text-sm">
                  Toque na notificação amarela que abrirá no celular: abrirá uma página leve e rápida da câmera.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-xs md:text-sm">
                  Escolha se a foto é do <strong>Olho Direito (OD)</strong>, <strong>Olho Esquerdo (OE)</strong>, Córnea ou Ultrassom, tire a foto e pronto! Ela aparecerá aqui automaticamente.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copiarLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                <a
                  href={urlSessao}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Testar Neste Aparelho</span>
                </a>
              </div>
            </div>
          </div>

          {/* Fotos Recebidas nesta sessão */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Fotos Recebidas nesta Conexão ({fotosRecebidas.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {fotosRecebidas.length > 0 ? 'Já anexadas à ficha' : 'Aguardando o envio do 2º celular...'}
              </span>
            </div>

            {fotosRecebidas.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-xs">
                Nenhuma foto recebida ainda. Aponte o segundo celular para o QR Code e tire uma foto para testar!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                {fotosRecebidas.map((item, idx) => (
                  <div key={item.id || idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={item.dataUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 px-2 py-1 text-[10px] text-white flex items-center justify-between backdrop-blur-2xs">
                      <span className="font-bold text-blue-300">
                        {item.target === 'OD' ? 'Olho Dir.' : item.target === 'OE' ? 'Olho Esq.' : item.target}
                      </span>
                      <span className="text-slate-300">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Aguardando fotos em tempo real...
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-sm transition-all"
          >
            Concluir / Voltar à Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
