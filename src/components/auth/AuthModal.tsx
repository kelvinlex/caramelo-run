import React, { useState } from 'react';
import { X, Dices, Shield, User as UserIcon, Sparkles, Dog, Lock, Mail, ArrowRight } from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';
import { generateRandomNickname } from '../../data/initialData';
import { CarameloAvatar } from '../common/CarameloAvatar';
import { UserRole } from '../../types';
import { SteelCornerBrackets, OctagonCloseButton } from '../common/CartoonWoodUI';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'guest'>('guest');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBiting, setIsBiting] = useState(false);
  const [boneMasked, setBoneMasked] = useState(true);

  if (!isOpen) return null;

  const handleRandomizeNick = () => {
    sound.playClick();
    const random = generateRandomNickname();
    setNickname(random);
  };

  const handleGuestLogin = () => {
    sound.playBark();
    setIsBiting(true);
    setTimeout(() => {
      setIsBiting(false);
      storage.loginAsGuest(nickname);
      onSuccess();
      onClose();
    }, 400);
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    sound.playClick();
    setIsBiting(true);
    setTimeout(() => {
      setIsBiting(false);
      const randomNick = nickname || `${provider === 'google' ? 'Google' : 'Apple'}Caramelo${Math.floor(Math.random() * 900 + 100)}`;
      storage.registerUser(randomNick, `${randomNick.toLowerCase()}@${provider}.com`);
      onSuccess();
      onClose();
    }, 300);
  };

  const handleRoleQuickLogin = (role: UserRole) => {
    sound.playClick();
    storage.loginWithRole(role);
    onSuccess();
    onClose();
  };

  const handleCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMsg('Preencha seu apelido de vira-lata!');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), email: email.trim() })
      });
      
      if (!response.ok) {
        const err = await response.json();
        setErrorMsg(err.error || 'Erro ao registrar.');
        return;
      }
      
      let user = await response.json();
      
      if (typeof user.inventarioSkins === 'string') {
        user.inventarioSkinIds = JSON.parse(user.inventarioSkins);
      }

      user.stats = {
        maiorPontuacao: user.maiorPontuacao || 0,
        motoqueirosMordidos: user.motoqueirosMordidos || 0,
        chinelosDesviados: user.chinelosDesviados || 0,
        distanciaKm: user.distanciaKm || 0,
        statusQuebrada: user.statusQuebrada || 'Filhote'
      };
      
      storage.setCurrentUser(user);
      sound.playWin();
      onSuccess();
      onClose();
    } catch (error) {
      setErrorMsg('Erro de conexão com o servidor MySQL.');
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), email: nickname.trim() })
      });
      
      if (!response.ok) {
        const err = await response.json();
        setErrorMsg(err.error || 'Jogador não encontrado na quebrada!');
        sound.playClick();
        return;
      }

      let user = await response.json();
      
      if (typeof user.inventarioSkins === 'string') {
        user.inventarioSkinIds = JSON.parse(user.inventarioSkins);
      }

      user.stats = {
        maiorPontuacao: user.maiorPontuacao || 0,
        motoqueirosMordidos: user.motoqueirosMordidos || 0,
        chinelosDesviados: user.chinelosDesviados || 0,
        distanciaKm: user.distanciaKm || 0,
        statusQuebrada: user.statusQuebrada || 'Filhote'
      };
      
      storage.setCurrentUser(user);
      sound.playBark();
      onSuccess();
      onClose();
    } catch (error) {
      setErrorMsg('Erro de conexão com o servidor MySQL.');
      sound.playClick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg cartoon-wood-board p-5 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.9)] text-stone-100 overflow-hidden">
        <SteelCornerBrackets size="md" />

        {/* Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <OctagonCloseButton onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10" />
        </div>

        {/* Mascot & Meme Banner */}
        <div className="flex flex-col items-center text-center mb-5 z-10 relative">
          <div className={`relative transition-transform duration-300 ${isBiting ? 'scale-110 rotate-[-6deg]' : ''}`}>
            <CarameloAvatar size="md" isBarking={isBiting} />
            {isBiting && (
              <span className="absolute -top-3 -right-6 px-2.5 py-0.5 cartoon-btn-red text-white font-black text-xs rounded-full animate-bounce">
                NHAAC! 🦷
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-[#ffea85] cartoon-title-gold-3d mt-2 tracking-wide">
            PORTAL DO CARAMELO
          </h3>
          <p className="text-xs text-amber-100 max-w-xs font-semibold">
            Escolha como quer entrar para correr atrás de motoboys e dominar o ranking!
          </p>
        </div>

        {/* Tab switcher (Beveled Cartoon Buttons) */}
        <div className="grid grid-cols-3 gap-1.5 cartoon-navy-panel p-1.5 mb-5 text-xs font-black z-10 relative">
          <button
            onClick={() => { setActiveTab('guest'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
              activeTab === 'guest' ? 'cartoon-btn-gold text-[#3d2002]' : 'text-slate-300 hover:text-white'
            }`}
          >
            🐕 Sem Dono
          </button>
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
              activeTab === 'login' ? 'cartoon-btn-gold text-[#3d2002]' : 'text-slate-300 hover:text-white'
            }`}
          >
            🔑 Entrar
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
              activeTab === 'register' ? 'cartoon-btn-gold text-[#3d2002]' : 'text-slate-300 hover:text-white'
            }`}
          >
            ✨ Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/80 border-2 border-red-500 rounded-xl text-xs text-red-200 text-center font-bold z-10 relative shadow-md">
            🐕 Au au! {errorMsg}
          </div>
        )}

        {/* TAB 1: GUEST / VIRA-LATA SEM DONO */}
        {activeTab === 'guest' && (
          <div className="space-y-4 z-10 relative">
            <div>
              <label className="block text-xs font-black text-amber-200 mb-1.5 flex items-center justify-between">
                <span>Seu Nickname no Jogo</span>
                <span className="text-[11px] text-amber-300">Memes Brasileiros</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: CarameloVeloz, Chinelada..."
                    className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] font-medium shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRandomizeNick}
                  title="Gerar Nickname Meme Aleatório"
                  className="px-3.5 py-2.5 cartoon-btn-steel text-white rounded-xl flex items-center gap-1.5 text-xs font-black shadow-md cursor-pointer"
                >
                  <Dices className="w-4 h-4 text-amber-300" /> 🎲
                </button>
              </div>
            </div>

            {/* Giant Guest Button */}
            <button
              onClick={handleGuestLogin}
              onMouseEnter={() => setIsBiting(true)}
              onMouseLeave={() => setIsBiting(false)}
              className="w-full py-4 cartoon-btn-gold text-[#3d2002] font-black text-sm sm:text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span className="text-xl group-hover:scale-125 transition-transform">🐕</span>
              <span>JOGAR COMO VIRA-LATA SEM DONO</span>
            </button>

            {/* Social Logins */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#543015]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="cartoon-wood-plank px-3 py-0.5 rounded-full text-amber-200 font-black text-[10px]">Ou conecte sua conta</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSocialLogin('google')}
                className="py-2.5 px-4 cartoon-btn-steel text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google
              </button>

              <button
                onClick={() => handleSocialLogin('apple')}
                className="py-2.5 px-4 cartoon-btn-steel text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.1-1.92.98-3.05-1 .04-2.19.67-2.88 1.47-.61.7-.1.14 1.9.98 3.05.99-.03 2.18-.67 2.88-1.47z"/>
                </svg>
                Apple
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleCustomLogin} className="space-y-3.5 z-10 relative">
            <div>
              <label className="block text-xs font-black text-amber-200 mb-1">Nickname ou Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Seu nick de jogador"
                  required
                  className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] font-medium shadow-inner"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-amber-200">Senha</label>
                <button
                  type="button"
                  onClick={() => setBoneMasked(!boneMasked)}
                  className="text-[11px] text-amber-300 hover:underline font-bold"
                >
                  {boneMasked ? '🦴 Modo Ossinhos' : '🔒 Modo Normal'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={boneMasked ? 'password' : 'text'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] tracking-widest font-medium shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 cartoon-btn-gold text-[#3d2002] font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base mt-3"
            >
              ENTRAR NA MATILHA <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 3: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleCustomRegister} className="space-y-3.5 z-10 relative">
            <div>
              <label className="block text-xs font-black text-amber-200 mb-1 flex items-center justify-between">
                <span>Nickname Gamer</span>
                <button
                  type="button"
                  onClick={handleRandomizeNick}
                  className="text-[11px] text-amber-300 hover:underline font-bold flex items-center gap-1"
                >
                  <Dices className="w-3 h-3" /> Gerar Meme
                </button>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: ReyDoLatido, MordeCanela"
                required
                className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] font-medium shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-amber-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] font-medium shadow-inner"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 cartoon-btn-green text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base mt-3"
            >
              CRIAR CONTA & GANHAR 250 OSSOCOINS <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
