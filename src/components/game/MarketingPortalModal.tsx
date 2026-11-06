import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Building2,
  Image as ImageIcon,
  BarChart3,
  CheckCircle2,
  Copy,
  Sparkles,
  X,
  Eye,
  Clock,
  ShieldCheck,
  Upload,
  AlertCircle,
  QrCode,
  CreditCard,
  UserCheck,
  Lock,
  LogOut,
  PlusCircle,
  Check,
  DollarSign,
  TrendingUp,
  Sliders,
  Power,
  Info,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/apiService';
import {
  SteelCornerBrackets,
  OctagonCloseButton,
  OctagonIconBadge,
  SteelRivet,
} from '../common/CartoonWoodUI';

export interface CompanyAccount {
  id: string;
  cnpj: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  password?: string;
  creditBalance: number; // Saldo em R$ para anúncios
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  companyCnpj: string;
  companyName: string;
  title: string;
  imageUrl: string;
  placement: 'outdoors' | 'motoboy_box' | 'track_banners';
  targetImpressions: number;
  currentImpressions: number;
  hoursExposed: number;
  priceReais: number;
  status: 'active' | 'paused' | 'completed' | 'pending_payment';
  asaasPaymentId?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
  createdAt: string;
}

interface MarketingPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated?: (campaign: AdCampaign) => void;
}

const COMPANIES_KEY = 'caramelo_ads_companies_v2';
const CAMPAIGNS_KEY = 'caramelo_ads_campaigns_v2';
const ACTIVE_COMPANY_KEY = 'caramelo_active_company_v2';

export const getStoredCompanies = (): CompanyAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPANIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      id: 'COMP-001',
      cnpj: '12.345.678/0001-90',
      companyName: 'GameFy Brasil Ltda',
      contactName: 'Kelvin Santos',
      email: 'contato@gamefy.net.br',
      phone: '(11) 99999-8888',
      password: '123',
      creditBalance: 250.00,
      createdAt: '01/10/2026',
    },
    {
      id: 'COMP-002',
      cnpj: '98.765.432/0001-10',
      companyName: 'Empresa Teste Anunciante Ltda',
      contactName: 'Anunciante Teste',
      email: 'teste@anunciante.com.br',
      phone: '(11) 98888-7777',
      password: '123',
      creditBalance: 500.00,
      createdAt: '03/10/2026',
    },
  ];
};

export const getActiveCompany = (): CompanyAccount | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const list = getStoredCompanies();
  return list.length > 0 ? list[0] : null;
};

export const setActiveCompanyStorage = (company: CompanyAccount | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (company) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  } catch (e) {}
};

export const updateCompanyBalance = (companyId: string, amount: number) => {
  const companies = getStoredCompanies();
  let updatedComp: CompanyAccount | null = null;
  const next = companies.map((c) => {
    if (c.id === companyId || c.cnpj === companyId) {
      updatedComp = { ...c, creditBalance: +(c.creditBalance + amount).toFixed(2) };
      return updatedComp;
    }
    return c;
  });
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(next));
  if (updatedComp && getActiveCompany()?.id === companyId) {
    setActiveCompanyStorage(updatedComp);
  }
  return updatedComp;
};

export const getStoredCampaigns = (): AdCampaign[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      id: 'CAMP-GAMEFY-001',
      companyCnpj: '12.345.678/0001-90',
      companyName: 'GameFy Brasil',
      title: 'Portal Oficial de Jogos GameFy.net.br',
      imageUrl: '/logo.png',
      placement: 'outdoors',
      targetImpressions: 10000,
      currentImpressions: 3420,
      hoursExposed: 14.5,
      priceReais: 89.90,
      status: 'active',
      createdAt: '01/10/2026',
    },
  ];
};

export const saveCampaignsToStorage = (campaigns: AdCampaign[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  } catch (e) {}
};

export const getActiveAd = (placement: 'outdoors' | 'motoboy_box' | 'track_banners'): AdCampaign | null => {
  const campaigns = getStoredCampaigns();
  const active = campaigns.filter((c) => c.status === 'active' && c.placement === placement);
  if (active.length === 0) return null;
  return active[active.length - 1];
};

