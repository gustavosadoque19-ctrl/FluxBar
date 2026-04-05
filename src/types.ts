// Definições de tipos básicos para o sistema de pedidos
export type OrderType = 'TABLE' | 'DELIVERY' | 'PICKUP'; // Mesa, Entrega ou Retirada
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'FINISHED' | 'CANCELLED'; // Estados do pedido
export type TableStatus = 'Livre' | 'Ocupada' | 'Aguardando Limpeza' | 'Fechando Conta'; // Estados da mesa

// Interface para Garçons
export interface Waiter {
  id: string;
  name: string;
  shift: 'Manhã' | 'Tarde' | 'Noite';
  commissionRate: number; // Taxa de comissão
}

// Interface para Produtos do Cardápio
export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number; // Preço de custo
  category: 'Bebidas' | 'Pratos' | 'Sobremesas' | 'Entradas';
  available: boolean; // Se está disponível para venda
  stock: number; // Quantidade em estoque
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  barcode?: string;
  // Campos Fiscais para NFC-e
  ncm?: string;
  cest?: string;
  cfop?: string;
  icmsOrigin?: string;
  icmsSituation?: string;
}

// Interface para Mesas
export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  currentOrderId?: string; // ID do pedido ativo na mesa
}

// Interface para Itens dentro de um Pedido
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  paid?: boolean; // Se o item já foi pago (para divisão de conta)
  // Campos Fiscais (Copiados do Produto no momento do pedido)
  ncm?: string;
  cest?: string;
  cfop?: string;
  icmsOrigin?: string;
  icmsSituation?: string;
}

// Interface para Pagamentos realizados
export interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'PIX'; // Dinheiro, Cartão ou PIX
  timestamp: any;
  payerName?: string;
}

// Interface Principal para Pedidos
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  waiterId?: string;
  customerId?: string;
  items: OrderItem[];
  payments?: Payment[];
  subtotal: number;
  serviceFee: number; // Taxa de serviço
  deliveryFee: number; // Taxa de entrega
  total: number;
  peopleCount?: number; // Quantidade de pessoas na mesa
  customerName?: string;
  customerPhone?: string;
  customerDocument?: string; // CPF/CNPJ para nota fiscal
  deliveryAddress?: string;
  locationUrl?: string;
  platform?: string; // Ex: iFood
  tableName?: string;
  discount?: number;
  cashierSessionId?: string; // ID do turno de caixa
  invoiceEmitted?: boolean; // Se a nota fiscal foi emitida
  invoiceUrl?: string; // Link para o PDF da nota
  createdAt: any;
  updatedAt: any;
  deleted?: boolean;
  deletedAt?: any;
  isPickup?: boolean;
}

// Interface para Pesquisa de Satisfação (NPS)
export interface Survey {
  id: string;
  orderId: string;
  rating: number; // 1 a 5
  comment?: string;
  customerName?: string;
  createdAt: any;
}

// Interface para Configurações do Restaurante
export interface RestaurantSettings {
  id: string;
  serviceFee: number;
  operatingHours: {
    open: string;
    close: string;
  };
  happyHour: {
    enabled: boolean;
    start: string;
    end: string;
    discount: number;
  };
  restaurantName: string;
  address: string;
  whatsappNumber?: string;
  whatsappTemplates?: {
    orderReceived?: string;
    orderPreparing?: string;
    orderDelivering?: string;
    orderFinished?: string;
  };
  // Campos Fiscais da Empresa
  CNPJ?: string;
  IE?: string;
  UF?: string;
  CEP?: string;
  xMun?: string;
  cMun?: string;
  cUF?: string;
  // Novas configurações de operação
  blockSaleNoStock: boolean;
  maxDiscount: number;
  printMode: 'ALWAYS' | 'NEVER' | 'MANUAL';
  erpSyncFrequency: 'REALTIME' | 'HOURLY' | 'DAILY';
  // Configurações do Bot de WhatsApp
  whatsappBotEnabled: boolean;
  whatsappBotWelcomeMessage: string;
  whatsappBotMenuUrl: string;
  // Customização Visual (Tema)
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string;
  };
  // Integração iFood
  ifoodClientId?: string;
  ifoodClientSecret?: string;
  // Integração Fiscal (Focus NFe)
  fiscalEnvironment?: 'homologacao' | 'producao';
  focusNfeToken?: string;
  cscId?: string;
  cscToken?: string;
  certificateBase64?: string;
  certificatePassword?: string;
}

// Interface para Sessões de Caixa (Turnos)
export interface CashierSession {
  id: string;
  openedAt: any;
  closedAt?: any;
  openedBy: string;
  closedBy?: string;
  openingBalance: number; // Saldo inicial
  closingBalanceSystem?: number; // Saldo esperado pelo sistema
  closingBalancePhysical?: number; // Saldo contado fisicamente
  status: 'OPEN' | 'CLOSED';
}

// Interface para Usuários do Sistema
export interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'manager' | 'waiter' | 'kitchen' | 'user'; // Papéis de acesso
  maxDiscount?: number; // Desconto máximo permitido para este usuário
  createdAt: any;
}

// Interface para E-mails autorizados a se cadastrar
export interface AllowedEmail {
  id: string;
  email: string;
  createdAt: any;
}

// Interface para Clientes
export interface Customer {
  id: string;
  name: string;
  phone: string;
  document?: string;
  email?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
}
