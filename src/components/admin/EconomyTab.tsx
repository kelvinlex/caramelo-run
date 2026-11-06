import React, { useState } from 'react';
import { Edit, Plus, Sparkles, ShoppingBag, Tag, Check, X } from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';
import { Skin, SkinRarity } from '../../types';
import { CarameloAvatar } from '../common/CarameloAvatar';

export const EconomyTab: React.FC = () => {
  const [editingSkin, setEditingSkin] = useState<Skin | null>(null);
  const [showNewSkinModal, setShowNewSkinModal] = useState(false);
  const [skins, setSkins] = useState<Skin[]>([]);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/admin/skins`)
      .then(res => res.json())
      .then(data => setSkins(data))
      .catch(err => console.error(err));
  }, []);

  // Edit form state
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<SkinRarity>('Comum');
  const [precoMoedas, setPrecoMoedas] = useState(0);
  const [precoReais, setPrecoReais] = useState(0);
  const [isRealMoneyOnly, setIsRealMoneyOnly] = useState(false);
  const [ativaLoja, setAtivaLoja] = useState(true);
  const [emPromocao, setEmPromocao] = useState(false);
  const [descontoPercentual, setDescontoPercentual] = useState(0);

  const openEditModal = (skin: Skin) => {
    sound.playClick();
    setEditingSkin(skin);
    setNome(skin.nome);
    setTipo(skin.tipo);
    setPrecoMoedas(skin.precoMoedas);
    setPrecoReais(skin.precoReais);
    setIsRealMoneyOnly(skin.isRealMoneyOnly);
    setAtivaLoja(skin.ativaLoja ?? true);
    setEmPromocao(!!skin.emPromocao);
    setDescontoPercentual(skin.descontoPercentual || 0);
  };

  const saveSkinChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkin) return;

    sound.playWin();
    
    const updatedSkin = {
      ...editingSkin,
      nome,
      tipo,
      precoMoedas: Number(precoMoedas),
      precoReais: Number(precoReais),
      isRealMoneyOnly,
      ativaLoja,
      emPromocao,
      descontoPercentual: Number(descontoPercentual),
    };

    try {
      await fetch(`${API_BASE_URL}/admin/skins/${editingSkin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSkin)
      });
      
      setSkins(prev => prev.map(s => s.id === editingSkin.id ? updatedSkin : s));
      setEditingSkin(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNewSkin = () => {
    sound.playWin();
    const newId = `skin-custom-${Date.now()}`;
    const newSkin: Skin = {
      id: newId,
      nome: 'Caramelo Chave da Quebrada',
      tipo: 'Especial',
      descricao: 'Nova skin criada via LiveOps Control Panel.',
      precoMoedas: 800,
      precoReais: 2.50,
      isRealMoneyOnly: false,
      imagem: '🐾🐕',
      corPrimaria: '#7C2D12',
      corSecundaria: '#F59E0B',
      acessorios: {
        oculos: true,
        tipoOculos: 'juliete',
        chapeu: 'bone',
        coleira: 'dourada',
        brilho: true,
      },
      ativaLoja: true,
      emPromocao: true,
      descontoPercentual: 10,
    };
    storage.addSkin(newSkin);
    setShowNewSkinModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 font-fun flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" /> ECONOMIA DO GAME (LIVE OPS)
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            Altere dinamicamente os valores das skins do Caramelo em Moedas virtuais (OssoCoins) e Reais (R$).
          </p>
        </div>

        <button
          onClick={() => setShowNewSkinModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95 font-fun"
        >
          <Plus className="w-4 h-4" /> CRIAR NOVA SKIN
        </button>
      </div>

      {/* Skins Catalog Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3.5 px-4">Avatar / Skin</th>
                <th className="py-3.5 px-4">Raridade</th>
                <th className="py-3.5 px-4">Preço OssoCoins</th>
                <th className="py-3.5 px-4">Preço Reais (R$)</th>
                <th className="py-3.5 px-4">Status Loja</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {skins.map((skin) => (
                <tr key={skin.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-stone-800/80 rounded-xl border border-stone-700/60">
                        <CarameloAvatar skin={skin} size="sm" isAnimated={false} />
                      </div>
                      <div>
                        <div className="font-bold text-stone-100 flex items-center gap-2">
                          <span>{skin.nome}</span>
                          {skin.emPromocao && (
                            <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" /> -{skin.descontoPercentual}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 line-clamp-1">{skin.descricao}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${
                        skin.tipo === 'Lendária'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : skin.tipo === 'Especial'
                          ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                          : skin.tipo === 'Rara'
                          ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                          : 'bg-stone-800 border-stone-700 text-stone-300'
                      }`}
                    >
                      {skin.tipo}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {skin.isRealMoneyOnly ? (
                      <span className="text-xs text-stone-500 font-mono italic">Apenas Dinheiro Real</span>
                    ) : (
                      <div className="font-mono font-bold text-yellow-400 flex items-center gap-1">
                        <span>🦴</span>
                        <span>{skin.precoMoedas === 0 ? 'Grátis (Inicial)' : `${skin.precoMoedas.toLocaleString('pt-BR')} OssoCoins`}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-emerald-400">
                      {skin.precoReais === 0 ? 'R$ 0,00' : `R$ ${skin.precoReais.toFixed(2)}`}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        skin.ativaLoja
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : 'bg-stone-800 text-stone-500 border border-stone-700'
                      }`}
                    >
                      {skin.ativaLoja ? 'À Venda' : 'Oculta'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openEditModal(skin)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ml-auto cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> ✏️ Alterar Valor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Skin Modal */}
      {editingSkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-stone-100 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold font-fun text-amber-400 flex items-center gap-2">
                <Edit className="w-5 h-5" /> Configurar Economia LiveOps: {editingSkin.nome}
              </h4>
              <button
                onClick={() => setEditingSkin(null)}
                className="p-1 text-stone-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveSkinChanges} className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-stone-800/80 rounded-2xl border border-stone-700">
                <CarameloAvatar skin={editingSkin} size="sm" isAnimated={false} />
                <div>
                  <span className="text-xs text-stone-400 block">Identificador do Banco</span>
                  <span className="font-mono text-xs text-amber-300 font-bold">{editingSkin.id}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Nome da Skin</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Raridade</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as SkinRarity)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Comum">Comum</option>
                    <option value="Rara">Rara</option>
                    <option value="Especial">Especial</option>
                    <option value="Lendária">Lendária</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Exclusivo em Reais?</label>
                  <select
                    value={isRealMoneyOnly ? 'true' : 'false'}
                    onChange={(e) => setIsRealMoneyOnly(e.target.value === 'true')}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="false">Não (Aceita Moedas)</option>
                    <option value="true">Sim (Apenas R$)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Preço em OssoCoins</label>
                  <input
                    type="number"
                    value={precoMoedas}
                    onChange={(e) => setPrecoMoedas(Number(e.target.value))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-yellow-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Preço em Reais (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={precoReais}
                    onChange={(e) => setPrecoReais(Number(e.target.value))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-800/50 rounded-xl border border-stone-700/60">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                  <input
                    type="checkbox"
                    checked={emPromocao}
                    onChange={(e) => setEmPromocao(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Tag Promoção Ativa</span>
                </label>

                {emPromocao && (
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-0.5">% Desconto</label>
                    <input
                      type="number"
                      value={descontoPercentual}
                      onChange={(e) => setDescontoPercentual(Number(e.target.value))}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSkin(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md font-fun"
                >
                  <Check className="w-4 h-4" /> Salvar na Economia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Skin Prompt Modal */}
      {showNewSkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 max-w-md w-full shadow-2xl text-stone-100">
            <h4 className="text-lg font-bold font-fun text-amber-400 mb-2">
              ✨ Criar Skin Personalizada
            </h4>
            <p className="text-xs text-stone-300 mb-4">
              Isto adicionará uma nova skin ao catálogo LiveOps com óculos Juliete, boné de cria e coleira dourada pronta para a loja.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewSkinModal(false)}
                className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewSkin}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs font-fun"
              >
                Criar Skin Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
