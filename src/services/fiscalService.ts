import { Tools, Make, json2xml, xml2json } from 'node-sped-nfe';

export interface FiscalConfig {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  uf: string;
  ambiente: string; // '1' - Produção, '2' - Homologação
  csc?: string;
  cscId?: string;
  certificadoBase64: string; // pfx
  certificadoSenha: string; // senha
}

export class FiscalService {
  private tools: Tools | null = null;

  constructor(config?: FiscalConfig) {
    if (config) {
      this.initialize(config);
    }
  }

  public initialize(config: FiscalConfig) {
    this.tools = new Tools(
      {
        mod: '55', // Padrão NF-e
        xmllint: '',
        UF: config.uf,
        tpAmb: parseInt(config.ambiente),
        CSC: config.csc || '',
        CSCid: config.cscId || '',
        versao: '4.00',
        timeout: 15000,
        openssl: null,
        CPF: '',
        CNPJ: config.cnpj,
      },
      {
        pfx: config.certificadoBase64,
        senha: config.certificadoSenha,
      }
    );
  }

  public async checkStatus(): Promise<any> {
    if (!this.tools) throw new Error('Fiscal Service não inicializado');
    const response = await this.tools.sefazStatus();
    return await xml2json(response);
  }

  public async signAndSend(xml: string): Promise<any> {
    if (!this.tools) throw new Error('Fiscal Service não inicializado');
    
    // Assinar
    const signedXml = await this.tools.xmlSign(xml);
    
    // Enviar
    const response = await this.tools.sefazEnviaLote(signedXml);
    return await xml2json(response);
  }

  public async buildNFeXml(order: any, settings: any): Promise<string> {
    const make = new Make();
    
    // Identificação
    make.tagIde({
      cUF: settings.cUF || '35', // SP
      cNF: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
      natOp: 'VENDA DE MERCADORIA',
      mod: '55',
      serie: '1',
      nNF: order.invoiceNumber || '1',
      dhEmi: new Date().toISOString(),
      tpNF: '1', // Saída
      idDest: '1', // Interna
      cMunFG: settings.cMun || '3550308', // São Paulo
      tpImp: '1', // Retrato
      tpEmis: '1', // Normal
      cDV: '0',
      tpAmb: this.tools ? (this.tools as any).config.tpAmb : 2,
      finNFe: '1',
      indFinal: '1',
      indPres: '1',
      procEmi: '0',
      verProc: '1.0.0'
    });

    // Emitente
    make.tagEmit({
      CNPJ: settings.CNPJ,
      xNome: settings.restaurantName || 'FLUXBar',
      xFant: settings.restaurantName || 'FLUXBar',
      IE: settings.IE || 'ISENTO',
      CRT: '1' // Simples Nacional
    });

    make.tagEnderEmit({
      xLgr: settings.address || 'Rua Exemplo',
      nro: '100',
      xBairro: 'Bairro',
      cMun: settings.cMun || '3550308',
      xMun: settings.xMun || 'SAO PAULO',
      UF: settings.UF,
      CEP: settings.CEP || '01001000',
      cPais: '1058',
      xPais: 'BRASIL'
    });

    // Destinatário (Consumidor Final se não houver dados)
    if (order.customer) {
      make.tagDest({
        CPF: order.customer.cpf || '',
        xNome: order.customer.name || 'CONSUMIDOR FINAL',
        indIEDest: '9',
        email: order.customer.email || ''
      });
    } else {
      make.tagDest({
        xNome: 'CONSUMIDOR FINAL',
        indIEDest: '9'
      });
    }

    // Itens
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      await make.tagProd({
        item: (i + 1).toString(),
        cProd: item.id,
        cEAN: 'SEM GTIN',
        xProd: item.name,
        NCM: '21069090', // Exemplo genérico para alimentos
        CFOP: '5102',
        uCom: 'UN',
        qCom: item.quantity.toString(),
        vUnCom: item.price.toString(),
        vProd: (item.price * item.quantity).toFixed(2),
        cEANTrib: 'SEM GTIN',
        uTrib: 'UN',
        qTrib: item.quantity.toString(),
        vUnTrib: item.price.toString(),
        indTot: '1'
      });

      // Impostos (Simplificado para Simples Nacional)
      make.tagProdICMSSN(i, {
        orig: '0',
        CSOSN: '102'
      });
      
      make.tagProdPIS(i, {
        CST: '07'
      });
      
      make.tagProdCOFINS(i, {
        CST: '07'
      });
    }

    // Totais
    make.tagTotal({
      vBC: '0.00',
      vICMS: '0.00',
      vICMSDeson: '0.00',
      vFCP: '0.00',
      vBCST: '0.00',
      vST: '0.00',
      vFCPST: '0.00',
      vFCPSTRet: '0.00',
      vProd: order.total.toFixed(2),
      vFrete: '0.00',
      vSeg: '0.00',
      vDesc: '0.00',
      vII: '0.00',
      vIPI: '0.00',
      vIPIDevol: '0.00',
      vPIS: '0.00',
      vCOFINS: '0.00',
      vOutro: '0.00',
      vNF: order.total.toFixed(2),
      vTotTrib: (order.total * 0.1).toFixed(2) // Estimativa 10%
    });

    // Pagamento
    make.tagTransp({
      modFrete: '9' // Sem frete
    });

    make.tagDetPag({
      tPag: '01', // Dinheiro por padrão
      vPag: order.total.toFixed(2)
    });

    return make.xml();
  }

  public static async parseXml(xml: string): Promise<any> {
    return await xml2json(xml);
  }

  public static async buildXml(obj: any): Promise<string> {
    return await json2xml(obj);
  }
}
