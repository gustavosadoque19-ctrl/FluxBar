export type OrderType = 'TABLE' | 'DELIVERY' | 'PICKUP';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'FINISHED' | 'CANCELLED';
export type TableStatus = 'Livre' | 'Ocupada' | 'Aguardando Limpeza' | 'Fechando Conta';

export interface Waiter {
  id: string;
  name: string;
  shift: 'Manhã' | 'Tarde' | 'Noite';
  commissionRate: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  category: 'Bebidas' | 'Pratos' | 'Sobremesas' | 'Entradas';
  available: boolean;
  stock: number;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  barcode?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  icmsOrigin?: string;
  icmsSituation?: string;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  currentOrderId?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  paid?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'PIX';
  timestamp: any;
  payerName?: string;
}

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
  serviceFee: number;
  deliveryFee: number;
  total: number;
  peopleCount?: number;
  customerName?: string;
  customerPhone?: string;
  customerDocument?: string;
  deliveryAddress?: string;
  locationUrl?: string;
  platform?: string;
  tableName?: string;
  discount?: number;
  cashierSessionId?: string;
  invoiceEmitted?: boolean;
  invoiceUrl?: string;
  createdAt: any;
  updatedAt: any;
  deleted?: boolean;
  deletedAt?: any;
  isPickup?: boolean;
}

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
  // Fiscal fields
  CNPJ?: string;
  IE?: string;
  UF?: string;
  CEP?: string;
  xMun?: string;
  cMun?: string;
  cUF?: string;
  // New settings
  blockSaleNoStock: boolean;
  maxDiscount: number;
  printMode: 'ALWAYS' | 'NEVER' | 'MANUAL';
  erpSyncFrequency: 'REALTIME' | 'HOURLY' | 'DAILY';
  // WhatsApp Bot Settings
  whatsappBotEnabled: boolean;
  whatsappBotWelcomeMessage: string;
  whatsappBotMenuUrl: string;
  // Theme Customization
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string;
  };
  // iFood Integration
  ifoodClientId?: string;
  ifoodClientSecret?: string;
  // Fiscal Integration (Option 2)
  fiscalEnvironment?: 'homologacao' | 'producao';
  nfeIoCompanyId?: string;
  cscId?: string;
  cscToken?: string;
  certificateBase64?: string;
  certificatePassword?: string;
}

export interface CashierSession {
  id: string;
  openedAt: any;
  closedAt?: any;
  openedBy: string;
  closedBy?: string;
  openingBalance: number;
  closingBalanceSystem?: number;
  closingBalancePhysical?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'manager' | 'waiter' | 'kitchen' | 'user';
  maxDiscount?: number;
  createdAt: any;
}

export interface AllowedEmail {
  id: string;
  email: string;
  createdAt: any;
}

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
