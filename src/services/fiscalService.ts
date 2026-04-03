export interface FiscalSettings {
  fiscalEnvironment: 'homologacao' | 'producao';
  certificateBase64: string;
  certificatePassword: string;
  cscId: string;
  cscToken: string;
  CNPJ: string;
  IE: string;
  UF: string;
  xMun: string;
}

export interface FiscalValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateFiscalSettings = (settings: any): FiscalValidationResult => {
  const errors: string[] = [];

  if (!settings) {
    return { isValid: false, errors: ['Configurações fiscais não encontradas'] };
  }

  if (!settings.fiscalEnvironment) {
    errors.push('Ambiente fiscal não configurado');
  }

  if (!settings.certificateBase64) {
    errors.push('Certificado digital não carregado');
  }

  if (!settings.certificatePassword) {
    errors.push('Senha do certificado não configurada');
  }

  if (!settings.cscId) {
    errors.push('CSC ID não configurado');
  }

  if (!settings.cscToken) {
    errors.push('CSC Token não configurado');
  }

  if (!settings.CNPJ) {
    errors.push('CNPJ não configurado');
  }

  if (!settings.IE) {
    errors.push('Inscrição Estadual (IE) não configurada');
  }

  if (!settings.UF) {
    errors.push('UF (Estado) não configurado');
  }

  if (!settings.xMun) {
    errors.push('Município não configurado');
  }

  if (settings.fiscalEnvironment === 'producao') {
    if (!settings.CNPJ || settings.CNPJ.length !== 14) {
      errors.push('CNPJ inválido para ambiente de produção');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateOrderForInvoice = (order: any): FiscalValidationResult => {
  const errors: string[] = [];

  if (!order) {
    return { isValid: false, errors: ['Pedido não encontrado'] };
  }

  if (order.status !== 'FINISHED') {
    errors.push(`Pedido não está finalizado. Status atual: ${order.status}`);
  }

  if (order.paymentStatus !== 'PAID') {
    errors.push(`Pedido não foi pago. Status de pagamento: ${order.paymentStatus}`);
  }

  if (order.invoiceEmitted) {
    errors.push('Nota fiscal já foi emitida para este pedido');
  }

  if (!order.customerName) {
    errors.push('Nome do cliente não preenchido');
  }

  if (!order.customerPhone) {
    errors.push('Telefone do cliente não preenchido');
  }

  if (!order.items || order.items.length === 0) {
    errors.push('Pedido não contém itens');
  }

  const itemsWithoutFiscal = (order.items || []).filter(
    (item: any) => !item.ncm || !item.cfop
  );

  if (itemsWithoutFiscal.length > 0) {
    errors.push(
      `${itemsWithoutFiscal.length} item(ns) sem configuração fiscal (NCM/CFOP)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const generateFiscalErrorMessage = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return 'Erros encontrados:\n' + errors.map((e) => `• ${e}`).join('\n');
};
