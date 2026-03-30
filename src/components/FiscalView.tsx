import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, RefreshCw, FileText, Upload, Key, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FiscalConfig {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  uf: string;
  ambiente: string;
  csc?: string;
  cscId?: string;
  certificadoBase64: string;
  certificadoSenha: string;
}

export default function FiscalView({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [config, setConfig] = useState<FiscalConfig>({
    cnpj: '',
    razaoSocial: '',
    inscricaoEstadual: '',
    uf: 'SP',
    ambiente: '2', // Homologação por padrão
    csc: '',
    cscId: '',
    certificadoBase64: '',
    certificadoSenha: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'fiscal_config', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as FiscalConfig);
        }
      } catch (error) {
        console.error("Error loading fiscal config:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'fiscal_config', 'main'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      showToast("Configurações fiscais salvas!", "success");
    } catch (error) {
      console.error("Error saving fiscal config:", error);
      showToast("Erro ao salvar configurações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const checkSefazStatus = async () => {
    if (!config.cnpj || !config.certificadoBase64 || !config.certificadoSenha) {
      showToast("Preencha o CNPJ, Certificado e Senha primeiro.", "error");
      return;
    }

    setCheckingStatus(true);
    try {
      const response = await fetch('/api/fiscal/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
        showToast("Status da SEFAZ consultado!", "success");
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error("Error checking SEFAZ status:", error);
      showToast(`Erro: ${error.message}`, "error");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      // Remover o prefixo data:application/x-pkcs12;base64,
      const pureBase64 = base64.split(',')[1];
      setConfig(prev => ({ ...prev, certificadoBase64: pureBase64 }));
      showToast("Certificado carregado com sucesso!", "success");
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin opacity-20" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Módulo Fiscal</h2>
          <p className="text-xs md:text-sm opacity-50 mt-1">Emissão de NF-e e NFC-e via node-sped-nfe (Similar ao NFePHP)</p>
        </div>
        <button 
          onClick={checkSefazStatus}
          disabled={checkingStatus}
          className="flex items-center gap-2 px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all disabled:opacity-50"
        >
          {checkingStatus ? <RefreshCw className="animate-spin" size={14} /> : <Globe size={14} />}
          Consultar SEFAZ
        </button>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 border flex items-center gap-4",
            status.retStatus?.cStat === '107' ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {status.retStatus?.cStat === '107' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-tight">Status SEFAZ: {status.retStatus?.xMotivo || 'Desconhecido'}</p>
            <p className="text-[10px] opacity-70">Código: {status.retStatus?.cStat} | Ambiente: {config.ambiente === '1' ? 'Produção' : 'Homologação'}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Configurações Gerais */}
        <div className="bg-white border border-[#141414] p-6 space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
            <Shield size={14} /> Dados da Empresa
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Razão Social</label>
              <input 
                type="text" 
                value={config.razaoSocial}
                onChange={e => setConfig(prev => ({ ...prev, razaoSocial: e.target.value }))}
                placeholder="Nome da Empresa LTDA"
                className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">CNPJ</label>
              <input 
                type="text" 
                value={config.cnpj}
                onChange={e => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">UF (Estado)</label>
                <select 
                  value={config.uf}
                  onChange={e => setConfig(prev => ({ ...prev, uf: e.target.value }))}
                  className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
                >
                  <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                  <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                  <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                  <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                  <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                  <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                  <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                  <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                  <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Ambiente</label>
                <select 
                  value={config.ambiente}
                  onChange={e => setConfig(prev => ({ ...prev, ambiente: e.target.value }))}
                  className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
                >
                  <option value="2">Homologação</option>
                  <option value="1">Produção</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">CSC (Token NFC-e)</label>
                <input 
                  type="text" 
                  value={config.csc}
                  onChange={e => setConfig(prev => ({ ...prev, csc: e.target.value }))}
                  placeholder="Token"
                  className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">ID CSC</label>
                <input 
                  type="text" 
                  value={config.cscId}
                  onChange={e => setConfig(prev => ({ ...prev, cscId: e.target.value }))}
                  placeholder="000001"
                  className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Certificado Digital */}
        <div className="bg-white border border-[#141414] p-6 space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
            <Key size={14} /> Certificado Digital A1
          </h3>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-[#141414]/20 p-8 text-center relative group hover:border-[#141414]/40 transition-colors">
              <input 
                type="file" 
                accept=".pfx,.p12"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto mb-3 opacity-20 group-hover:opacity-40 transition-opacity" size={32} />
              <p className="text-xs font-bold uppercase tracking-tight">
                {config.certificadoBase64 ? "Certificado Carregado ✅" : "Clique para enviar o arquivo .pfx"}
              </p>
              <p className="text-[10px] opacity-40 mt-1">O arquivo será armazenado de forma segura.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Senha do Certificado</label>
              <input 
                type="password" 
                value={config.certificadoSenha}
                onChange={e => setConfig(prev => ({ ...prev, certificadoSenha: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-[#141414]/5 border-none p-3 text-sm focus:ring-1 focus:ring-[#141414]"
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded text-blue-800 text-[10px] leading-relaxed">
              <strong>Nota:</strong> O certificado A1 é necessário para assinar as notas fiscais digitalmente. Sem ele, a SEFAZ rejeitará qualquer envio.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-[#141414] text-[#E4E3E0] px-12 py-4 font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-3"
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
