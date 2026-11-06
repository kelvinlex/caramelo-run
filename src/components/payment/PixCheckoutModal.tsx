import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Copy, Check, Clock, ShieldCheck, Sparkles, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../services/soundEffects';
import { apiService, API_BASE_URL } from '../../services/apiService';
import { storage } from '../../services/storageService';
import { User } from '../../types';

interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    title: string;
    priceBrl: number;
    tipoItem: 'SKIN' | 'PACOTE_MOEDAS' | 'PASSE_TEMPORADA';
    itemId?: string;
  } | null;
  currentUser: User | null;
  onSuccess?: (updatedUser?: User) => void;
}

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED' | 'ERROR'>('PENDING');
  const [pixData, setPixData] = useState<{
    transactionId?: string;
    asaasPaymentId?: string;
    pixCopiaECola?: string;
    pixQrCodeBase64?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos em segundos

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar geração do PIX ao abrir o modal
  useEffect(() => {
    if (!isOpen || !item) return;

    setLoading(true);
    setErrorMsg('');
    setPaymentStatus('PENDING');
    setTimeLeft(900);

    const userToUse = currentUser || storage.getCurrentUser() || { id: 'usr-guest', nickname: 'ViraLata', email: 'guest@caramelorun.com.br' };

    apiService.generateAsaasPix({
      userId: userToUse.id,
      amount: item.priceBrl,
      description: item.title,
      tipoItem: item.tipoItem,
      itemId: item.itemId
    }).then((res) => {
      setLoading(false);
      if (res.success) {
        setPixData(res);
        sound.playCoin();
      } else {
        setErrorMsg(res.error || 'Não foi possível se comunicar com o banco Asaas.');
        setPaymentStatus('ERROR');
      }
    }).catch((err) => {
      setLoading(false);
      setErrorMsg('Erro de conexão ao gerar cobrança PIX.');
      setPaymentStatus('ERROR');
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, item]);

  // Regressivo de 15 minutos
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'PENDING') return;

    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          setPaymentStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, paymentStatus]);

  // Polling a cada 3 segundos para checar confirmação automática do PIX
  useEffect(() => {
    if (!isOpen || !pixData?.asaasPaymentId || paymentStatus !== 'PENDING') return;

    pollTimerRef.current = setInterval(async () => {
      const statusRes = await apiService.checkAsaasPixStatus(pixData.asaasPaymentId!);
      if (statusRes && statusRes.status === 'Aprovado') {
        clearInterval(pollTimerRef.current!);
        setPaymentStatus('APPROVED');
        sound.playWin();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

        // Atualiza o estado do usuário
        if (currentUser) {
          const updated = await apiService.syncUser(currentUser.id);
          if (updated) {
            storage.setCurrentUser(updated);
            if (onSuccess) onSuccess(updated);
          }
        }

        setTimeout(() => {
          onClose();
        }, 3500);
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, pixData, paymentStatus]);

  if (!isOpen || !item) return null;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyPix = () => {
    if (!pixData?.pixCopiaECola) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulateAutoApproval = async () => {
    if (!pixData?.asaasPaymentId) return;
    try {
      await fetch(`${API_BASE_URL}/payments/asaas/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'PAYMENT_RECEIVED',
          payment: { id: pixData.asaasPaymentId }
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-5 md:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800 hover:bg-stone-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Pagamento Seguro via Banco Asaas
          </span>
        </div>

        <h3 className="text-xl font-black text-amber-400 font-fun mt-1 text-center">
          Checkout PIX Instantâneo
        </h3>
        <p className="text-xs text-stone-400 text-center mb-4">
          {item.title} • <strong className="text-emerald-400 font-mono text-sm">R$ {item.priceBrl.toFixed(2)}</strong>
        </p>

        {/* LOADING STATE */}
        {loading && (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-amber-300 font-semibold animate-pulse">
              Gerando QR Code PIX com o Banco Asaas...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && paymentStatus === 'ERROR' && (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-400">{errorMsg}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl"
            >
              Fechar e Tentar Novamente
            </button>
          </div>
        )}

        {/* APPROVED SUCCESS STATE */}
        {!loading && paymentStatus === 'APPROVED' && (
          <div className="py-8 text-center space-y-3 animate-in zoom-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h4 className="text-2xl font-black text-emerald-400 font-fun">
              PAGAMENTO CONFIRMADO! 🎉
            </h4>
            <p className="text-xs text-stone-300">
              Sua compra foi liberada no banco MySQL com sucesso. Divirta-se na quebrada!
            </p>
          </div>
        )}

        {/* PENDING PAYMENT FORM */}
        {!loading && paymentStatus === 'PENDING' && pixData && (
          <div className="w-full space-y-4 flex flex-col items-center">
            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl border-4 border-amber-400 shadow-xl flex items-center justify-center">
              {pixData.pixQrCodeBase64 ? (
                <img
                  src={pixData.pixQrCodeBase64}
                  alt="QR Code PIX Asaas"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                /* Fallback SVG QR Code decorativo */
                <div className="w-48 h-48 bg-stone-100 flex flex-col items-center justify-center text-stone-800 p-2 text-center">
                  <QrCode className="w-24 h-24 text-stone-900 mb-1" />
                  <span className="text-[10px] font-bold font-mono">PIX ASAAS R$ {item.priceBrl.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Timer countdown */}
            <div className="flex items-center gap-2 bg-stone-800/90 px-4 py-1.5 rounded-full border border-stone-700 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-stone-300">Expira em:</span>
              <strong className="text-amber-400 font-bold">{formatTimer(timeLeft)}</strong>
            </div>

            {/* Copia e Cola Input */}
            <div className="w-full space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center">
                Código PIX Copia e Cola
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={pixData.pixCopiaECola}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono pr-24 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`absolute right-1 top-1 bottom-1 px-3 rounded-lg text-xs font-bold font-fun flex items-center gap-1 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="w-full bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 text-[11px] text-stone-400 space-y-1 text-center">
              <p className="flex items-center justify-center gap-1 text-stone-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Confirmação Automática Ativa
              </p>
              <p>Abra o app do seu banco, escolha PIX e cole o código acima ou escaneie o QR Code.</p>
            </div>

            {/* Botão de teste para simular baixa do webhook */}
            <button
              onClick={handleSimulateAutoApproval}
              className="text-[10px] text-stone-500 hover:text-amber-400 underline font-mono cursor-pointer pt-1"
            >
              ⚡ Simular Confirmação Instantânea Asaas (Dev Test)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