export const recordAdImpression = (placement: 'outdoors' | 'motoboy_box' | 'track_banners') => {
  const campaigns = getStoredCampaigns();
  let updated = false;

  const next = campaigns.map((c) => {
    if (c.status === 'active' && (c.placement === placement || c.placement === 'outdoors')) {
      updated = true;
      const newImpressions = c.currentImpressions + 1;
      const newHours = +(c.hoursExposed + 0.002).toFixed(2);
      const isDone = newImpressions >= c.targetImpressions;
      return {
        ...c,
        currentImpressions: newImpressions,
        hoursExposed: newHours,
        status: isDone ? ('completed' as const) : c.status,
      };
    }
    return c;
  });

  if (updated) {
    saveCampaignsToStorage(next);
  }
};

const PACKAGES = [
  { impressions: 5000, price: 49.90, tag: 'INICIANTE' },
  { impressions: 10000, price: 89.90, tag: 'POPULAR ⭐' },
  { impressions: 25000, price: 199.90, tag: 'TURBO 🚀' },
  { impressions: 50000, price: 349.90, tag: 'ULTRA 👑' },
];

export const MarketingPortalModal: React.FC<MarketingPortalModalProps> = ({ isOpen, onClose, onCampaignCreated }) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'manager' | 'add_credit' | 'create_ad'>('auth');
  const [activeCompany, setActiveCompany] = useState<CompanyAccount | null>(null);

  // Auth / Cadastro
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [regCnpj, setRegCnpj] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regContactName, setRegContactName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Adicionar Crédito
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Criar Anúncio
  const [adTitle, setAdTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [placement, setPlacement] = useState<'outdoors' | 'motoboy_box' | 'track_banners'>('outdoors');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);

  // Lista de Campanhas e Alertas
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const company = getActiveCompany();
      setActiveCompany(company);
      const list = getStoredCampaigns();
      setCampaigns(list);

      if (company) {
        setActiveTab('manager');
      } else {
        setActiveTab('auth');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCnpj = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 14);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length > 5) formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 8) formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 12) formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    return formatted;
  };

  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCnpj || !regCompanyName || !regEmail || !regPassword) {
      alert('Por favor, preencha todos os campos obrigatórios (CNPJ, Razão Social, E-mail e Senha).');
      return;
    }

    const newCompany: CompanyAccount = {
      id: `COMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      cnpj: formatCnpj(regCnpj),
      companyName: regCompanyName,
      contactName: regContactName || 'Responsável',
      email: regEmail,
      phone: regPhone || '(11) 99999-9999',
      password: regPassword,
      creditBalance: 0.00,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    const list = getStoredCompanies();
    const updated = [newCompany, ...list];
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(updated));

    setActiveCompany(newCompany);
    setActiveCompanyStorage(newCompany);

    setNotification(`Conta da empresa ${newCompany.companyName} criada com sucesso!`);
    setTimeout(() => {
      setNotification(null);
      setActiveTab('manager');
    }, 1000);
  };

  const handleLoginCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const list = getStoredCompanies();
    const cleanCnpj = regCnpj.replace(/\D/g, '');
    const found = list.find(c => c.cnpj.replace(/\D/g, '') === cleanCnpj || c.email === regEmail);

    if (found) {
      if (found.password && regPassword && found.password !== regPassword) {
        alert('Senha incorreta.');
        return;
      }
      setActiveCompany(found);
      setActiveCompanyStorage(found);
      setNotification(`Bem-vindo ao Google Ads Manager: ${found.companyName}!`);
      setTimeout(() => {
        setNotification(null);
        setActiveTab('manager');
      }, 1000);
    } else {
      // Auto-cadastro de emergência se não encontrado no teste
      const autoComp: CompanyAccount = {
        id: `COMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        cnpj: formatCnpj(regCnpj || '12345678000190'),
        companyName: regCompanyName || 'Empresa Anunciante',
        contactName: 'Responsável',
        email: regEmail || 'contato@empresa.com',
        phone: '(11) 99999-9999',
        password: regPassword || '123',
        creditBalance: 150.00,
        createdAt: new Date().toLocaleDateString('pt-BR'),
      };
      setActiveCompany(autoComp);
      setActiveCompanyStorage(autoComp);
      setActiveTab('manager');
    }
  };

  const handleLogout = () => {
    setActiveCompany(null);
    setActiveCompanyStorage(null);
    setActiveTab('auth');
  };

  const handleGenerateCreditPayment = async () => {
    if (!activeCompany) return;

    const desc = `Crédito de Propaganda Caramelo Ads - R$ ${creditAmount.toFixed(2)}`;

    let qrcode = '';
    let payload = '';

    try {
      const res = await fetch(`${API_BASE_URL}/payments/asaas/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeCompany.id,
          amount: creditAmount,
          description: desc,
          tipoItem: 'PACOTE_MOEDAS',
          cpfCnpj: activeCompany.cnpj.replace(/\D/g, ''),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        qrcode = data.encodedImage || data.pixQrCode || '';
        payload = data.payload || data.pixCopiaECola || '';
      }
    } catch (e) {}

    if (!payload) {
      payload = `00020126580014br.gov.bcb.pix0136asaas-caramelo-credit-${Date.now()}5204000053039865405${creditAmount.toFixed(2)}5802BR5925${activeCompany.companyName.slice(0, 25)}6009SAO PAULO62070503***6304E2B1`;
    }

    setPixQrCodeImage(qrcode);
    setPixPayload(payload);
  };

  const handleConfirmCreditDeposit = () => {
    if (!activeCompany) return;
    const updated = updateCompanyBalance(activeCompany.id, creditAmount);
    if (updated) {
      setActiveCompany(updated);
    }
    setPixPayload(null);
    setPixQrCodeImage(null);
    setNotification(`Crédito de R$ ${creditAmount.toFixed(2)} adicionado com SUCESSO via Asaas!`);
    setTimeout(() => {
      setNotification(null);
      setActiveTab('manager');
    }, 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAdFromCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    if (adTitle.length > 45) {
      alert('A frase/slogan deve ter no máximo 45 caracteres.');
      return;
    }

    if (activeCompany.creditBalance < selectedPackage.price) {
      alert(`Saldo insuficiente (Seu saldo: R$ ${activeCompany.creditBalance.toFixed(2)}). Adicione mais crédito para criar este anúncio.`);
      setActiveTab('add_credit');
      return;
    }

    // Debita do saldo
    const updated = updateCompanyBalance(activeCompany.id, -selectedPackage.price);
    if (updated) setActiveCompany(updated);

    const newAd: AdCampaign = {
      id: `CAMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      companyCnpj: activeCompany.cnpj,
      companyName: activeCompany.companyName,
      title: adTitle || `Anúncio ${activeCompany.companyName}`,
      imageUrl: imageUrl || '/logo.png',
      placement,
      targetImpressions: selectedPackage.impressions,
      currentImpressions: 0,
      hoursExposed: 0,
      priceReais: selectedPackage.price,
      status: 'active',
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    const updatedCampaigns = [newAd, ...campaigns];
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);

    if (onCampaignCreated) {
      onCampaignCreated(newAd);
    }

    setNotification(`Campanha "${newAd.title}" criada e ATIVADA com sucesso!`);
    setTimeout(() => {
      setNotification(null);
      setActiveTab('manager');
    }, 1200);
  };

  const toggleCampaignStatus = (campaignId: string) => {
    const updated = campaigns.map((c) => {
      if (c.id === campaignId) {
        const nextStatus = c.status === 'active' ? ('paused' as const) : ('active' as const);
        return { ...c, status: nextStatus };
      }
      return c;
    });
    setCampaigns(updated);
    saveCampaignsToStorage(updated);
  };

  const companyCampaigns = activeCompany
    ? campaigns.filter((c) => c.companyCnpj === activeCompany.cnpj || c.companyName === activeCompany.companyName)
    : campaigns;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fade-in select-none">
      <div className="relative w-full max-w-4xl cartoon-wood-board rounded-3xl p-4 sm:p-6 shadow-2xl text-white my-auto flex flex-col gap-4">
        <SteelCornerBrackets size="lg" />
        <SteelRivet className="absolute top-2.5 left-1/2 -translate-x-1/2" />
        <SteelRivet className="absolute bottom-2.5 left-1/2 -translate-x-1/2" />

        {/* Top Header Plank: Anuncie + Perfil da Empresa + Botão Fechar */}
        <div className="cartoon-wood-header p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
          <SteelCornerBrackets size="sm" />
          <div className="flex items-center gap-3">
            <OctagonIconBadge>
              <Megaphone className="w-6 h-6 text-amber-300 stroke-[2.5]" />
            </OctagonIconBadge>
            <div>
              <h2 className="cartoon-title-3d text-lg sm:text-2xl uppercase tracking-tight flex items-center gap-2 flex-wrap">
                <span>ANUNCIE!</span>
                <span className="cartoon-title-gold-3d">ADS MANAGER 3D</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-100/90 font-bold cartoon-text-outline">
                Gerenciador de Anúncios Estilo Google Ads no Jogo Caramelo Run
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Card da Empresa Conectada + Saldo em Madeira Entalhada */}
            {activeCompany && (
              <div className="relative flex items-center gap-2.5 cartoon-wood-inset px-3 py-2 rounded-2xl border-2 border-[#d97706]">
                <SteelRivet className="w-1.5 h-1.5" />
                <div className="text-left text-xs">
                  <span className="font-black text-amber-300 block leading-tight cartoon-text-outline">
                    {activeCompany.companyName}
                  </span>
                  <span className="text-[10px] font-mono text-amber-200/80">
                    CNPJ: {activeCompany.cnpj}
                  </span>
                </div>

                {/* Badge 3D Verde do Saldo */}
                <div className="cartoon-btn-green px-2.5 py-1 rounded-xl font-mono text-xs font-black flex items-center gap-1 shadow-md">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>R$ {activeCompany.creditBalance.toFixed(2).replace('.', ',')}</span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sair do Perfil"
                  className="cartoon-btn-red p-1.5 rounded-lg text-white transition-transform hover:scale-105 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <OctagonCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Notificação Alerta */}
        {notification && (
          <div className="p-3 rounded-2xl cartoon-btn-green text-white text-xs sm:text-sm font-black flex items-center gap-2.5 animate-bounce relative">
            <SteelRivet className="w-2 h-2" />
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">{notification}</span>
            <SteelRivet className="w-2 h-2" />
          </div>
        )}

        {/* Menu de Abas com Botões 3D de Madeira & Ouro e Pregos/Rebites */}
        {activeCompany && (
          <div className="relative cartoon-wood-plank p-2 rounded-2xl flex items-center gap-2.5 text-xs font-black overflow-x-auto">
            <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
            <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />
            <button
              onClick={() => setActiveTab('manager')}
              className={`relative py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'manager'
                  ? 'cartoon-btn-gold scale-[1.02]'
                  : 'cartoon-btn-wood opacity-90 hover:opacity-100'
              }`}
            >
              <SteelRivet className="w-1.5 h-1.5" />
              <BarChart3 className="w-4 h-4" />
              <span>Painel Geral</span>
              <SteelRivet className="w-1.5 h-1.5" />
            </button>

            <button
              onClick={() => setActiveTab('add_credit')}
              className={`relative py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'add_credit'
                  ? 'cartoon-btn-green scale-[1.02]'
                  : 'cartoon-btn-wood opacity-90 hover:opacity-100'
              }`}
            >
              <SteelRivet className="w-1.5 h-1.5" />
              <DollarSign className="w-4 h-4" />
              <span>Colocar Crédito</span>
              <SteelRivet className="w-1.5 h-1.5" />
            </button>

            <button
              onClick={() => setActiveTab('create_ad')}
              className={`relative py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'create_ad'
                  ? 'cartoon-btn-gold scale-[1.02]'
                  : 'cartoon-btn-wood opacity-90 hover:opacity-100'
              }`}
            >
              <SteelRivet className="w-1.5 h-1.5" />
              <PlusCircle className="w-4 h-4" />
              <span>Criar Anúncio</span>
              <SteelRivet className="w-1.5 h-1.5" />
            </button>
          </div>
        )}

        {/* 1. ABA DE AUTENTICAÇÃO / CADASTRO DA EMPRESA */}
        {activeTab === 'auth' && (
          <div className="space-y-4 text-left">
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 cartoon-wood-plank p-3.5 rounded-2xl">
              <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
              <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
              <span className="text-xs sm:text-sm font-black text-amber-100 cartoon-text-outline pl-3">
                {isLoginMode ? '🔑 Acesse o Perfil do Anunciante:' : '🏢 Cadastre sua Empresa para Anunciar:'}
              </span>
              <button
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="cartoon-btn-gold px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <SteelRivet className="w-1.5 h-1.5" />
                <span>{isLoginMode ? '➜ Criar Nova Conta de Anunciante' : '➜ Já Tenho Conta (Entrar)'}</span>
              </button>
            </div>

            {!isLoginMode ? (
              <form onSubmit={handleRegisterCompany} className="space-y-4 cartoon-wood-plank p-4 rounded-2xl relative">
                <SteelCornerBrackets size="sm" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">CNPJ da Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="00.000.000/0001-00"
                      value={regCnpj}
                      onChange={(e) => setRegCnpj(formatCnpj(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">Razão Social / Nome Fantasia *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sorveteria & Açaí da Quebrada"
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">Nome do Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Kelvin Santos"
                      value={regContactName}
                      onChange={(e) => setRegContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">E-mail Comercial *</label>
                    <input
                      type="email"
                      required
                      placeholder="contato@empresa.com.br"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">Senha de Acesso *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl cartoon-btn-gold font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 relative"
                >
                  <SteelRivet className="left-3 top-1/2 -translate-y-1/2 absolute" />
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>CRIAR CONTA DE ANUNCIANTE E PROSSEGUIR</span>
                  <SteelRivet className="right-3 top-1/2 -translate-y-1/2 absolute" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginCompany} className="space-y-4 cartoon-wood-plank p-4 rounded-2xl relative">
                <SteelCornerBrackets size="sm" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">CNPJ Cadastrado</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={regCnpj}
                      onChange={(e) => setRegCnpj(formatCnpj(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">Senha</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl cartoon-btn-gold font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 relative"
                >
                  <SteelRivet className="left-3 top-1/2 -translate-y-1/2 absolute" />
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>ENTRAR NO ADS MANAGER</span>
                  <SteelRivet className="right-3 top-1/2 -translate-y-1/2 absolute" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2. ABA DE GERENCIADOR GOOGLE ADS (PAINEL GERAL) */}
        {activeTab === 'manager' && activeCompany && (
          <div className="space-y-4 text-left animate-fade-in">
            {/* Cards Superiores de Resumo em Tábua de Madeira com Pregos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative p-4 rounded-2xl cartoon-wood-plank flex items-center justify-between gap-2">
                <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 right-2 w-1.5 h-1.5 absolute" />
                <div className="pl-1">
                  <span className="text-[10px] text-amber-200/90 font-black uppercase tracking-wider block cartoon-text-outline">
                    Saldo para Anúncios
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-300 cartoon-text-outline">
                    R$ {activeCompany.creditBalance.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('add_credit')}
                  className="cartoon-btn-green px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <SteelRivet className="w-1.5 h-1.5" />
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Recarregar</span>
                </button>
              </div>

              <div className="relative p-4 rounded-2xl cartoon-wood-plank">
                <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 right-2 w-1.5 h-1.5 absolute" />
                <div className="pl-1">
                  <span className="text-[10px] text-amber-200/90 font-black uppercase tracking-wider block cartoon-text-outline">
                    Campanhas Ativas
                  </span>
                  <span className="text-xl font-black font-mono text-amber-300 cartoon-text-outline">
                    {companyCampaigns.filter((c) => c.status === 'active').length} ativas / {companyCampaigns.length} total
                  </span>
                </div>
              </div>

              <div className="relative p-4 rounded-2xl cartoon-wood-plank">
                <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 left-2 w-1.5 h-1.5 absolute" />
                <SteelRivet className="bottom-2 right-2 w-1.5 h-1.5 absolute" />
                <div className="pl-1">
                  <span className="text-[10px] text-amber-200/90 font-black uppercase tracking-wider block cartoon-text-outline">
                    Total de Exibições
                  </span>
                  <span className="text-xl font-black font-mono text-yellow-200 cartoon-text-outline">
                    {companyCampaigns.reduce((acc, c) => acc + c.currentImpressions, 0).toLocaleString('pt-BR')} exibições
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela de Anúncios Estilo Madeira Entalhada */}
            <div className="space-y-3">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                <h3 className="cartoon-title-3d text-sm sm:text-base uppercase flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-300" />
                  <span>Minhas Campanhas de Anúncios</span>
                </h3>

                <button
                  onClick={() => setActiveTab('create_ad')}
                  className="cartoon-btn-gold px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer self-start xs:self-auto"
                >
                  <SteelRivet className="w-1.5 h-1.5" />
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Criar Nova Campanha</span>
                  <SteelRivet className="w-1.5 h-1.5" />
                </button>
              </div>

              {companyCampaigns.length === 0 ? (
                <div className="relative p-8 text-center text-amber-100 cartoon-wood-plank rounded-2xl">
                  <SteelCornerBrackets size="sm" />
                  <AlertCircle className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-black cartoon-text-outline">
                    Nenhum anúncio criado até o momento.
                  </p>
                  <p className="text-[11px] text-amber-200/80 mt-1 font-bold">
                    Coloque crédito e crie sua primeira propaganda para exibir nos outdoors e baús do jogo!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {companyCampaigns.map((c) => {
                    const pct = Math.min(100, Math.round((c.currentImpressions / c.targetImpressions) * 100));
                    return (
                      <div
                        key={c.id}
                        className="relative p-4 rounded-2xl cartoon-wood-plank transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
                        <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
                        <SteelRivet className="bottom-2 left-2 w-1.5 h-1.5 absolute" />
                        <SteelRivet className="bottom-2 right-2 w-1.5 h-1.5 absolute" />

                        <div className="flex items-center gap-3 pl-1">
                          {/* Toggle Ligar/Desligar Campanha em Botão 3D */}
                          <button
                            onClick={() => toggleCampaignStatus(c.id)}
                            title={c.status === 'active' ? 'Pausar Campanha' : 'Ativar Campanha'}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              c.status === 'active'
                                ? 'cartoon-btn-green'
                                : 'cartoon-btn-wood opacity-75 hover:opacity-100'
                            }`}
                          >
                            <Power className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          <img
                            src={c.imageUrl || '/logo.png'}
                            alt={c.title}
                            className="w-12 h-12 object-cover rounded-xl border-2 border-[#fbbf24] shadow-md flex-shrink-0 bg-[#3b1404]"
                          />

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-white cartoon-text-outline">
                                {c.title}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-black uppercase border ${
                                  c.status === 'active'
                                    ? 'bg-emerald-700/80 text-emerald-200 border-emerald-400'
                                    : c.status === 'paused'
                                    ? 'bg-amber-800/80 text-amber-200 border-amber-400'
                                    : 'bg-[#3b1404] text-amber-200/70 border-amber-700'
                                }`}
                              >
                                {c.status === 'active'
                                  ? '🟢 Rodando'
                                  : c.status === 'paused'
                                  ? '⏸️ Pausada'
                                  : '🏁 Concluída'}
                              </span>
                            </div>

                            <span className="text-[11px] font-bold text-amber-200 block mt-0.5 cartoon-text-outline">
                              Local:{' '}
                              {c.placement === 'outdoors'
                                ? '🏙️ Outdoors 3D (16:9)'
                                : c.placement === 'motoboy_box'
                                ? '📦 Baú Motoboy (1:1)'
                                : '🏁 Muros (4:1)'}
                            </span>
                          </div>
                        </div>

                        {/* Métricas e Progresso em Madeira Embutida */}
                        <div className="w-full sm:w-60 cartoon-wood-inset p-3 rounded-xl border-2 border-[#b45309] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-200 font-bold flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              Exibições:
                            </span>
                            <span className="font-mono font-black text-amber-300">
                              {c.currentImpressions.toLocaleString('pt-BR')} /{' '}
                              {c.targetImpressions.toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-[#290d03] rounded-full overflow-hidden border border-[#d97706]/60 p-[1px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-amber-200/90 font-bold">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Horas Exposto:
                            </span>
                            <span className="font-mono font-black text-white">{c.hoursExposed} h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ABA COLOCAR CRÉDITO (CHECKOUT PIX OU CARTÃO VIA ASAAS) */}
        {activeTab === 'add_credit' && activeCompany && (
          <div className="space-y-4 text-left animate-fade-in">
            <div className="relative p-4 rounded-2xl cartoon-wood-plank">
              <SteelRivet className="top-2 left-2 w-1.5 h-1.5 absolute" />
              <SteelRivet className="top-2 right-2 w-1.5 h-1.5 absolute" />
              <span className="text-xs sm:text-sm font-black text-amber-200 block mb-1 cartoon-text-outline pl-2">
                💰 Adicionar Saldo de Crédito para Anúncios
              </span>
              <p className="text-[11px] text-amber-100/90 font-bold pl-2">
                O valor adicionado fica disponível no seu perfil e é descontado conforme você cria e veicula propagandas no jogo.
              </p>
            </div>

            {/* Seleção do Valor de Crédito com Botões 3D e Rebites */}
            <div>
              <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-2">
                Escolha o Valor do Crédito (R$)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[50, 100, 200, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCreditAmount(val)}
                    className={`relative py-3 px-3 rounded-2xl text-center transition-all cursor-pointer font-mono font-black text-xs flex items-center justify-center gap-1.5 ${
                      creditAmount === val
                        ? 'cartoon-btn-green scale-[1.03]'
                        : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                    }`}
                  >
                    <SteelRivet className="w-1.5 h-1.5" />
                    <span>R$ {val.toFixed(2).replace('.', ',')}</span>
                    <SteelRivet className="w-1.5 h-1.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Método de Pagamento: PIX ou Cartão */}
            <div>
              <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-2">
                Forma de Pagamento Oficial Banco Asaas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`relative p-3.5 rounded-2xl text-center transition-all cursor-pointer flex items-center justify-center gap-2 font-black text-xs sm:text-sm ${
                    paymentMethod === 'pix'
                      ? 'cartoon-btn-green scale-[1.02]'
                      : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="left-2.5 top-1/2 -translate-y-1/2 absolute" />
                  <QrCode className="w-5 h-5" />
                  <span>PIX Instantâneo</span>
                  <SteelRivet className="right-2.5 top-1/2 -translate-y-1/2 absolute" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`relative p-3.5 rounded-2xl text-center transition-all cursor-pointer flex items-center justify-center gap-2 font-black text-xs sm:text-sm ${
                    paymentMethod === 'card'
                      ? 'cartoon-btn-gold scale-[1.02]'
                      : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="left-2.5 top-1/2 -translate-y-1/2 absolute" />
                  <CreditCard className="w-5 h-5" />
                  <span>Cartão de Crédito</span>
                  <SteelRivet className="right-2.5 top-1/2 -translate-y-1/2 absolute" />
                </button>
              </div>
            </div>

            {/* Gerar Pagamento */}
            {!pixPayload ? (
              <button
                type="button"
                onClick={handleGenerateCreditPayment}
                className="relative w-full py-3.5 rounded-2xl cartoon-btn-green font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <SteelRivet className="left-3 top-1/2 -translate-y-1/2 absolute" />
                <QrCode className="w-5 h-5 stroke-[2.5]" />
                <span>GERAR COBRANÇA DE R$ {creditAmount.toFixed(2).replace('.', ',')} VIA ASAAS</span>
                <SteelRivet className="right-3 top-1/2 -translate-y-1/2 absolute" />
              </button>
            ) : (
              <div className="relative p-4 rounded-3xl cartoon-wood-plank text-center space-y-3">
                <SteelCornerBrackets size="sm" />
                <span className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5 uppercase cartoon-text-outline">
                  <QrCode className="w-4 h-4 text-emerald-300" />
                  Escaneie o QR Code PIX Asaas para Recarregar:
                </span>

                <div className="p-3 bg-white rounded-2xl border-4 border-amber-400 inline-block shadow-xl">
                  <img
                    src={
                      pixQrCodeImage
                        ? `data:image/png;base64,${pixQrCodeImage}`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`
                    }
                    alt="QR Code PIX Asaas"
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>

                <div className="flex items-center gap-2 max-w-md mx-auto">
                  <input
                    type="text"
                    readOnly
                    value={pixPayload}
                    className="w-full px-3 py-2 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-[10px] font-mono text-amber-100 truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixPayload);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="cartoon-btn-green px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmCreditDeposit}
                  className="w-full py-3 rounded-xl cartoon-btn-gold font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  SIMULAR CRÉDITO APROVADO NO ASAAS ✔️
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. ABA DE CRIAR ANÚNCIO (UTILIZANDO CRÉDITO DO SALDO) */}
        {activeTab === 'create_ad' && activeCompany && (
          <form onSubmit={handleCreateAdFromCredit} className="space-y-4 text-left animate-fade-in cartoon-wood-plank p-4 rounded-2xl relative">
            <SteelCornerBrackets size="sm" />
            {/* Especificação da Frase/Slogan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-amber-200 cartoon-text-outline">
                  Frase ou Slogan do Anúncio (Máximo 45 Caracteres) *
                </label>
                <span className={`text-[10px] font-mono font-black ${adTitle.length > 40 ? 'text-amber-300' : 'text-amber-100/80'}`}>
                  {adTitle.length}/45
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={45}
                placeholder="Ex: Açaí 500ml com 20% OFF na Quebrada!"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-bold"
              />
              <p className="text-[10px] text-amber-100/90 mt-1 font-bold">
                📏 <strong className="text-amber-300">Especificação da Frase:</strong> Recomendado de 25 a 35 caracteres para melhor leitura em movimento no jogo 3D.
              </p>
            </div>

            {/* Posição do Anúncio + Especificações de Tamanho de Imagem */}
            <div>
              <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-2">
                Local de Exibição & Especificação do Tamanho da Imagem *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlacement('outdoors')}
                  className={`relative p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    placement === 'outdoors'
                      ? 'cartoon-btn-gold scale-[1.02]'
                      : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
                  <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />
                  <Building2 className="w-5 h-5" />
                  <span className="text-xs font-black">🏙️ Outdoors 3D</span>
                  <span className="text-[9px] font-mono bg-[#3b1404] text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/50">
                    1024 x 576 px (16:9)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlacement('motoboy_box')}
                  className={`relative p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    placement === 'motoboy_box'
                      ? 'cartoon-btn-gold scale-[1.02]'
                      : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
                  <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-black">📦 Baú do Motoboy</span>
                  <span className="text-[9px] font-mono bg-[#3b1404] text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/50">
                    512 x 512 px (1:1 Quadrado)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlacement('track_banners')}
                  className={`relative p-3 rounded-2xl text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    placement === 'track_banners'
                      ? 'cartoon-btn-gold scale-[1.02]'
                      : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
                  <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-black">🏁 Muros da Pista</span>
                  <span className="text-[9px] font-mono bg-[#3b1404] text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/50">
                    800 x 200 px (4:1)
                  </span>
                </button>
              </div>
            </div>

            {/* Upload / Imagem */}
            <div>
              <label className="block text-xs font-black text-amber-200 cartoon-text-outline mb-1">
                Imagem / Banner da Propaganda
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="w-full sm:w-auto px-4 py-2.5 cartoon-btn-wood rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer">
                  <SteelRivet className="w-1.5 h-1.5" />
                  <Upload className="w-4 h-4" />
                  <span>Enviar Arquivo de Imagem...</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-[11px] font-bold text-amber-200/80">ou informe a URL da imagem abaixo:</span>
              </div>
              <input
                type="text"
                placeholder="https://exemplo.com/sua-logo.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl cartoon-wood-inset border-2 border-[#b45309] text-amber-100 placeholder-amber-300/40 text-xs focus:border-amber-300 focus:outline-none font-bold"
              />

              {imageUrl && (
                <div className="mt-3 p-2.5 rounded-2xl cartoon-wood-inset border-2 border-amber-400 flex items-center gap-3">
                  <img src={imageUrl} alt="Prévia" className="w-14 h-14 object-cover rounded-xl border-2 border-amber-300" />
                  <div className="text-xs">
                    <span className="font-black text-amber-300 block">Prévia Visual Confirmada</span>
                    <span className="text-[10px] text-amber-100/80 font-bold">
                      Proporção recomendada: {placement === 'outdoors' ? '1024x576 px (16:9)' : placement === 'motoboy_box' ? '512x512 px (1:1)' : '800x200 px (4:1)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Seleção do Pacote descontado do Saldo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black text-amber-200 cartoon-text-outline">
                  Pacote de Exibições (Descontado do Saldo)
                </label>
                <span className="text-xs font-mono font-black text-emerald-300 cartoon-text-outline">
                  Seu Saldo: R$ {activeCompany.creditBalance.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PACKAGES.map((pkg) => (
                  <button
                    key={pkg.impressions}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-3 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center ${
                      selectedPackage.impressions === pkg.impressions
                        ? 'cartoon-btn-gold scale-[1.03]'
                        : 'cartoon-btn-wood opacity-90 hover:opacity-100'
                    }`}
                  >
                    <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
                    <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />
                    <span className="text-[10px] font-mono font-black uppercase mb-0.5">{pkg.tag}</span>
                    <span className="text-sm font-black font-mono">{pkg.impressions.toLocaleString('pt-BR')}x</span>
                    <span className="text-xs font-black mt-1 bg-[#3b1404] text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/50">
                      R$ {pkg.price.toFixed(2).replace('.', ',')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="relative w-full py-3.5 rounded-2xl cartoon-btn-green font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
            >
              <SteelRivet className="left-3 top-1/2 -translate-y-1/2 absolute" />
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>PUBLICAR E ATIVAR PROPAGANDA NO JOGO</span>
              <SteelRivet className="right-3 top-1/2 -translate-y-1/2 absolute" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
