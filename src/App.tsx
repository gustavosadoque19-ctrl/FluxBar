/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, createContext, useContext, ReactNode, useRef, ChangeEvent } from 'react';
import { 
  LayoutDashboard, 
  Utensils, 
  Truck, 
  Users, 
  ClipboardList, 
  Settings,
  Plus,
  Minus,
  Trash2,
  Search,
  Bell,
  UserCircle,
  LogIn,
  LogOut,
  AlertCircle,
  Printer,
  Share2,
  ExternalLink,
  ShoppingCart,
  FileText,
  ChefHat,
  Smartphone,
  BarChart3,
  Banknote,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  MapPin,
  MessageSquare,
  Barcode,
  Camera,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import FiscalView from './components/FiscalView';
import { Table, Order, Product, Waiter, TableStatus, RestaurantSettings, OrderStatus, CashierSession } from './types';
import { WhatsAppService } from './services/whatsappService';

// --- Error Handling & Utilities ---

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Erro no Firestore (${parsedError.operationType}): ${parsedError.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="h-screen flex items-center justify-center bg-[#E4E3E0] p-6">
          <div className="max-w-md w-full bg-white border-2 border-[#141414] p-12 text-center shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]">
            <AlertCircle size={48} className="mx-auto mb-6 text-red-500" />
            <h2 className="font-serif italic text-3xl mb-4">Ops! Algo deu errado.</h2>
            <p className="text-sm opacity-60 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

function LoginScreen({ onLogin, onRegister, onResetPassword }: { 
  onLogin: (email?: string, password?: string) => Promise<void>,
  onRegister: (email: string, password: string) => Promise<void>,
  onResetPassword: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isForgotPassword) {
        await onResetPassword(email);
        setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } else if (isRegistering) {
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let message = 'Erro ao processar. Verifique suas credenciais.';
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/user-not-found' || errorMessage.includes('user-not-found')) 
        message = 'Usuário não encontrado.';
      else if (errorCode === 'auth/wrong-password' || errorMessage.includes('wrong-password')) 
        message = 'Senha incorreta.';
      else if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) 
        message = 'Este e-mail já está em uso. Tente fazer login ou recuperar sua senha.';
      else if (errorCode === 'auth/weak-password' || errorMessage.includes('weak-password')) 
        message = 'A senha deve ter pelo menos 6 caracteres.';
      else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email'))
        message = 'E-mail inválido.';
      else if (errorCode === 'auth/too-many-requests')
        message = 'Muitas tentativas. Tente novamente mais tarde.';
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#E4E3E0] p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-[#141414] p-10 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]">
        <div className="text-center mb-10">
          <h1 className="font-serif italic text-5xl tracking-tight mb-2">FLUXBar</h1>
          <p className="text-xs uppercase tracking-[0.2em] opacity-40 font-bold">Professional Edition</p>
        </div>

        <h2 className="text-xl font-bold uppercase tracking-widest mb-8 text-center">
          {isForgotPassword ? 'Recuperar Senha' : (isRegistering ? 'Criar Conta' : 'Acesso ao Sistema')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 opacity-60">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F5F5F5] border border-[#141414] p-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
              placeholder="seu@email.com"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 opacity-60">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5F5F5] border border-[#141414] p-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-600 text-xs flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin-slow" />
              {success}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processando...' : (
              isForgotPassword ? 'Enviar Link' : (isRegistering ? <><UserPlus size={18} /> Registrar</> : <><LogIn size={18} /> Entrar</>)
            )}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4 text-center">
          {!isForgotPassword && !isRegistering && (
            <button 
              onClick={() => {
                setIsForgotPassword(true);
                setError('');
                setSuccess('');
              }}
              className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Esqueci minha senha
            </button>
          )}

          {(isForgotPassword || isRegistering) && (
            <button 
              onClick={() => {
                setIsForgotPassword(false);
                setIsRegistering(false);
                setError('');
                setSuccess('');
              }}
              className="text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity underline underline-offset-4"
            >
              Voltar para o login
            </button>
          )}

          {!isForgotPassword && !isRegistering && (
            <button 
              onClick={() => {
                setIsRegistering(true);
                setError('');
                setSuccess('');
              }}
              className="text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity underline underline-offset-4"
            >
              Não tem uma conta? Registrar
            </button>
          )}
        </div>

        <div className="mt-12 flex items-center gap-2 justify-center text-[10px] opacity-40 uppercase font-bold tracking-widest">
          <AlertCircle size={12} />
          Acesso restrito a funcionários
        </div>
      </div>
    </div>
  );
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user is admin based on email
        const isAdminByEmail = u.email === "gustavosadoque19@gmail.com";
        
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          const role = userDoc.exists() ? userDoc.data().role : null;
          setIsAdmin(isAdminByEmail || role === 'admin');
          
          // If user doesn't exist in users collection, create it with UID as ID
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              role: isAdminByEmail ? 'admin' : 'user',
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          // Fallback to email check if Firestore fails
          setIsAdmin(isAdminByEmail);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email?: string, password?: string) => {
    try {
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Register Error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Reset Password Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// --- Main App Component ---

type Tab = 'dashboard' | 'tables' | 'delivery' | 'menu' | 'waiters' | 'settings' | 'public_menu' | 'fiscal' | 'kitchen' | 'reports' | 'cashier' | 'whatsapp';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user, isAdmin, loading, login, register, resetPassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Real-time states
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  // Modal states
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTableIdForOrder, setSelectedTableIdForOrder] = useState<string | undefined>(undefined);
  const [selectedOrderTypeForModal, setSelectedOrderTypeForModal] = useState<'TABLE' | 'DELIVERY' | undefined>(undefined);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrTable, setQRTable] = useState<Table | null>(null);
  const [isWhatsAppMiniBrowserOpen, setIsWhatsAppMiniBrowserOpen] = useState(false);
  const [isWhatsAppMinimized, setIsWhatsAppMinimized] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [isBillSplitOpen, setIsBillSplitOpen] = useState(false);

  // Toast & Confirm states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, onCancel });
  };

  useEffect(() => {
    if (!user) return;

    // Listen to Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings({ id: doc.id, ...doc.data() } as RestaurantSettings);
      } else {
        // Initialize default settings if not exists
        const defaultSettings = {
          restaurantName: 'FLUXBar',
          address: '',
          serviceFee: 10,
          operatingHours: { open: '08:00', close: '22:00' },
          happyHour: { enabled: false, start: '17:00', end: '19:00', discount: 20 }
        };
        setSettings({ id: 'general', ...defaultSettings } as RestaurantSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    });

    // Listen to Tables
    const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => {
      setTables(snap.docs.map(d => ({ id: d.id, ...d.data() } as Table)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tables');
    });

    // Listen to Orders (Recent)
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Listen to Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // Listen to Waiters
    const unsubWaiters = onSnapshot(collection(db, 'waiters'), (snap) => {
      setWaiters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Waiter)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'waiters');
    });

    // Handle Stripe Redirects
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('orderId');
    const urlTableId = urlParams.get('tableId');

    if (urlTableId) {
      setActiveTab('public_menu');
      // You might want to store this tableId in a state to pre-fill the order
    }

    if (paymentStatus === 'success' && orderId) {
      showToast("Pagamento realizado com sucesso!", "success");
      // Update order status in Firestore if needed
      updateDoc(doc(db, 'orders', orderId), { 
        paymentStatus: 'PAID',
        updatedAt: serverTimestamp() 
      }).catch(err => console.error("Error updating order payment status:", err));
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      showToast("Pagamento cancelado.", "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      unsubSettings();
      unsubTables();
      unsubOrders();
      unsubProducts();
      unsubWaiters();
    };
  }, [user]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showToast(`Status atualizado para ${newStatus}`, "success");
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Erro ao atualizar status.", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#E4E3E0]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-serif italic text-lg opacity-50">Carregando FLUXBar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={login} onRegister={register} onResetPassword={resetPassword} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'tables', label: 'Mesas (Garçom)', icon: Smartphone },
    { id: 'kitchen', label: 'Cozinha', icon: ChefHat },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'menu', label: 'Cardápio', icon: ClipboardList, adminOnly: true },
    { id: 'waiters', label: 'Equipe', icon: Users, adminOnly: true },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, adminOnly: true },
    { id: 'cashier', label: 'Caixa', icon: Banknote },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'fiscal', label: 'Fiscal', icon: FileText, adminOnly: true },
    { id: 'settings', label: 'Ajustes', icon: Settings, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 border-r border-[#141414] flex-col bg-white shrink-0">
        <div className="p-6 border-b border-[#141414]">
          <h1 className="font-serif italic text-2xl tracking-tight">FLUXBar</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Professional Edition</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'whatsapp') {
                  setIsWhatsAppMiniBrowserOpen(true);
                  setIsWhatsAppMinimized(false);
                } else {
                  setActiveTab(item.id as Tab);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-[#141414] text-[#E4E3E0]" 
                  : "hover:bg-[#141414]/5"
              )}
            >
              <item.icon size={18} className={cn(activeTab === item.id ? "text-[#E4E3E0]" : "opacity-60 group-hover:opacity-100")} />
              <span className="font-medium tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 border border-[#141414]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-tight truncate max-w-[100px]">{user.displayName}</p>
                <p className="text-[10px] opacity-50">Online</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 hover:bg-red-500 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 md:h-20 border-b border-[#141414] flex items-center justify-between px-4 md:px-8 bg-white/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <h1 className="md:hidden font-serif italic text-xl tracking-tight mr-2">GM</h1>
            <div className="relative flex-1 max-w-xs md:max-w-xl">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="bg-[#141414]/5 border-none focus:ring-1 focus:ring-[#141414] text-xs md:text-sm w-full pl-10 pr-4 py-2 placeholder:italic placeholder:opacity-30 rounded-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 hover:bg-[#141414]/5 transition-colors">
              <Bell size={18} className="md:w-5 md:h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-[#E4E3E0]"></span>
            </button>
            <button 
              onClick={() => {
                setSelectedTableIdForOrder(undefined);
                setIsOrderModalOpen(true);
              }}
              className="bg-[#141414] text-[#E4E3E0] px-3 md:px-5 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Novo Pedido</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView 
                  orders={orders} 
                  tables={tables} 
                  waiters={waiters} 
                  onNewOrder={() => {
                    setSelectedTableIdForOrder(undefined);
                    setIsOrderModalOpen(true);
                  }}
                  onViewOrder={(orderId) => {
                    setSelectedOrderId(orderId);
                    setIsOrderDetailsOpen(true);
                  }}
                />
              )}
              {activeTab === 'tables' && (
                <TablesView 
                  tables={tables} 
                  orders={orders}
                  onAddTable={() => {
                    setSelectedTable(null);
                    setIsTableModalOpen(true);
                  }}
                  onEditTable={(table) => {
                    setSelectedTable(table);
                    setIsTableModalOpen(true);
                  }}
                  onNewOrder={(tableId) => {
                    setSelectedTableIdForOrder(tableId || undefined);
                    setIsOrderModalOpen(true);
                  }}
                  onViewOrder={(orderId) => {
                    setSelectedOrderId(orderId);
                    setIsOrderDetailsOpen(true);
                  }}
                  onGenerateQR={(table) => {
                    setQRTable(table);
                    setIsQRModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'delivery' && (
                <DeliveryView 
                  orders={orders.filter(o => o.type === 'DELIVERY')} 
                  settings={settings}
                  showToast={showToast} 
                  onNewOrder={() => {
                    setSelectedOrderTypeForModal('DELIVERY');
                    setIsOrderModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'menu' && (
                <MenuView 
                  products={products} 
                  onAddProduct={() => {
                    setSelectedProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  onEditProduct={(product) => {
                    setSelectedProduct(product);
                    setIsProductModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'waiters' && (
                <WaitersView 
                  waiters={waiters} 
                  onAddWaiter={() => {
                    setSelectedWaiter(null);
                    setIsWaiterModalOpen(true);
                  }}
                  onEditWaiter={(waiter) => {
                    setSelectedWaiter(waiter);
                    setIsWaiterModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView 
                  user={user} 
                  logout={logout} 
                  settings={settings} 
                  onOpenPublicMenu={() => setActiveTab('public_menu')}
                  showToast={showToast}
                />
              )}
              {activeTab === 'fiscal' && <FiscalView showToast={showToast} />}
              {activeTab === 'kitchen' && (
                <KitchenView 
                  orders={orders.filter(o => ['OPEN', 'PREPARING'].includes(o.status))} 
                  onUpdateStatus={handleUpdateStatus}
                />
              )}
              {activeTab === 'reports' && <ReportsView orders={orders} products={products} />}
              {activeTab === 'cashier' && <CashierView orders={orders} products={products} user={user} showToast={showToast} />}
              {activeTab === 'whatsapp' && <WhatsAppView />}
              {activeTab === 'public_menu' && (
                <PublicMenuView 
                  products={products} 
                  settings={settings} 
                  onBack={() => setActiveTab('settings')}
                  showToast={showToast}
                  tables={tables}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modals */}
        <TableModal 
          isOpen={isTableModalOpen} 
          onClose={() => setIsTableModalOpen(false)} 
          table={selectedTable}
          showConfirm={showConfirm}
          showToast={showToast}
        />
        <QRModal 
          isOpen={isQRModalOpen} 
          onClose={() => setIsQRModalOpen(false)} 
          table={qrTable}
        />

        {/* WhatsApp Mini Browser */}
        <WhatsAppMiniBrowser 
          isOpen={isWhatsAppMiniBrowserOpen} 
          isMinimized={isWhatsAppMinimized}
          onClose={() => setIsWhatsAppMiniBrowserOpen(false)}
          onMinimize={() => setIsWhatsAppMinimized(!isWhatsAppMinimized)}
        />

        {/* Floating WhatsApp Toggle */}
        {!isWhatsAppMiniBrowserOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsWhatsAppMiniBrowserOpen(true);
              setIsWhatsAppMinimized(false);
            }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[200] w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] border-2 border-[#141414]"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}
        <ProductModal 
          isOpen={isProductModalOpen} 
          onClose={() => setIsProductModalOpen(false)} 
          product={selectedProduct}
          showConfirm={showConfirm}
          showToast={showToast}
        />
        <WaiterModal 
          isOpen={isWaiterModalOpen} 
          onClose={() => setIsWaiterModalOpen(false)} 
          waiter={selectedWaiter}
          showConfirm={showConfirm}
          showToast={showToast}
        />
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedTableIdForOrder(undefined);
            setSelectedOrderTypeForModal(undefined);
          }}
          tables={tables}
          products={products}
          waiters={waiters}
          settings={settings}
          initialTableId={selectedTableIdForOrder}
          initialType={selectedOrderTypeForModal}
          showToast={showToast}
        />
        <OrderDetailsModal
          isOpen={isOrderDetailsOpen}
          onClose={() => setIsOrderDetailsOpen(false)}
          orderId={selectedOrderId}
          products={products}
          settings={settings}
          tables={tables}
          showConfirm={showConfirm}
          showToast={showToast}
          setActiveTab={setActiveTab}
          onOpenSplit={() => setIsBillSplitOpen(true)}
        />
        {isBillSplitOpen && selectedOrderId && (
          <BillSplitModal 
            isOpen={isBillSplitOpen}
            onClose={() => setIsBillSplitOpen(false)}
            order={orders.find(o => o.id === selectedOrderId)!}
            showToast={showToast}
          />
        )}

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#141414] flex items-center justify-around px-2 z-50">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                activeTab === item.id ? "text-[#141414]" : "text-[#141414]/40"
              )}
            >
              <item.icon size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 w-8 h-1 bg-[#141414]"
                />
              )}
            </button>
          ))}
          
          <button 
            onClick={() => {
              setSelectedTableIdForOrder(undefined);
              setIsOrderModalOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-8 bg-[#141414] text-[#E4E3E0] w-14 h-14 rounded-full border-4 border-[#E4E3E0] shadow-lg"
          >
            <Plus size={24} />
          </button>

          {navItems.slice(2, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                activeTab === item.id ? "text-[#141414]" : "text-[#141414]/40"
              )}
            >
              <item.icon size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 w-8 h-1 bg-[#141414]"
                />
              )}
            </button>
          ))}
          
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              activeTab === 'settings' ? "text-[#141414]" : "text-[#141414]/40"
            )}
          >
            <Settings size={20} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Ajustes</span>
            {activeTab === 'settings' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 w-8 h-1 bg-[#141414]"
              />
            )}
          </button>
        </nav>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-20 md:bottom-8 right-8 px-6 py-3 rounded-lg shadow-2xl z-[100] flex items-center gap-3",
              toast.type === 'success' ? "bg-green-600 text-white" : 
              toast.type === 'error' ? "bg-red-600 text-white" : "bg-[#141414] text-white"
            )}
          >
            {toast.type === 'error' && <AlertCircle size={18} />}
            <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 shadow-2xl border border-[#141414]"
            >
              <h3 className="text-xl font-bold uppercase tracking-tighter mb-2">{confirmModal.title}</h3>
              <p className="text-sm opacity-70 mb-8">{confirmModal.message}</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onCancel?.();
                  }}
                  className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#141414] hover:bg-[#141414]/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#141414] text-white hover:bg-[#141414]/90"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function KitchenView({ orders, onUpdateStatus }: { orders: Order[], onUpdateStatus: (id: string, s: OrderStatus) => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Monitor de Cozinha</h2>
          <p className="text-xs md:text-sm opacity-50 mt-1">Pedidos aguardando preparação ou entrega</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          {orders.length} Pedidos Ativos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#141414]/10">
            <ChefHat size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-serif italic text-xl opacity-30">Cozinha limpa por enquanto...</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col"
            >
              <div className="p-4 border-b border-[#141414] bg-[#141414] text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Pedido #{order.id.slice(-4)}</p>
                  <h3 className="font-bold text-lg">Mesa {order.tableId}</h3>
                </div>
                <div className={cn(
                  "px-2 py-1 text-[8px] font-bold uppercase tracking-widest border border-white/20",
                  order.status === 'OPEN' ? "bg-blue-500" : "bg-yellow-500"
                )}>
                  {order.status === 'OPEN' ? 'Novo' : 'Em Preparo'}
                </div>
              </div>

              <div className="p-4 flex-1 space-y-4">
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="font-mono font-bold text-sm">x{item.quantity}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#141414]/5 border-t border-[#141414] grid grid-cols-2 gap-2">
                {order.status === 'OPEN' ? (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'PREPARING')}
                    className="col-span-2 bg-[#141414] text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Começar Preparo
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'OPEN')}
                      className="border border-[#141414] py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'DELIVERING')}
                      className="bg-green-600 text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                    >
                      Pronto / Entregar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardView({ orders, tables, waiters, onNewOrder, onViewOrder }: { orders: Order[], tables: Table[], waiters: Waiter[], onNewOrder: () => void, onViewOrder: (id: string) => void }) {
  const activeTables = tables.filter(t => t.status === 'Ocupada').length;
  const deliveryOrders = orders.filter(o => o.type === 'DELIVERY' && o.status !== 'FINISHED').length;
  const totalSales = orders.filter(o => o.status === 'FINISHED').reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex justify-between items-start w-full md:w-auto">
          <div>
            <h2 className="font-serif italic text-3xl md:text-4xl">Visão Geral</h2>
            <p className="text-xs md:text-sm opacity-50 mt-1">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onNewOrder}
              className="bg-[#141414] text-[#E4E3E0] p-3 md:px-4 md:py-2 hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus size={20} className="md:w-4 md:h-4" />
              <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Novo Pedido</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 w-full md:w-auto">
          <StatCard label="Vendas Hoje" value={`R$ ${totalSales.toFixed(2)}`} trend="+12%" />
          <StatCard label="Mesas Ativas" value={activeTables.toString()} trend="82%" />
          <StatCard label="Delivery Ativo" value={deliveryOrders.toString()} trend="+5" className="hidden sm:block" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#141414] p-4 md:p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 md:mb-6 opacity-50">Pedidos Recentes</h3>
            <div className="space-y-0 border-t border-[#141414]">
              {orders.length === 0 ? (
                <p className="py-8 text-center text-sm opacity-30 italic">Nenhum pedido registrado ainda.</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => onViewOrder(order.id)}
                    className="grid grid-cols-3 sm:grid-cols-4 py-3 md:py-4 border-b border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer px-1 md:px-2 group"
                  >
                    <div className="font-mono text-[10px] md:text-xs truncate mr-2">#{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs md:text-sm font-medium italic font-serif truncate">
                      {order.type === 'TABLE' ? `Mesa ${order.tableId}` : 'Delivery'}
                    </div>
                    <div className="text-[10px] md:text-xs opacity-60 group-hover:opacity-100 hidden sm:block">R$ {order.total.toFixed(2)}</div>
                    <div className="text-[9px] md:text-[10px] uppercase tracking-tighter flex items-center gap-1.5 md:gap-2 justify-end sm:justify-start">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        order.status === 'FINISHED' ? "bg-green-500" : "bg-orange-500"
                      )}></span>
                      <span className="truncate">{order.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#141414] text-[#E4E3E0] p-4 md:p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Status da Cozinha</h3>
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center border-b border-[#E4E3E0]/20 pb-2">
                <span className="text-xs md:text-sm">Pendentes</span>
                <span className="font-mono text-lg md:text-xl">{orders.filter(o => o.status === 'OPEN').length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#E4E3E0]/20 pb-2">
                <span className="text-xs md:text-sm">Em Preparo</span>
                <span className="font-mono text-lg md:text-xl">{orders.filter(o => o.status === 'PREPARING').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm">Prontos</span>
                <span className="font-mono text-lg md:text-xl">{orders.filter(o => o.status === 'DELIVERING').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#141414] p-4 md:p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Garçons em Turno</h3>
            <div className="space-y-3">
              {waiters.length === 0 ? (
                <p className="text-[10px] opacity-30 italic">Nenhum garçom cadastrado.</p>
              ) : (
                waiters.map((waiter) => (
                  <div key={waiter.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#141414] text-[#E4E3E0] text-[10px] flex items-center justify-center font-bold">
                        {waiter.name[0]}
                      </div>
                      <span className="text-[10px] md:text-xs font-medium">{waiter.name}</span>
                    </div>
                    <span className="text-[9px] md:text-[10px] opacity-40 italic">{waiter.shift}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, className }: { label: string, value: string, trend: string, className?: string }) {
  return (
    <div className={cn("bg-white border border-[#141414] p-3 md:p-4 min-w-[120px] md:min-w-[160px]", className)}>
      <p className="text-[8px] md:text-[10px] uppercase tracking-widest opacity-50 font-bold">{label}</p>
      <div className="flex items-baseline justify-between mt-0.5 md:mt-1">
        <p className="text-lg md:text-xl font-mono font-bold">{value}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-green-600">{trend}</p>
      </div>
    </div>
  );
}

function TablesView({ tables, orders, onAddTable, onEditTable, onNewOrder, onViewOrder, onGenerateQR }: { tables: Table[], orders: Order[], onAddTable: () => void, onEditTable: (t: Table) => void, onNewOrder: (tableId: string) => void, onViewOrder: (orderId: string) => void, onGenerateQR: (t: Table) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Salão</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[8px] md:text-[10px] uppercase font-bold tracking-widest opacity-60 mt-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500"></span> Livre</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500"></span> Ocupada</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-500"></span> Fechando</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onNewOrder('')}
            className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={14} />
            Novo Pedido
          </button>
          <button 
            onClick={onAddTable}
            className="border border-[#141414] px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#141414]/5"
          >
            <Plus size={14} />
            Cadastrar Mesa
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
        {tables.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square border border-[#141414] p-3 md:p-4 flex flex-col justify-between bg-white/50 opacity-20">
              <span className="font-mono text-[10px] md:text-xs font-bold">#{String(i + 1).padStart(2, '0')}</span>
              <Utensils size={16} className="mx-auto md:w-5 md:h-5" />
              <span className="text-[8px] md:text-[10px] uppercase font-bold">Vazia</span>
            </div>
          ))
        ) : (
          tables.sort((a, b) => a.number - b.number).map((table) => (
            <div 
              key={table.id} 
              onClick={() => {
                if (table.status === 'Livre') {
                  onNewOrder(table.id);
                } else {
                  const order = orders.find(o => o.tableId === table.id && o.status !== 'FINISHED');
                  if (order) {
                    onViewOrder(order.id);
                  } else {
                    onEditTable(table);
                  }
                }
              }}
              className={cn(
                "aspect-square border border-[#141414] p-3 md:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 active:scale-95",
                table.status === 'Ocupada' ? "bg-red-500 text-white" : table.status === 'Fechando Conta' ? "bg-yellow-500" : "bg-white hover:bg-[#141414] hover:text-[#E4E3E0]"
              )}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] md:text-xs font-bold">#{String(table.number).padStart(2, '0')}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateQR(table);
                  }}
                  className="p-1 hover:bg-white/20"
                  title="Gerar QR Code"
                >
                  <ExternalLink size={10} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTable(table);
                  }}
                  className="p-1 hover:bg-white/20"
                >
                  <Settings size={10} />
                </button>
              </div>
              <div className="text-center">
                <Utensils size={16} className="mx-auto md:w-5 md:h-5 opacity-50" />
              </div>
              <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tighter truncate">
                {table.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DeliveryView({ orders, settings, showToast, onNewOrder }: { orders: Order[], settings: RestaurantSettings | null, showToast: any, onNewOrder: () => void }) {
  const handleSimulateIFood = async () => {
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'DELIVERY',
        status: 'OPEN',
        customerId: 'ifood_user_' + Math.floor(Math.random() * 1000),
        items: [{ productId: 'ifood_1', name: 'Combo iFood #1', price: 45.90, quantity: 1, cost: 15.00 }],
        total: 45.90,
        subtotal: 45.90,
        serviceFee: 0,
        deliveryFee: 5.00,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        platform: 'iFood'
      });
      showToast("Novo pedido iFood simulado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao simular pedido iFood:", error);
    }
  };

  const handleWhatsAppCustomer = (order: Order) => {
    if (!order.customerPhone) {
      showToast("Telefone do cliente não cadastrado!", "error");
      return;
    }
    
    let templateType: 'received' | 'preparing' | 'delivering' | 'finished' = 'received';
    if (order.status === 'PREPARING') templateType = 'preparing';
    if (order.status === 'DELIVERING') templateType = 'delivering';
    if (order.status === 'FINISHED') templateType = 'finished';
    
    WhatsAppService.sendToCustomer(order, settings, templateType);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Delivery</h2>
          <p className="text-xs md:text-sm opacity-50 mt-1">Gestão centralizada de pedidos externos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onNewOrder}
            className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus size={14} />
            Novo Pedido
          </button>
          <button 
            onClick={handleSimulateIFood}
            className="bg-red-600 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Plus size={14} />
            Simular iFood
          </button>
        </div>
      </div>
      <div className="bg-white border border-[#141414] overflow-hidden">
        <div className="hidden sm:grid grid-cols-6 p-4 border-b border-[#141414] bg-[#141414] text-[#E4E3E0] text-[10px] uppercase font-bold tracking-widest">
          <div>ID</div>
          <div className="col-span-2">Cliente</div>
          <div>Status</div>
          <div>Total</div>
          <div className="text-right">Ação</div>
        </div>
        {orders.length === 0 ? (
          <p className="p-12 text-center text-sm opacity-30 italic">Nenhum pedido de delivery ativo.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="flex flex-col sm:grid sm:grid-cols-6 p-4 border-b border-[#141414] items-start sm:items-center hover:bg-[#141414]/5 cursor-pointer transition-colors gap-3 sm:gap-0">
              <div className="font-mono text-[10px] md:text-xs opacity-50 sm:opacity-100">#{order.id.slice(0, 8).toUpperCase()}</div>
              <div className="sm:col-span-2">
                <p className="text-sm font-bold">{order.customerName || `Cliente ID: ${order.customerId?.slice(0, 8)}`}</p>
                {order.customerPhone && <p className="text-[10px] opacity-70">{order.customerPhone}</p>}
                {order.deliveryAddress && <p className="text-[10px] opacity-40 truncate max-w-[200px]">{order.deliveryAddress}</p>}
                <p className="text-[10px] opacity-30">Pedido em: {new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex flex-col gap-1">
                  <span className={cn(
                    "px-2 py-1 text-[9px] font-bold uppercase tracking-widest border",
                    order.status === 'DELIVERING' ? "border-blue-500 text-blue-500" : 
                    order.status === 'FINISHED' ? "border-green-500 text-green-500" :
                    "border-orange-500 text-orange-500"
                  )}>
                    {order.status}
                  </span>
                  <span className="text-[8px] font-bold uppercase opacity-40">{order.platform || 'Manual'}</span>
                </div>
                <div className="sm:hidden font-mono text-sm font-bold">R$ {order.total.toFixed(2)}</div>
              </div>
              <div className="hidden sm:block font-mono text-sm">R$ {order.total.toFixed(2)}</div>
              <div className="w-full sm:text-right flex sm:flex-col gap-2">
                <div className="flex gap-2 sm:justify-end">
                  {order.locationUrl && (
                    <a 
                      href={order.locationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <MapPin size={12} />
                      Localização
                    </a>
                  )}
                  {order.customerPhone && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsAppCustomer(order);
                      }}
                      className="py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare size={12} />
                      WhatsApp
                    </button>
                  )}
                </div>
                <button className="flex-1 sm:flex-none py-2 sm:py-0 text-[10px] font-bold uppercase tracking-widest underline sm:no-underline sm:hover:underline bg-[#141414]/5 sm:bg-transparent">Detalhes</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MenuView({ products, onAddProduct, onEditProduct }: { products: Product[], onAddProduct: () => void, onEditProduct: (p: Product) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Cardápio</h2>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-1">{filteredProducts.length} itens encontrados</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
            <input 
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-[#141414] text-[10px] font-bold uppercase focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 border border-[#141414] text-[10px] font-bold uppercase tracking-widest transition-colors",
                selectedCategory === null ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"
              )}
            >
              Todos
            </button>
            {['Bebidas', 'Pratos', 'Sobremesas', 'Entradas'].map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 border border-[#141414] text-[10px] font-bold uppercase tracking-widest transition-colors",
                  selectedCategory === cat ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <button 
            onClick={onAddProduct}
            className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={14} />
            Adicionar Produto
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredProducts.length === 0 ? (
          <p className="col-span-full p-12 text-center text-sm opacity-30 italic">Nenhum produto encontrado.</p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-white border border-[#141414] group overflow-hidden flex flex-row sm:flex-col h-32 sm:h-auto">
              <div className="w-32 sm:w-full h-full sm:h-40 bg-[#141414]/10 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`} 
                  alt={product.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-[8px] md:text-[10px] uppercase font-bold opacity-40">{product.category}</p>
                    <h4 className="font-serif italic text-base md:text-lg leading-tight">{product.name}</h4>
                    {product.barcode && (
                      <div className="flex items-center gap-1 opacity-30 mt-1">
                        <Barcode size={10} />
                        <span className="text-[8px] font-mono">{product.barcode}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono font-bold text-sm md:text-base whitespace-nowrap">R$ {product.price.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onEditProduct(product)}
                  className="mt-2 sm:mt-4 w-full py-1.5 md:py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                >
                  Editar Item
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WaitersView({ waiters, onAddWaiter, onEditWaiter }: { waiters: Waiter[], onAddWaiter: () => void, onEditWaiter: (w: Waiter) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-serif italic text-3xl md:text-4xl">Equipe</h2>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-1">{waiters.length} funcionários cadastrados</p>
        </div>
        <button 
          onClick={onAddWaiter}
          className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={14} />
          Cadastrar Funcionário
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {waiters.length === 0 ? (
          <p className="col-span-full p-12 text-center text-sm opacity-30 italic">Nenhum funcionário cadastrado.</p>
        ) : (
          waiters.map((waiter) => (
            <div 
              key={waiter.id} 
              onClick={() => onEditWaiter(waiter)}
              className="bg-white border border-[#141414] p-4 md:p-6 relative overflow-hidden cursor-pointer hover:bg-[#141414]/5 transition-colors"
            >
              <div className="absolute top-0 right-0 w-10 md:w-12 h-10 md:h-12 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-serif italic text-lg md:text-xl">
                {waiter.name[0]}
              </div>
              <h4 className="font-serif italic text-lg md:text-xl">{waiter.name}</h4>
              <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest">{waiter.shift}</p>
              
              <div className="mt-4 md:mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span>Comissão</span>
                  <span className="font-mono">{(waiter.commissionRate * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-[#141414] flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase opacity-40">Status</span>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsView({ user, logout, settings, onOpenPublicMenu, showToast }: { user: User, logout: () => void, settings: RestaurantSettings | null, onOpenPublicMenu: () => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [localSettings, setLocalSettings] = useState<Partial<RestaurantSettings>>(settings || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), localSettings);
      showToast("Configurações salvas com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <h2 className="font-serif italic text-3xl md:text-4xl">Configurações</h2>
        <div className="flex gap-2">
          <button 
            onClick={onOpenPublicMenu}
            className="border border-[#141414] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414]/5 flex items-center gap-2"
          >
            <ExternalLink size={14} />
            Cardápio Digital
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#141414] text-[#E4E3E0] px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Perfil do Usuário</h3>
            <div className="bg-white border border-[#141414] p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={user.photoURL || ''} alt="" className="w-12 h-12 border border-[#141414]" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">{user.displayName}</p>
                  <p className="text-[10px] opacity-50">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Informações do Restaurante</h3>
            <div className="bg-white border border-[#141414] p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Nome do Estabelecimento</label>
                <input 
                  type="text" 
                  value={localSettings.restaurantName || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, restaurantName: e.target.value }))}
                  className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Endereço</label>
                <textarea 
                  value={localSettings.address || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none h-20 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">WhatsApp para Pedidos</label>
                <input 
                  type="text" 
                  placeholder="Ex: 5511999999999"
                  value={localSettings.whatsappNumber || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                />
                <p className="text-[8px] opacity-40 mt-1 italic">Inclua o código do país e DDD (apenas números).</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Horário de Funcionamento</h3>
            <div className="bg-white border border-[#141414] p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Abertura</label>
                  <input 
                    type="time" 
                    value={localSettings.operatingHours?.open || ''}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      operatingHours: { ...prev.operatingHours!, open: e.target.value } 
                    }))}
                    className="w-full border border-[#141414] p-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Fechamento</label>
                  <input 
                    type="time" 
                    value={localSettings.operatingHours?.close || ''}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      operatingHours: { ...prev.operatingHours!, close: e.target.value } 
                    }))}
                    className="w-full border border-[#141414] p-2 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Happy Hour</h3>
              <button 
                onClick={() => setLocalSettings(prev => ({ 
                  ...prev, 
                  happyHour: { ...prev.happyHour!, enabled: !prev.happyHour?.enabled } 
                }))}
                className={cn(
                  "px-3 py-1 text-[8px] font-bold uppercase tracking-widest border border-[#141414] transition-colors",
                  localSettings.happyHour?.enabled ? "bg-green-500 text-white" : "bg-white opacity-40"
                )}
              >
                {localSettings.happyHour?.enabled ? 'Ativado' : 'Desativado'}
              </button>
            </div>
            <div className={cn(
              "bg-white border border-[#141414] p-6 space-y-4 transition-opacity",
              !localSettings.happyHour?.enabled && "opacity-40 pointer-events-none"
            )}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Início</label>
                  <input 
                    type="time" 
                    value={localSettings.happyHour?.start || ''}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      happyHour: { ...prev.happyHour!, start: e.target.value } 
                    }))}
                    className="w-full border border-[#141414] p-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Fim</label>
                  <input 
                    type="time" 
                    value={localSettings.happyHour?.end || ''}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      happyHour: { ...prev.happyHour!, end: e.target.value } 
                    }))}
                    className="w-full border border-[#141414] p-2 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Desconto (%)</label>
                <input 
                  type="number" 
                  value={localSettings.happyHour?.discount || 0}
                  onChange={(e) => setLocalSettings(prev => ({ 
                    ...prev, 
                    happyHour: { ...prev.happyHour!, discount: parseInt(e.target.value) } 
                  }))}
                  className="w-full border border-[#141414] p-2 font-mono text-sm"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Taxas e Serviços</h3>
            <div className="bg-white border border-[#141414] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Taxa de Serviço</p>
                  <p className="text-[10px] opacity-50">Percentual aplicado às comandas</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={localSettings.serviceFee || 0}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, serviceFee: parseInt(e.target.value) }))}
                    className="w-16 border border-[#141414] p-1 text-center font-mono text-sm" 
                  />
                  <span className="text-sm font-bold">%</span>
                </div>
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Templates de WhatsApp</h3>
            <div className="bg-white border border-[#141414] p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Pedido Recebido</label>
                <textarea 
                  value={localSettings.whatsappTemplates?.orderReceived || ''}
                  onChange={(e) => setLocalSettings(prev => ({ 
                    ...prev, 
                    whatsappTemplates: { ...prev.whatsappTemplates, orderReceived: e.target.value } 
                  }))}
                  placeholder="Olá {name}! Recebemos seu pedido #{id}..."
                  className="w-full border border-[#141414] p-2 text-xs focus:ring-1 focus:ring-[#141414] outline-none h-20 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Em Preparação</label>
                <textarea 
                  value={localSettings.whatsappTemplates?.orderPreparing || ''}
                  onChange={(e) => setLocalSettings(prev => ({ 
                    ...prev, 
                    whatsappTemplates: { ...prev.whatsappTemplates, orderPreparing: e.target.value } 
                  }))}
                  placeholder="Seu pedido #{id} está sendo preparado..."
                  className="w-full border border-[#141414] p-2 text-xs focus:ring-1 focus:ring-[#141414] outline-none h-20 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Saiu para Entrega</label>
                <textarea 
                  value={localSettings.whatsappTemplates?.orderDelivering || ''}
                  onChange={(e) => setLocalSettings(prev => ({ 
                    ...prev, 
                    whatsappTemplates: { ...prev.whatsappTemplates, orderDelivering: e.target.value } 
                  }))}
                  placeholder="Seu pedido #{id} saiu para entrega!"
                  className="w-full border border-[#141414] p-2 text-xs focus:ring-1 focus:ring-[#141414] outline-none h-20 resize-none"
                />
              </div>
              <p className="text-[8px] opacity-40 italic">Use tags: {'{name}, {id}, {total}, {items}'}</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Dados Fiscais (Opcional)</h3>
            <div className="bg-white border border-[#141414] p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">CNPJ</label>
                  <input 
                    type="text" 
                    value={localSettings.CNPJ || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, CNPJ: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Inscrição Estadual</label>
                  <input 
                    type="text" 
                    value={localSettings.IE || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, IE: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">UF</label>
                  <input 
                    type="text" 
                    value={localSettings.UF || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, UF: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                    placeholder="SP"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">CEP</label>
                  <input 
                    type="text" 
                    value={localSettings.CEP || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, CEP: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Município</label>
                  <input 
                    type="text" 
                    value={localSettings.xMun || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, xMun: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Cód. Município (IBGE)</label>
                  <input 
                    type="text" 
                    value={localSettings.cMun || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, cMun: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                    placeholder="3550308"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Cód. UF (IBGE)</label>
                  <input 
                    type="text" 
                    value={localSettings.cUF || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, cUF: e.target.value }))}
                    className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
                    placeholder="35"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Modals ---

function QRModal({ isOpen, onClose, table }: { isOpen: boolean, onClose: () => void, table: Table | null }) {
  if (!isOpen || !table) return null;

  const qrUrl = `${window.location.origin}/?tableId=${table.id}`;

  const handleDownload = () => {
    const canvas = document.getElementById('table-qr') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `mesa-${table.number}-qr.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-xs p-8 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)] text-center"
      >
        <h3 className="font-serif italic text-3xl mb-2">Mesa {table.number}</h3>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-6">QR Code para Pedidos</p>
        
        <div className="bg-white p-4 border border-[#141414] inline-block mb-6">
          <QRCodeCanvas 
            id="table-qr"
            value={qrUrl} 
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleDownload}
            className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Baixar Imagem
          </button>
          <button 
            onClick={onClose}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TableModal({ isOpen, onClose, table, showConfirm, showToast }: { isOpen: boolean, onClose: () => void, table: Table | null, showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [number, setNumber] = useState(table?.number || 0);
  const [status, setStatus] = useState<TableStatus>(table?.status || 'Livre');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table) {
      setNumber(table.number);
      setStatus(table.status);
    } else {
      setNumber(0);
      setStatus('Livre');
    }
  }, [table]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (table) {
        await updateDoc(doc(db, 'tables', table.id), { number, status });
        showToast("Mesa atualizada!", "success");
      } else {
        await addDoc(collection(db, 'tables'), { number, status });
        showToast("Mesa cadastrada!", "success");
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, table ? OperationType.UPDATE : OperationType.CREATE, table ? `tables/${table.id}` : 'tables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!table) return;
    showConfirm(
      "Excluir Mesa",
      "Deseja realmente excluir esta mesa?",
      async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, 'tables', table.id));
          showToast("Mesa excluída!", "success");
          onClose();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tables/${table.id}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-sm p-8 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]"
      >
        <h3 className="font-serif italic text-3xl mb-6">{table ? 'Editar Mesa' : 'Nova Mesa'}</h3>
        
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Número da Mesa</label>
            <input 
              type="number" 
              value={number}
              onChange={(e) => setNumber(parseInt(e.target.value))}
              className="w-full border border-[#141414] p-3 font-mono text-lg focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value as TableStatus)}
              className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest focus:ring-1 focus:ring-[#141414] outline-none"
            >
              <option value="Livre">Livre</option>
              <option value="Ocupada">Ocupada</option>
              <option value="Fechando Conta">Fechando Conta</option>
              <option value="Aguardando Limpeza">Aguardando Limpeza</option>
            </select>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Mesa'}
            </button>
            {table && (
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="w-full border border-red-500 text-red-500 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                Excluir Mesa
              </button>
            )}
            <button 
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProductModal({ isOpen, onClose, product, showConfirm, showToast }: { isOpen: boolean, onClose: () => void, product: Product | null, showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [cost, setCost] = useState(product?.cost || 0);
  const [category, setCategory] = useState(product?.category || 'Pratos');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price);
      setCost(product.cost || 0);
      setCategory(product.category);
      setImageUrl(product.imageUrl || '');
      setBarcode(product.barcode || '');
    } else {
      setName('');
      setPrice(0);
      setCost(0);
      setCategory('Pratos');
      setImageUrl('');
      setBarcode('');
    }
  }, [product]);

  const handleSave = async () => {
    if (!name || price <= 0) {
      showToast("Preencha o nome e o preço corretamente.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = { name, price, cost, category, imageUrl, barcode, updatedAt: serverTimestamp() };
      if (product) {
        await updateDoc(doc(db, 'products', product.id), data);
        showToast("Produto atualizado!", "success");
      } else {
        await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp(), available: true });
        showToast("Produto cadastrado!", "success");
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, product ? OperationType.UPDATE : OperationType.CREATE, product ? `products/${product.id}` : 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 in Firestore
        showToast("A imagem é muito grande. Use uma imagem menor que 500KB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    showConfirm(
      "Excluir Produto",
      "Deseja realmente excluir este produto?",
      async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, 'products', product.id));
          showToast("Produto excluído!", "success");
          onClose();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `products/${product.id}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-md p-8 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)] max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-serif italic text-3xl mb-6">{product ? 'Editar Produto' : 'Novo Produto'}</h3>
        
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="flex flex-col items-center gap-2">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-[#141414]/20 flex flex-col items-center justify-center cursor-pointer hover:bg-[#141414]/5 transition-colors overflow-hidden"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="opacity-30 mb-2" />
                    <span className="text-[8px] font-bold uppercase opacity-40">Upload Foto</span>
                  </>
                )}
              </div>
              {imageUrl && (
                <button 
                  onClick={() => setImageUrl('')}
                  className="text-[8px] font-bold uppercase tracking-widest text-red-500 hover:underline"
                >
                  Remover Foto
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Nome</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Preço Venda (R$)</label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full border border-[#141414] p-2 font-mono text-sm focus:ring-1 focus:ring-[#141414] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Custo (R$)</label>
              <input 
                type="number" 
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value))}
                className="w-full border border-[#141414] p-2 font-mono text-sm focus:ring-1 focus:ring-[#141414] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Categoria</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full border border-[#141414] p-2 text-xs uppercase font-bold tracking-widest focus:ring-1 focus:ring-[#141414] outline-none"
              >
                <option value="Bebidas">Bebidas</option>
                <option value="Pratos">Pratos</option>
                <option value="Sobremesas">Sobremesas</option>
                <option value="Entradas">Entradas</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Cód. Barras</label>
              <input 
                type="text" 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full border border-[#141414] p-2 text-[10px] font-mono focus:ring-1 focus:ring-[#141414] outline-none"
                placeholder="EAN-13 / SKU"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">URL da Imagem (Opcional)</label>
            <input 
              type="text" 
              value={imageUrl.startsWith('data:') ? 'Imagem carregada via upload' : imageUrl}
              readOnly={imageUrl.startsWith('data:')}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-[#141414] p-2 text-[10px] focus:ring-1 focus:ring-[#141414] outline-none"
              placeholder="https://exemplo.com/imagem.jpg"
            />
            {imageUrl.startsWith('data:') && (
              <button 
                onClick={() => setImageUrl('')}
                className="text-[8px] font-bold uppercase text-red-500 mt-1"
              >
                Remover Upload
              </button>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-[#141414] text-[#E4E3E0] py-3 font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
            {product && (
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="w-full border border-red-500 text-red-500 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                Excluir Produto
              </button>
            )}
            <button onClick={onClose} className="w-full py-2 text-[10px] font-bold uppercase tracking-widest opacity-40">Cancelar</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WaiterModal({ isOpen, onClose, waiter, showConfirm, showToast }: { isOpen: boolean, onClose: () => void, waiter: Waiter | null, showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [name, setName] = useState(waiter?.name || '');
  const [shift, setShift] = useState(waiter?.shift || 'Manhã');
  const [commissionRate, setCommissionRate] = useState(waiter?.commissionRate || 0.05);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (waiter) {
      setName(waiter.name);
      setShift(waiter.shift);
      setCommissionRate(waiter.commissionRate);
    } else {
      setName('');
      setShift('Manhã');
      setCommissionRate(0.05);
    }
  }, [waiter]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = { name, shift, commissionRate, updatedAt: serverTimestamp() };
      if (waiter) {
        await updateDoc(doc(db, 'waiters', waiter.id), data);
        showToast("Funcionário atualizado!", "success");
      } else {
        await addDoc(collection(db, 'waiters'), { ...data, createdAt: serverTimestamp() });
        showToast("Funcionário cadastrado!", "success");
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, waiter ? OperationType.UPDATE : OperationType.CREATE, waiter ? `waiters/${waiter.id}` : 'waiters');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!waiter) return;
    showConfirm(
      "Excluir Funcionário",
      "Deseja realmente excluir este funcionário?",
      async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, 'waiters', waiter.id));
          showToast("Funcionário excluído!", "success");
          onClose();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `waiters/${waiter.id}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-sm p-8 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]"
      >
        <h3 className="font-serif italic text-3xl mb-6">{waiter ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Turno</label>
            <select 
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full border border-[#141414] p-2 text-xs uppercase font-bold tracking-widest focus:ring-1 focus:ring-[#141414] outline-none"
            >
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
              <option value="Madrugada">Madrugada</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-1">Comissão (%)</label>
            <input 
              type="number" 
              value={commissionRate * 100}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) / 100)}
              className="w-full border border-[#141414] p-2 font-mono text-sm focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-[#141414] text-[#E4E3E0] py-3 font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
            {waiter && (
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="w-full border border-red-500 text-red-500 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                Excluir Funcionário
              </button>
            )}
            <button onClick={onClose} className="w-full py-2 text-[10px] font-bold uppercase tracking-widest opacity-40">Cancelar</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OrderModal({ isOpen, onClose, tables, products, waiters, settings, initialTableId, initialType, showToast }: { isOpen: boolean, onClose: () => void, tables: Table[], products: Product[], waiters: Waiter[], settings: RestaurantSettings | null, initialTableId?: string, initialType?: 'TABLE' | 'DELIVERY', showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [type, setType] = useState<'TABLE' | 'DELIVERY'>('TABLE');
  const [tableId, setTableId] = useState(initialTableId || '');
  const [waiterId, setWaiterId] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<{ id: string, quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCategory(null);
      if (initialType) setType(initialType);
    }
    if (initialTableId) {
      setTableId(initialTableId);
      setType('TABLE');
    }
  }, [initialTableId, isOpen]);

  const handleAddProduct = (id: string) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === id);
      if (existing) {
        return prev.map(p => p.id === id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((acc, sp) => {
      const product = products.find(p => p.id === sp.id);
      return acc + (product?.price || 0) * sp.quantity;
    }, 0);
  };

  const handleCreateOrder = async () => {
    if (type === 'TABLE' && !tableId) return showToast("Selecione uma mesa", "error");
    if (selectedProducts.length === 0) return showToast("Adicione pelo menos um item", "error");

    setLoading(true);
    try {
      const subtotal = calculateTotal();
      const serviceFeeRate = (settings?.serviceFee || 10) / 100;
      const serviceFee = type === 'TABLE' ? subtotal * serviceFeeRate : 0;
      const total = subtotal + serviceFee + (type === 'DELIVERY' ? deliveryFee : 0);

      const orderData = {
        type,
        status: 'OPEN',
        tableId: type === 'TABLE' ? tableId : null,
        waiterId: waiterId || null,
        customerName: type === 'DELIVERY' ? customerName : null,
        customerPhone: type === 'DELIVERY' ? customerPhone : null,
        deliveryAddress: type === 'DELIVERY' ? deliveryAddress : null,
        locationUrl: type === 'DELIVERY' ? locationUrl : null,
        items: selectedProducts.map(sp => {
          const p = products.find(prod => prod.id === sp.id)!;
          return {
            productId: p.id,
            name: p.name,
            price: p.price,
            cost: p.cost,
            quantity: sp.quantity
          };
        }),
        subtotal,
        serviceFee,
        deliveryFee: type === 'DELIVERY' ? deliveryFee : 0,
        total,
        peopleCount: type === 'TABLE' ? peopleCount : 1,
        platform: type === 'DELIVERY' ? 'Manual' : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      if (type === 'TABLE') {
        const table = tables.find(t => t.id === tableId);
        if (table) {
          await updateDoc(doc(db, 'tables', table.id), { status: 'Ocupada' });
        }
      }

      showToast("Pedido criado com sucesso!", "success");
      onClose();
      setSelectedProducts([]);
      setTableId('');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setLocationUrl('');
      setDeliveryFee(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return showToast("Geolocalização não suportada pelo navegador", "error");
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setLocationUrl(url);
        showToast("Localização capturada!", "success");
      },
      (error) => {
        showToast("Erro ao capturar localização: " + error.message, "error");
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]"
      >
        <div className="p-6 border-b border-[#141414] flex justify-between items-center">
          <h3 className="font-serif italic text-3xl">Novo Pedido</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#141414]/5">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Configuration */}
          <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-[#141414] overflow-y-auto">
            <div className="space-y-6">
              <div className="flex gap-2">
                <button 
                  onClick={() => setType('TABLE')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#141414]",
                    type === 'TABLE' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                  )}
                >
                  Mesa
                </button>
                <button 
                  onClick={() => setType('DELIVERY')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#141414]",
                    type === 'DELIVERY' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                  )}
                >
                  Delivery
                </button>
              </div>

              {type === 'TABLE' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Mesa</label>
                    <select 
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                    >
                      <option value="">Selecione a Mesa</option>
                      {tables.filter(t => t.status === 'Livre').map(t => (
                        <option key={t.id} value={t.id}>Mesa {t.number}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Pessoas na Mesa</label>
                    <input 
                      type="number"
                      min="1"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Nome do Cliente</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Endereço de Entrega</label>
                    <textarea 
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest h-24 resize-none"
                      placeholder="Rua, Número, Bairro, Complemento..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Taxa de Entrega (R$)</label>
                    <input 
                      type="number" 
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Geolocalização</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={locationUrl}
                        readOnly
                        className="flex-1 border border-[#141414] p-3 font-mono text-[10px] bg-gray-50 outline-none"
                        placeholder="Link do Google Maps"
                      />
                      <button 
                        onClick={handleGetLocation}
                        className="p-3 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                      >
                        <MapPin size={14} />
                        Capturar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Garçom (Opcional)</label>
                <select 
                  value={waiterId}
                  onChange={(e) => setWaiterId(e.target.value)}
                  className="w-full border border-[#141414] p-3 font-bold text-xs uppercase tracking-widest"
                >
                  <option value="">Selecione o Garçom</option>
                  {waiters.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Produtos</label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" size={12} />
                      <input 
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 pr-2 py-1 border border-[#141414] text-[10px] font-bold uppercase focus:ring-1 focus:ring-[#141414] outline-none w-32"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-2 py-1 text-[8px] font-bold uppercase tracking-widest border border-[#141414]",
                      selectedCategory === null ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    Todos
                  </button>
                  {['Bebidas', 'Pratos', 'Sobremesas', 'Entradas'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2 py-1 text-[8px] font-bold uppercase tracking-widest border border-[#141414]",
                        selectedCategory === cat ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {products
                    .filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesCategory = !selectedCategory || p.category === selectedCategory;
                      return matchesSearch && matchesCategory && p.available;
                    })
                    .map(p => (
                    <button 
                      key={p.id}
                      onClick={() => handleAddProduct(p.id)}
                      className="text-left p-3 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group"
                    >
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] opacity-50 group-hover:opacity-100 font-mono">R$ {p.price.toFixed(2)}</p>
                    </button>
                  ))}
                  {products.filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = !selectedCategory || p.category === selectedCategory;
                    return matchesSearch && matchesCategory && p.available;
                  }).length === 0 && (
                    <p className="col-span-2 text-center py-8 text-[10px] opacity-30 italic">Nenhum produto encontrado</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="w-full md:w-1/2 p-6 bg-[#141414]/5 flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Resumo do Pedido</h4>
            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
              {selectedProducts.length === 0 ? (
                <p className="text-center py-12 text-sm opacity-30 italic">Nenhum item selecionado</p>
              ) : (
                selectedProducts.map(sp => {
                  const p = products.find(prod => prod.id === sp.id)!;
                  return (
                    <div key={sp.id} className="flex justify-between items-center bg-white border border-[#141414] p-3">
                      <div>
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[10px] opacity-50 font-mono">{sp.quantity}x R$ {p.price.toFixed(2)}</p>
                      </div>
                      <button onClick={() => handleRemoveProduct(sp.id)} className="text-red-500 p-1 hover:bg-red-50 transition-colors">
                        <Plus className="rotate-45" size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#141414] pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="opacity-50">Subtotal</span>
                <span className="font-mono">R$ {calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-50">Taxa de Serviço ({settings?.serviceFee || 10}%)</span>
                <span className="font-mono">R$ {(calculateTotal() * ((settings?.serviceFee || 10) / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#141414]">
                <span>Total</span>
                <span className="font-mono">R$ {(calculateTotal() * (1 + (settings?.serviceFee || 10) / 100)).toFixed(2)}</span>
              </div>
              <button 
                onClick={handleCreateOrder}
                disabled={loading || selectedProducts.length === 0}
                className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-widest mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PublicMenuView({ products, settings, onBack, showToast, tables }: { products: Product[], settings: RestaurantSettings | null, onBack: () => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void, tables: Table[] }) {
  const [cart, setCart] = useState<{ id: string, quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTableId = urlParams.get('tableId');
    if (urlTableId) {
      const table = tables.find(t => t.id === urlTableId);
      if (table) {
        setTableNumber(String(table.number));
      }
    }
  }, [tables]);

  const addToCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { id, quantity: 1 }];
    });
    showToast("Item adicionado!", "info");
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.id);
      return acc + (p?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSendOrder = () => {
    if (!customerName) return showToast("Por favor, informe seu nome.", "error");
    if (cart.length === 0) return showToast("Seu carrinho está vazio.", "error");

    const order: any = {
      id: 'temp_' + Date.now(),
      customerName,
      items: cart.map(item => {
        const p = products.find(prod => prod.id === item.id)!;
        return { name: p.name, quantity: item.quantity, price: p.price };
      }),
      total: calculateTotal() * (1 + (settings?.serviceFee || 10) / 100),
      tableId: tableNumber
    };

    WhatsAppService.sendToRestaurant(order, settings);
    showToast("Pedido enviado via WhatsApp!", "success");
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-[#141414] shadow-[20px_20px_0px_0px_rgba(20,20,20,1)] flex flex-col md:flex-row min-h-[80vh]">
      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-[#141414] overflow-y-auto max-h-[60vh] md:max-h-none">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-serif italic text-3xl">{settings?.restaurantName || 'Cardápio'}</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Selecione seus itens</p>
          </div>
          <button onClick={onBack} className="text-[10px] font-bold uppercase underline">Voltar</button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input 
              type="text"
              placeholder="O que você procura?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#141414] text-sm font-bold uppercase focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#141414]",
                selectedCategory === null ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
              )}
            >
              Todos
            </button>
            {['Bebidas', 'Pratos', 'Sobremesas', 'Entradas'].map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#141414]",
                  selectedCategory === cat ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products
            .filter(p => {
              const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesCategory = !selectedCategory || p.category === selectedCategory;
              return matchesSearch && matchesCategory && p.available;
            })
            .map(p => (
            <div key={p.id} className="border border-[#141414] p-3 flex gap-3 group">
              <div className="w-16 h-16 bg-[#141414]/5 shrink-0 overflow-hidden">
                <img src={p.imageUrl || `https://picsum.photos/seed/${p.id}/100/100`} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold leading-tight">{p.name}</h4>
                  <p className="text-xs font-mono">R$ {p.price.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => addToCart(p.id)}
                  className="mt-2 w-full py-1 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ))}
          {products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || p.category === selectedCategory;
            return matchesSearch && matchesCategory && p.available;
          }).length === 0 && (
            <p className="col-span-2 text-center py-12 text-sm opacity-30 italic">Nenhum produto encontrado</p>
          )}
        </div>
      </div>

      <div className="w-full md:w-80 p-6 bg-[#141414]/5 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart size={18} />
          <h3 className="text-[10px] font-bold uppercase tracking-widest">Seu Carrinho</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {cart.length === 0 ? (
            <p className="text-center py-12 text-xs opacity-30 italic">Carrinho vazio</p>
          ) : (
            cart.map(item => {
              const p = products.find(prod => prod.id === item.id)!;
              return (
                <div key={item.id} className="bg-white border border-[#141414] p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="text-[10px] opacity-50">{item.quantity}x R$ {p.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500">
                    <Plus className="rotate-45" size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4 border-t border-[#141414] pt-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Seu Nome</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">Mesa (Opcional)</label>
            <input 
              type="text" 
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-[#141414] p-2 text-sm focus:ring-1 focus:ring-[#141414] outline-none"
            />
          </div>
          
          <div className="flex justify-between items-end pt-2">
            <span className="text-[10px] font-bold uppercase opacity-50">Total</span>
            <span className="text-xl font-mono font-bold">R$ {calculateTotal().toFixed(2)}</span>
          </div>

          <button 
            onClick={handleSendOrder}
            className="w-full bg-green-600 text-white py-4 font-bold uppercase tracking-widest hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Pedir via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailsModal({ isOpen, onClose, orderId, products, settings, tables, showConfirm, showToast, setActiveTab, onOpenSplit }: { isOpen: boolean, onClose: () => void, orderId: string | null, products: Product[], settings: RestaurantSettings | null, tables: Table[], showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void, showToast: (message: string, type?: 'success' | 'error' | 'info') => void, setActiveTab: (tab: Tab) => void, onOpenSplit: () => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const [newItems, setNewItems] = useState<{ id: string, quantity: number }[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !isOpen) return;
    setSearchTerm('');
    setSelectedCategory(null);
    const unsub = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `orders/${orderId}`));
    return () => unsub();
  }, [orderId, isOpen]);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), { status, updatedAt: serverTimestamp() });
      showToast(`Status atualizado para ${status}`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleFinishOrder = async () => {
    if (!order) return;
    
    showConfirm(
      "Finalizar Conta",
      "Deseja realmente finalizar este pedido e liberar a mesa?",
      async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'orders', order.id), { 
            status: 'FINISHED', 
            updatedAt: serverTimestamp() 
          });
          if (order.tableId) {
            await updateDoc(doc(db, 'tables', order.tableId), { status: 'Livre' });
          }
          showToast("Conta finalizada com sucesso!", "success");
          onClose();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleAddItems = async () => {
    if (!order || newItems.length === 0) return;
    setLoading(true);
    try {
      const addedItems = newItems.map(ni => {
        const p = products.find(prod => prod.id === ni.id)!;
        return {
          productId: p.id,
          name: p.name,
          price: p.price,
          cost: p.cost || 0,
          quantity: ni.quantity
        };
      });

      const updatedItems = [...order.items, ...addedItems];
      const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const serviceFee = subtotal * ((settings?.serviceFee || 10) / 100);
      const total = subtotal + serviceFee;

      await updateDoc(doc(db, 'orders', order.id), {
        items: updatedItems,
        subtotal,
        serviceFee,
        total,
        updatedAt: serverTimestamp()
      });
      showToast("Itens adicionados com sucesso!", "success");
      setAddingItems(false);
      setNewItems([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (index: number, newQuantity: number) => {
    if (!order) return;
    if (newQuantity < 1) {
      handleRemoveItem(index);
      return;
    }

    setLoading(true);
    try {
      const updatedItems = order.items.map((item, i) => i === index ? { ...item, quantity: newQuantity } : item);
      const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const serviceFee = subtotal * ((settings?.serviceFee || 10) / 100);
      const total = subtotal + serviceFee;

      await updateDoc(doc(db, 'orders', order.id), {
        items: updatedItems,
        subtotal,
        serviceFee,
        total,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    if (!order) return;
    
    showConfirm(
      "Remover Item",
      `Deseja remover o item "${order.items[index].name}" do pedido?`,
      async () => {
        setLoading(true);
        try {
          const updatedItems = order.items.filter((_, i) => i !== index);
          const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          const serviceFee = subtotal * ((settings?.serviceFee || 10) / 100);
          const total = subtotal + serviceFee;

          await updateDoc(doc(db, 'orders', order.id), {
            items: updatedItems,
            subtotal,
            serviceFee,
            total,
            updatedAt: serverTimestamp()
          });
          showToast("Item removido com sucesso!", "success");
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handlePrint = () => {
    if (!order) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 5px 0;">${item.name} x${item.quantity}</td>
        <td style="text-align: right; padding: 5px 0;">R$ ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Comanda #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10px; color: #000; }
            h2 { text-align: center; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            p { margin: 4px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h2>${settings?.restaurantName || 'FLUXBar'}</h2>
          <p><b>PEDIDO:</b> #${order.id.slice(0, 8).toUpperCase()}</p>
          <p><b>DATA:</b> ${new Date().toLocaleString('pt-BR')}</p>
          <p><b>TIPO:</b> ${order.type === 'TABLE' ? `MESA ${table?.number || order.tableId}` : 'DELIVERY'}</p>
          ${order.type === 'DELIVERY' ? `
            <p><b>CLIENTE:</b> ${order.customerName || ''}</p>
            <p><b>TEL:</b> ${order.customerPhone || ''}</p>
            <p><b>ENDEREÇO:</b> ${order.deliveryAddress || ''}</p>
          ` : ''}
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left; font-size: 10px; text-transform: uppercase;">Item</th>
                <th style="text-align: right; font-size: 10px; text-transform: uppercase;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            <p style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>R$ ${order.subtotal.toFixed(2)}</span></p>
            <p style="display: flex; justify-content: space-between;"><span>Taxa (${settings?.serviceFee}%):</span> <span>R$ ${order.serviceFee.toFixed(2)}</span></p>
            <p style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 5px;"><span>TOTAL:</span> <span>R$ ${order.total.toFixed(2)}</span></p>
          </div>
          <div class="footer">
            <p>Obrigado pela preferência!</p>
            <p>${settings?.address || ''}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!order) return;
    
    let templateType: 'received' | 'preparing' | 'delivering' | 'finished' = 'received';
    if (order.status === 'PREPARING') templateType = 'preparing';
    if (order.status === 'DELIVERING') templateType = 'delivering';
    if (order.status === 'FINISHED') templateType = 'finished';
    
    WhatsAppService.sendToCustomer(order, settings, templateType);
  };

  const handleEmitInvoice = async () => {
    if (!order) return;
    setLoadingInvoice(true);
    try {
      // 1. Buscar configuração fiscal
      const fiscalSnap = await getDoc(doc(db, 'fiscal_config', 'main'));
      if (!fiscalSnap.exists()) {
        showToast("Configure o Módulo Fiscal primeiro!", "error");
        setActiveTab('fiscal');
        return;
      }
      const fiscalConfig = fiscalSnap.data();

      // 2. Chamar API de emissão
      const response = await fetch('/api/fiscal/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: fiscalConfig,
          order: order,
          settings: settings
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await updateDoc(doc(db, 'orders', order.id), {
          invoiceEmitted: true,
          invoiceUrl: result.invoiceUrl,
          updatedAt: serverTimestamp()
        });
        showToast("Nota Fiscal emitida com sucesso!", "success");
        if (result.invoiceUrl) {
          window.open(result.invoiceUrl, '_blank');
        }
      } else {
        showToast(result.message || "Erro ao emitir nota fiscal na SEFAZ", "error");
      }
    } catch (error: any) {
      console.error("Invoice Error:", error);
      showToast(`Erro: ${error.message || "Conexão falhou"}`, "error");
    } finally {
      setLoadingInvoice(false);
    }
  };

  if (!isOpen || !order) return null;

  const table = tables.find(t => t.id === order.tableId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]"
      >
        <div className="p-6 border-b border-[#141414] flex justify-between items-center">
          <div>
            <h3 className="font-serif italic text-3xl">Pedido #{order.id.slice(0, 8).toUpperCase()}</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">
              {order.type === 'TABLE' ? `Mesa ${table?.number || order.tableId}` : 'Delivery'} • {order.status}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#141414]/5">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Delivery Info */}
          {order.type === 'DELIVERY' && (
            <div className="p-4 bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-800">Informações de Entrega</h4>
                {order.locationUrl && (
                  <a 
                    href={order.locationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-600 hover:underline"
                  >
                    <MapPin size={12} />
                    Ver no Mapa
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] uppercase font-bold opacity-50">Cliente</p>
                  <p className="text-xs font-bold">{order.customerName || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold opacity-50">Telefone</p>
                  <p className="text-xs font-bold">{order.customerPhone || 'Não informado'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] uppercase font-bold opacity-50">Endereço</p>
                  <p className="text-xs font-bold">{order.deliveryAddress || 'Não informado'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Itens do Pedido</h4>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-[#141414]/10 pb-2">
                <div className="flex-1">
                  <p className="text-xs font-bold">{item.name}</p>
                  <p className="text-[10px] opacity-50 font-mono">R$ {item.price.toFixed(2)} un.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border border-[#141414] p-1">
                    <button 
                      onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                      disabled={loading}
                      className="p-1 hover:bg-[#141414]/5 disabled:opacity-30"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-[10px] font-mono font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                      disabled={loading}
                      className="p-1 hover:bg-[#141414]/5 disabled:opacity-30"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="min-w-[70px] text-right">
                    <p className="text-xs font-mono font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(idx)}
                    disabled={loading}
                    className="p-2 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {addingItems && (
            <div className="p-4 bg-[#141414]/5 border border-[#141414] space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold uppercase tracking-widest">Adicionar Itens</h4>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" size={10} />
                  <input 
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-6 pr-2 py-1 border border-[#141414] text-[8px] font-bold uppercase focus:ring-1 focus:ring-[#141414] outline-none w-24"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "px-2 py-1 text-[7px] font-bold uppercase tracking-widest border border-[#141414]",
                    selectedCategory === null ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                  )}
                >
                  Todos
                </button>
                {['Bebidas', 'Pratos', 'Sobremesas', 'Entradas'].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-2 py-1 text-[7px] font-bold uppercase tracking-widest border border-[#141414]",
                      selectedCategory === cat ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {products
                  .filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = !selectedCategory || p.category === selectedCategory;
                    return matchesSearch && matchesCategory && p.available;
                  })
                  .map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setNewItems(prev => {
                        const existing = prev.find(ni => ni.id === p.id);
                        if (existing) return prev.map(ni => ni.id === p.id ? { ...ni, quantity: ni.quantity + 1 } : ni);
                        return [...prev, { id: p.id, quantity: 1 }];
                      });
                    }}
                    className="text-left p-2 border border-[#141414] text-[10px] font-bold hover:bg-[#141414] hover:text-[#E4E3E0]"
                  >
                    {p.name}
                  </button>
                ))}
                {products.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = !selectedCategory || p.category === selectedCategory;
                  return matchesSearch && matchesCategory && p.available;
                }).length === 0 && (
                  <p className="col-span-2 text-center py-4 text-[10px] opacity-30 italic">Nenhum produto encontrado</p>
                )}
              </div>
              {newItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#141414]/10">
                  {newItems.map(ni => {
                    const p = products.find(prod => prod.id === ni.id);
                    return (
                      <div key={ni.id} className="flex justify-between items-center text-[10px]">
                        <span className="font-bold">{p?.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 border border-[#141414] p-1">
                            <button 
                              onClick={() => setNewItems(prev => prev.map(p => p.id === ni.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))}
                              className="p-0.5 hover:bg-[#141414]/5"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-mono font-bold w-3 text-center">{ni.quantity}</span>
                            <button 
                              onClick={() => setNewItems(prev => prev.map(p => p.id === ni.id ? { ...p, quantity: p.quantity + 1 } : p))}
                              className="p-0.5 hover:bg-[#141414]/5"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <button 
                            onClick={() => setNewItems(prev => prev.filter(p => p.id !== ni.id))} 
                            className="text-red-500 hover:underline font-bold uppercase"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button 
                    onClick={handleAddItems}
                    disabled={loading}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Confirmar Adição'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Controls */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Fluxo do Pedido</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'OPEN', label: 'Aberto', color: 'bg-blue-500' },
                { id: 'PREPARING', label: 'Preparando', color: 'bg-yellow-500' },
                { id: 'DELIVERING', label: 'Entregando', color: 'bg-purple-500' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleUpdateStatus(s.id as OrderStatus)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-4 border-2 transition-all duration-200",
                    order.status === s.id 
                      ? `border-[#141414] bg-[#141414] text-white shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]` 
                      : "border-[#141414]/10 hover:border-[#141414] hover:bg-[#141414]/5"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mb-2",
                    order.status === s.id ? "bg-white" : s.color
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{s.label}</span>
                  {order.status === s.id && (
                    <motion.div 
                      layoutId="active-status"
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#141414] bg-[#141414]/5 space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handlePrint}
                className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                title="Imprimir Comanda"
              >
                <Printer size={14} />
                Imprimir
              </button>
              <button 
                onClick={handleWhatsApp}
                className="p-2 border border-[#141414] hover:bg-green-600 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                title="Enviar por WhatsApp"
              >
                <Share2 size={14} />
                WhatsApp
              </button>
              <button 
                onClick={onOpenSplit}
                className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                title="Dividir Conta"
              >
                <Users size={14} />
                Dividir
              </button>
              {order.status === 'FINISHED' && !order.invoiceEmitted && (
                <button 
                  onClick={handleEmitInvoice}
                  disabled={loadingInvoice}
                  className="p-2 border border-[#141414] bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                  title="Emitir Nota Fiscal"
                >
                  <FileText size={14} />
                  {loadingInvoice ? 'Emitindo...' : 'Emitir Nota'}
                </button>
              )}
              {order.invoiceEmitted && (
                <button 
                  onClick={() => window.open(order.invoiceUrl, '_blank')}
                  className="p-2 border border-[#141414] bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                  title="Ver Nota Fiscal"
                >
                  <FileText size={14} />
                  Ver Nota
                </button>
              )}
            </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Total a Pagar</p>
                <p className="text-3xl font-mono font-bold">R$ {order.total.toFixed(2)}</p>
                {order.peopleCount && order.peopleCount > 1 && (
                  <p className="text-[10px] opacity-50 italic mt-1">
                    Divisão: R$ {(order.total / order.peopleCount).toFixed(2)} por pessoa ({order.peopleCount} pessoas)
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setAddingItems(!addingItems)}
                className="border border-[#141414] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414]/5"
              >
                {addingItems ? 'Cancelar' : 'Adicionar Itens'}
              </button>
              <button 
                onClick={handleFinishOrder}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-green-700"
              >
                {loading ? '...' : 'Finalizar Conta'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReportsView({ orders, products }: { orders: Order[], products: Product[] }) {
  const finishedOrders = orders.filter(o => o.status === 'FINISHED');
  
  const totalSales = finishedOrders.reduce((acc, o) => acc + o.total, 0);
  const avgTicket = finishedOrders.length > 0 ? totalSales / finishedOrders.length : 0;
  
  // CMV (COGS) Calculation
  const totalCost = finishedOrders.reduce((acc, o) => {
    return acc + o.items.reduce((itemAcc, item) => itemAcc + (item.cost || 0) * item.quantity, 0);
  }, 0);
  const cmv = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

  // Best Sellers (ABC Curve)
  const productSales: { [key: string]: { name: string, quantity: number, total: number } } = {};
  finishedOrders.forEach(o => {
    o.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0, total: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].total += item.price * item.quantity;
    });
  });

  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const salesByDay = finishedOrders.reduce((acc: any, o) => {
    const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje';
    if (!acc[date]) acc[date] = 0;
    acc[date] += o.total;
    return acc;
  }, {});

  const chartData = Object.entries(salesByDay).map(([date, total]) => ({ date, total }));

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-serif italic text-4xl tracking-tight">Relatórios & BI</h2>
          <p className="text-sm opacity-50 uppercase tracking-widest font-bold mt-1">Visão estratégica em tempo real</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Vendas Totais', value: `R$ ${totalSales.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-600' },
          { label: 'CMV (Custo)', value: `${cmv.toFixed(1)}%`, icon: PieChart, color: 'text-orange-600' },
          { label: 'Pedidos', value: finishedOrders.length, icon: Package, color: 'text-purple-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[#141414] p-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 bg-[#141414]/5 rounded-lg", m.color)}>
                <m.icon size={20} />
              </div>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">{m.label}</p>
            <p className="text-2xl font-mono font-bold mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white border border-[#141414] p-6 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-6 opacity-50">Evolução de Vendas</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #141414', borderRadius: '0', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="total" stroke="#141414" strokeWidth={2} dot={{ r: 4, fill: '#141414' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-white border border-[#141414] p-6 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-6 opacity-50">Produtos Mais Vendidos (Curva ABC)</h3>
          <div className="space-y-4">
            {bestSellers.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-[#141414]/10 hover:border-[#141414] transition-colors">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs opacity-30">0{i+1}</span>
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-[10px] opacity-50 uppercase">{p.quantity} unidades vendidas</p>
                  </div>
                </div>
                <p className="font-mono font-bold">R$ {p.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppMiniBrowser({ isOpen, isMinimized, onClose, onMinimize }: { isOpen: boolean, isMinimized: boolean, onClose: () => void, onMinimize: () => void }) {
  const popupRef = useRef<Window | null>(null);

  const openWhatsAppPopup = () => {
    const width = 450;
    const height = 700;
    const left = window.screen.width - width - 50;
    const top = 100;
    
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
    } else {
      popupRef.current = window.open(
        'https://web.whatsapp.com',
        'WhatsAppFLUX',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
      );
    }
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Auto-open or focus when the panel is expanded
      const timer = setTimeout(openWhatsAppPopup, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  if (!isOpen) return null;

  return (
    <motion.div
      drag={!isMinimized}
      dragMomentum={false}
      initial={{ y: 100, opacity: 0, x: 0 }}
      animate={{ 
        y: isMinimized ? 'calc(100vh - 100px)' : 0, 
        opacity: 1,
        height: isMinimized ? '60px' : '400px',
        width: isMinimized ? '300px' : '350px',
        scale: 1
      }}
      className={cn(
        "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[250] bg-white border-2 border-[#141414] shadow-[16px_16px_0px_0px_rgba(20,20,20,1)] flex flex-col overflow-hidden transition-all duration-300",
        isMinimized ? "rounded-full" : "rounded-none"
      )}
    >
      {/* Browser Header - Drag Handle */}
      <div 
        className="bg-[#141414] text-[#E4E3E0] p-3 flex items-center justify-between shrink-0 cursor-move" 
        onClick={isMinimized ? onMinimize : undefined}
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border border-[#E4E3E0]/20">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest">WhatsApp Web</h3>
            {!isMinimized && <p className="text-[8px] opacity-50">Assistente de Conexão</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-1 hover:bg-white/10 rounded">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-red-500 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#E4E3E0]/20">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h4 className="font-serif italic text-xl mb-2">WhatsApp Conectado</h4>
          <p className="text-[10px] opacity-60 mb-6 leading-relaxed uppercase font-bold tracking-tight">
            A janela do WhatsApp foi aberta separadamente para garantir sua segurança.
          </p>
          
          <div className="space-y-3 w-full">
            <button 
              onClick={openWhatsAppPopup}
              className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]"
            >
              <ExternalLink size={14} />
              Trazer para Frente
            </button>
            <p className="text-[8px] opacity-40 uppercase tracking-tighter">
              Dica: Mantenha a janela aberta para não perder notificações de pedidos.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[#141414]/10 w-full grid grid-cols-2 gap-2">
            <div className="text-left">
              <p className="text-[8px] font-bold opacity-30 uppercase">Status</p>
              <p className="text-[10px] font-mono text-green-600 font-bold">Ativo</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold opacity-30 uppercase">Segurança</p>
              <p className="text-[10px] font-mono">Protegido</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function WhatsAppView() {
  return (
    <div className="h-full flex flex-col bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] overflow-hidden">
      <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
        <div>
          <h2 className="font-serif italic text-2xl">WhatsApp Web</h2>
          <p className="text-[10px] uppercase tracking-widest opacity-60">Integração Direta</p>
        </div>
        <button 
          onClick={() => window.open('https://web.whatsapp.com', '_blank')}
          className="bg-[#E4E3E0] text-[#141414] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <ExternalLink size={14} />
          Abrir em Nova Aba
        </button>
      </div>
      
      <div className="flex-1 relative bg-[#E4E3E0]/30">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <MessageSquare size={40} className="text-white" />
          </div>
          <h3 className="font-serif italic text-3xl mb-4">Conecte seu WhatsApp</h3>
          <p className="max-w-md text-sm opacity-60 mb-8 leading-relaxed">
            Para garantir sua segurança e privacidade, o WhatsApp Web deve ser aberto em uma janela dedicada. 
            Clique no botão abaixo para sincronizar suas conversas e gerenciar seus pedidos.
          </p>
          <button 
            onClick={() => window.open('https://web.whatsapp.com', '_blank')}
            className="bg-[#141414] text-[#E4E3E0] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-[12px_12px_0px_0px_rgba(20,20,20,0.2)]"
          >
            Acessar WhatsApp Web Agora
          </button>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            {[
              { title: 'Pedidos', desc: 'Receba notificações de novos pedidos instantaneamente.' },
              { title: 'Atendimento', desc: 'Responda seus clientes com agilidade e precisão.' },
              { title: 'Marketing', desc: 'Envie promoções e novidades para sua base de contatos.' }
            ].map((item, i) => (
              <div key={i} className="p-6 border border-[#141414]/10 bg-white/50">
                <h4 className="font-bold text-[10px] uppercase tracking-widest mb-2">{item.title}</h4>
                <p className="text-xs opacity-50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CashierView({ orders, products, user, showToast }: { orders: Order[], products: Product[], user: any, showToast: any }) {
  const [session, setSession] = useState<CashierSession | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'sessions'>('pos');
  const [cart, setCart] = useState<{ productId: string, quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'PIX'>('CASH');
  const [blindValue, setBlindValue] = useState('');
  const [openingValue, setOpeningValue] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'cashier_sessions'),
      where('status', '==', 'OPEN'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setSession({ id: docData.id, ...docData.data() } as CashierSession);
      } else {
        setSession(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cashier_sessions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Barcode scanning logic
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      const product = products.find(p => p.barcode === searchTerm);
      if (product) {
        addToCart(product.id);
        setSearchTerm('');
        showToast(`Adicionado: ${product.name}`, "success");
      }
    }
  }, [searchTerm, products]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' && activeSubTab === 'pos') {
        e.preventDefault();
        handleFinalizeSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSubTab, cart, paymentMethod, session]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const calculateCartTotal = () => {
    return cart.reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.productId);
      return acc + (p?.price || 0) * item.quantity;
    }, 0);
  };

  const handleFinalizeSale = async () => {
    if (!session) return showToast("Abra o caixa primeiro!", "error");
    if (cart.length === 0) return showToast("Carrinho vazio!", "error");

    setFinalizing(true);
    try {
      const total = calculateCartTotal();
      const orderData = {
        type: 'TABLE', // POS sales are treated as quick table orders for now
        status: 'FINISHED',
        items: cart.map(item => {
          const p = products.find(prod => prod.id === item.productId)!;
          return {
            productId: item.productId,
            name: p.name,
            price: p.price,
            cost: p.cost || 0,
            quantity: item.quantity
          };
        }),
        payments: [{
          id: 'pay_' + Date.now(),
          amount: total,
          method: paymentMethod,
          timestamp: serverTimestamp()
        }],
        subtotal: total,
        serviceFee: 0,
        deliveryFee: 0,
        total: total,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cashierSessionId: session.id
      };

      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      showToast("Venda finalizada com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setFinalizing(false);
    }
  };

  const openOrdersTotal = orders
    .filter(o => o.status !== 'FINISHED' && o.status !== 'CANCELLED')
    .reduce((acc, o) => acc + o.total, 0);

  const handleOpenCashier = async () => {
    if (!openingValue) return;
    setIsOpening(true);
    try {
      await addDoc(collection(db, 'cashier_sessions'), {
        openedAt: serverTimestamp(),
        openedBy: user.displayName || 'Admin',
        openingBalance: parseFloat(openingValue),
        status: 'OPEN'
      });
      setOpeningValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cashier_sessions');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCloseCashier = async () => {
    if (!blindValue || !session) return;
    setIsClosing(true);
    try {
      const finishedOrdersSinceOpening = orders.filter(o => {
        if (o.status !== 'FINISHED') return false;
        const orderTime = o.updatedAt?.seconds || 0;
        const sessionTime = session.openedAt?.seconds || 0;
        return orderTime > sessionTime;
      });

      const salesTotal = finishedOrdersSinceOpening.reduce((acc, o) => acc + o.total, 0);
      const closingBalanceSystem = session.openingBalance + salesTotal;

      await updateDoc(doc(db, 'cashier_sessions', session.id), {
        status: 'CLOSED',
        closedAt: serverTimestamp(),
        closedBy: user.displayName || 'Admin',
        closingBalancePhysical: parseFloat(blindValue),
        closingBalanceSystem: closingBalanceSystem
      });
      setBlindValue('');
      showToast(`Caixa fechado com sucesso!`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cashier_sessions/${session.id}`);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="p-8 text-center opacity-50 italic">Carregando caixa...</div>;

  if (!session) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#141414] p-12 shadow-[16px_16px_0px_0px_rgba(20,20,20,1)] max-w-md w-full text-center"
        >
          <Banknote size={48} className="mx-auto mb-6 opacity-20" />
          <h2 className="font-serif italic text-3xl mb-2">Caixa Fechado</h2>
          <p className="text-sm opacity-50 mb-8">Abra uma nova sessão para começar a operar.</p>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block">Fundo de Caixa Inicial (R$)</label>
              <input 
                type="number" 
                value={openingValue}
                onChange={(e) => setOpeningValue(e.target.value)}
                placeholder="0.00"
                className="w-full border border-[#141414] p-4 font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>
            <button 
              onClick={handleOpenCashier}
              disabled={isOpening || !openingValue}
              className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 disabled:opacity-50"
            >
              {isOpening ? 'Abrindo...' : 'Abrir Caixa'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-[#141414] px-8 bg-white shrink-0">
        <button 
          onClick={() => setActiveSubTab('pos')}
          className={cn(
            "px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all",
            activeSubTab === 'pos' ? "border-[#141414] opacity-100" : "border-transparent opacity-40 hover:opacity-100"
          )}
        >
          PDV (Venda Rápida)
        </button>
        <button 
          onClick={() => setActiveSubTab('sessions')}
          className={cn(
            "px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all",
            activeSubTab === 'sessions' ? "border-[#141414] opacity-100" : "border-transparent opacity-40 hover:opacity-100"
          )}
        >
          Gestão de Sessão
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'pos' ? (
          <div className="flex h-full overflow-hidden">
            {/* Left: Product Selection */}
            <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden border-r border-[#141414]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <Barcode className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Buscar produto ou bipar código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-[#141414] pl-12 pr-12 py-4 text-sm font-bold uppercase tracking-widest focus:bg-[#141414]/5 outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products
                    .filter(p => p.available && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode === searchTerm))
                    .map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addToCart(p.id)}
                      className="bg-white border border-[#141414] p-4 text-left hover:bg-[#141414] hover:text-white transition-all group relative"
                    >
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="w-full h-20 object-cover mb-2 grayscale group-hover:grayscale-0" />
                      )}
                      <p className="text-[10px] font-bold uppercase opacity-50 group-hover:opacity-100">{p.category}</p>
                      <h4 className="font-serif italic text-lg leading-tight mb-2">{p.name}</h4>
                      <p className="font-mono font-bold text-sm">R$ {p.price.toFixed(2)}</p>
                      {p.barcode && <p className="text-[8px] opacity-30 mt-1 font-mono">{p.barcode}</p>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Cart & Finalization */}
            <div className="w-96 bg-[#141414]/5 p-8 flex flex-col gap-6 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-widest text-xs opacity-50">Carrinho PDV</h3>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setCart([])}
                      className="text-[8px] font-bold uppercase tracking-widest text-red-500 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                  <span className="bg-[#141414] text-white px-2 py-1 text-[10px] font-mono">{cart.length} itens</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-center">
                    <ShoppingCart size={48} className="mb-4" />
                    <p className="text-sm">Carrinho Vazio</p>
                  </div>
                ) : (
                  cart.map(item => {
                    const p = products.find(prod => prod.id === item.productId)!;
                    return (
                      <div key={item.productId} className="bg-white border border-[#141414] p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-bold leading-tight">{p.name}</h5>
                          <button onClick={() => removeFromCart(item.productId)} className="text-red-500"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 border border-[#141414] p-1">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100"><Minus size={10} /></button>
                            <span className="font-mono font-bold text-xs w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100"><Plus size={10} /></button>
                          </div>
                          <p className="font-mono font-bold text-xs">R$ {(p.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-6 border-t border-[#141414] space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Total da Venda</span>
                  <span className="text-3xl font-mono font-bold">R$ {calculateCartTotal().toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'CARD', 'PIX'] as const).map(m => (
                      <button 
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={cn(
                          "py-2 text-[10px] font-bold uppercase tracking-widest border border-[#141414] transition-all",
                          paymentMethod === m ? "bg-[#141414] text-white" : "hover:bg-[#141414]/5"
                        )}
                      >
                        {m === 'CASH' ? 'Dinheiro' : m === 'CARD' ? 'Cartão' : 'PIX'}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleFinalizeSale}
                  disabled={finalizing || cart.length === 0}
                  className="w-full bg-green-600 text-white py-4 font-bold uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50 shadow-[8px_8px_0px_0px_rgba(22,101,52,0.2)]"
                >
                  {finalizing ? 'Finalizando...' : 'Finalizar Venda (F12)'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8 overflow-y-auto h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white border border-[#141414] p-8 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded">Sessão Aberta</span>
                      <h3 className="text-2xl font-bold mt-2">Operador: {session.openedBy}</h3>
                      <p className="text-xs opacity-50">Início: {session.openedAt?.seconds ? new Date(session.openedAt.seconds * 1000).toLocaleString() : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Saldo Inicial</p>
                      <p className="text-xl font-mono font-bold">R$ {session.openingBalance.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#141414]/10 pt-8">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Vendas em Aberto</p>
                      <p className="text-2xl font-mono font-bold text-blue-600">R$ {openOrdersTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Total Estimado</p>
                      <p className="text-2xl font-mono font-bold">R$ {(session.openingBalance + openOrdersTotal).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#141414] p-8 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] flex flex-col">
                <h3 className="font-bold uppercase tracking-widest text-xs mb-6">Fechamento Cego</h3>
                <p className="text-xs opacity-60 mb-6">Informe o valor total em dinheiro e cartões presente no caixa físico para conferência.</p>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1 block">Valor Físico (R$)</label>
                    <input 
                      type="number"
                      value={blindValue}
                      onChange={(e) => setBlindValue(e.target.value)}
                      placeholder="0,00"
                      className="w-full border-2 border-[#141414] p-4 font-mono text-2xl focus:outline-none focus:bg-[#141414]/5"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCloseCashier}
                  disabled={isClosing || !blindValue}
                  className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest mt-8 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isClosing ? 'Processando...' : 'Fechar Caixa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BillSplitModal({ isOpen, onClose, order, showToast }: { isOpen: boolean, onClose: () => void, order: Order, showToast: any }) {
  const [splitType, setSplitType] = useState<'equal' | 'items'>('equal');
  const [people, setPeople] = useState(order.peopleCount || 1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleSplitEqual = async () => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        peopleCount: people,
        updatedAt: serverTimestamp()
      });
      showToast(`Conta dividida por ${people} pessoas`, "success");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#141414]/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-md p-8 shadow-[20px_20px_0px_0px_rgba(20,20,20,1)]"
      >
        <h3 className="font-serif italic text-3xl mb-6">Divisão de Conta</h3>
        
        <div className="flex gap-2 mb-8">
          <button 
            onClick={() => setSplitType('equal')}
            className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-2", splitType === 'equal' ? "bg-[#141414] text-white border-[#141414]" : "border-[#141414]/10")}
          >
            Por Pessoa
          </button>
          <button 
            onClick={() => setSplitType('items')}
            className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-2", splitType === 'items' ? "bg-[#141414] text-white border-[#141414]" : "border-[#141414]/10")}
          >
            Por Itens
          </button>
        </div>

        {splitType === 'equal' ? (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2 block">Número de Pessoas</label>
              <div className="flex items-center gap-4">
                <button onClick={() => setPeople(Math.max(1, people - 1))} className="w-10 h-10 border border-[#141414] flex items-center justify-center">-</button>
                <span className="text-2xl font-mono font-bold w-12 text-center">{people}</span>
                <button onClick={() => setPeople(people + 1)} className="w-10 h-10 border border-[#141414] flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="p-4 bg-[#141414]/5 border-l-4 border-[#141414]">
              <p className="text-xs opacity-60">Valor por pessoa:</p>
              <p className="text-2xl font-mono font-bold">R$ {(order.total / people).toFixed(2)}</p>
            </div>
            <button 
              onClick={handleSplitEqual}
              className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:opacity-90"
            >
              Confirmar Divisão
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs opacity-60 mb-4">Selecione os itens para pagar separadamente:</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {order.items.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    if (selectedItems.includes(idx)) {
                      setSelectedItems(selectedItems.filter(i => i !== idx));
                    } else {
                      setSelectedItems([...selectedItems, idx]);
                    }
                  }}
                  className={cn(
                    "p-3 border cursor-pointer transition-colors flex justify-between items-center",
                    selectedItems.includes(idx) ? "border-[#141414] bg-[#141414]/5" : "border-[#141414]/10"
                  )}
                >
                  <div>
                    <p className="text-xs font-bold">{item.name}</p>
                    <p className="text-[10px] opacity-50">R$ {item.price.toFixed(2)}</p>
                  </div>
                  {selectedItems.includes(idx) && <div className="w-2 h-2 bg-[#141414] rounded-full" />}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-[#141414]/10">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Total Selecionado</p>
              <p className="text-xl font-mono font-bold">R$ {selectedItems.reduce((acc, idx) => acc + order.items[idx].price, 0).toFixed(2)}</p>
            </div>
            <button className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:opacity-90">
              Pagar Selecionados
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full text-[10px] font-bold uppercase tracking-widest opacity-50 mt-4 hover:opacity-100">Fechar</button>
      </motion.div>
    </div>
  );
}
