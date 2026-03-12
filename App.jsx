import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, 
  onSnapshot, updateDoc, addDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Users, Box, FileText, DollarSign, LayoutDashboard, 
  LogOut, Menu, X, CheckCircle, Clock, AlertTriangle, 
  Plus, Home, Bell, FileSignature, Info, ChevronRight, Save, Trash2, Check
} from 'lucide-react';

// --- CONFIGURATION & INITIALIZATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'siad26-rt-digital';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // 'admin' atau 'warga'

  // Application States (Data from Firestore)
  const [inventories, setInventories] = useState([]);
  const [loans, setLoans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [letters, setLetters] = useState([]);

  // 1. Auth Lifecycle (MANDATORY RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Database Listeners (MANDATORY RULE 1 & 2)
  useEffect(() => {
    if (!user) return;

    // Helper to listen to public collections
    const syncPublicCollection = (collName, setter) => {
      const q = collection(db, 'artifacts', appId, 'public', 'data', collName);
      return onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Urutkan data berdasarkan waktu terbaru jika ada createdAt
          data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setter(data);
        }, 
        (err) => console.error(`Error syncing ${collName}:`, err)
      );
    };

    const unsubInv = syncPublicCollection('inventories', setInventories);
    const unsubLoans = syncPublicCollection('loans', setLoans);
    const unsubTrx = syncPublicCollection('transactions', setTransactions);
    const unsubLetters = syncPublicCollection('letters', setLetters);

    return () => {
      unsubInv(); unsubLoans(); unsubTrx(); unsubLetters();
    };
  }, [user]);

  // Kalkulasi Saldo Kas dari Transactions
  const balance = transactions.reduce((acc, curr) => {
    return curr.type === 'in' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  // Fungsi untuk Inisialisasi Data Awal (Jika database kosong)
  const seedInitialData = async () => {
    if (inventories.length > 0) return; // Jangan seed jika sudah ada data
    
    const invRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventories');
    await addDoc(invRef, { name: 'Kursi Lipat (Besi)', desc: 'Kursi hajatan warna hijau', total: 100, available: 100, condition: 'Baik', createdAt: Date.now() });
    await addDoc(invRef, { name: 'Tenda 4x4m', desc: 'Tenda kerucut warna putih', total: 2, available: 2, condition: 'Baik', createdAt: Date.now() });
    
    const trxRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    await addDoc(trxRef, { desc: 'Saldo Awal Tahun', amount: 15000000, type: 'in', date: new Date().toISOString().split('T')[0], createdAt: Date.now() });
    
    alert("Data sampel berhasil ditambahkan ke Cloud!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Menghubungkan ke Cloud...</p>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-blue-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-bl-full opacity-10"></div>
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-4xl font-black text-blue-700 mb-2">SIAD-26</h1>
            <p className="text-slate-500 font-medium">Sistem Informasi RT.26 Digital</p>
            {inventories.length === 0 && (
              <button onClick={seedInitialData} className="mt-4 text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200">
                + Inisialisasi Data Sampel
              </button>
            )}
          </div>
          
          <div className="space-y-4 relative z-10">
            <button 
              onClick={() => setRole('warga')}
              className="w-full bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-4 px-4 rounded-2xl flex items-center justify-between transition group shadow-sm"
            >
              <div className="flex items-center">
                <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl mr-4 group-hover:bg-emerald-200 transition"><Users size={24}/></div>
                <div className="text-left">
                  <span className="block text-lg">Warga RT.26</span>
                  <span className="block text-[10px] uppercase tracking-wider text-emerald-400">Akses Mobile View</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-emerald-300 group-hover:text-emerald-600 transition" />
            </button>
            
            <button 
              onClick={() => setRole('admin')}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-between transition shadow-md group"
            >
              <div className="flex items-center">
                <div className="bg-slate-700 text-blue-400 p-2.5 rounded-xl mr-4 group-hover:bg-slate-600 transition"><LayoutDashboard size={24}/></div>
                <div className="text-left">
                  <span className="block text-lg">Pengurus / Admin</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">Akses Dashboard Panel</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition" />
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Cloud System Online
          </div>
        </div>
      </div>
    );
  }

  // --- ROUTING ---
  const sharedProps = { 
    user, 
    onLogout: () => setRole(null), 
    db, appId, 
    data: { inventories, loans, transactions, letters, balance } 
  };

  return role === 'admin' ? <AdminPanel {...sharedProps} /> : <WargaMobileApp {...sharedProps} />;
}


// ==========================================
// ADMIN PANEL (ADMINLTE STYLE)
// ==========================================
function AdminPanel({ user, onLogout, db, appId, data }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Actions
  const handleApproveLoan = async (loan) => {
    const loanRef = doc(db, 'artifacts', appId, 'public', 'data', 'loans', loan.id);
    const invRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventories', loan.inventoryId);
    
    const invSnap = await getDoc(invRef);
    if(invSnap.exists()) {
      const currentAvailable = invSnap.data().available;
      if(currentAvailable >= loan.qty) {
        await updateDoc(invRef, { available: currentAvailable - loan.qty });
        await updateDoc(loanRef, { status: 'approved' });
      } else {
        alert("Gagal: Stok tersedia tidak mencukupi saat ini!");
      }
    }
  };

  const handleReturnLoan = async (loan) => {
    const loanRef = doc(db, 'artifacts', appId, 'public', 'data', 'loans', loan.id);
    const invRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventories', loan.inventoryId);
    
    await updateDoc(loanRef, { status: 'returned', returnDate: new Date().toLocaleDateString('id-ID') });
    
    const invSnap = await getDoc(invRef);
    if(invSnap.exists()) {
      await updateDoc(invRef, { available: invSnap.data().available + loan.qty });
    }
  };

  const handleApproveLetter = async (letter) => {
    const letterRef = doc(db, 'artifacts', appId, 'public', 'data', 'letters', letter.id);
    const noSurat = `0${data.letters.length + 1}/RT.26/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    await updateDoc(letterRef, { status: 'approved', noSurat: noSurat });
  };

  const pendingLoans = data.loans.filter(l => l.status === 'pending').length;
  const pendingLetters = data.letters.filter(l => l.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-hidden">
      {/* Sidebar AdminLTE Style */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <span className="text-xl font-black text-white flex items-center tracking-tight">
            <Box className="mr-2 text-blue-500"/> SIAD-26
          </span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">AD</div>
          <div>
            <div className="font-bold text-white text-sm">Bpk. Ahmad</div>
            <div className="text-[10px] text-emerald-400 flex items-center font-medium"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> Ketua RT</div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-3">Menu Utama</div>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
            { id: 'inv', label: 'Inventaris & Pinjam', icon: Box, badge: pendingLoans },
            { id: 'surat', label: 'E-Surat', icon: FileText, badge: pendingLetters },
            { id: 'keuangan', label: 'Keuangan', icon: DollarSign, badge: 0 },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if(window.innerWidth < 768) setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon className="w-5 h-5 mr-3 opacity-80" />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold py-0.5 px-2 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 z-10 lg:px-6">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-slate-700 mr-2"><Menu size={24}/></button>
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block">Panel Pengurus RT</h2>
          </div>
          <button onClick={onLogout} className="flex items-center text-sm font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition">
            <LogOut size={16} className="mr-2" /> Logout
          </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-100">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* AdminLTE Small Boxes */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Saldo Kas RT</p>
                    <h3 className="text-2xl font-black">Rp {(data.balance/1000000).toFixed(1)} Jt</h3>
                  </div>
                  <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-700 opacity-30" />
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Total Aset</p>
                    <h3 className="text-3xl font-black">{data.inventories.length}</h3>
                  </div>
                  <Box className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-700 opacity-30" />
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Pending Pinjam</p>
                    <h3 className="text-3xl font-black">{pendingLoans}</h3>
                  </div>
                  <AlertTriangle className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-700 opacity-30" />
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-purple-100 text-xs font-bold uppercase tracking-wider mb-1">Pengajuan Surat</p>
                    <h3 className="text-3xl font-black">{pendingLetters}</h3>
                  </div>
                  <FileText className="absolute -right-4 -bottom-4 w-24 h-24 text-purple-700 opacity-30" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card Transaksi Terakhir */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Transaksi Kas Terakhir</h3>
                  </div>
                  <div className="p-0">
                    {data.transactions.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-500">Belum ada transaksi</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {data.transactions.slice(0, 5).map(trx => (
                          <li key={trx.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{trx.desc}</p>
                              <p className="text-[10px] text-slate-400">{trx.date}</p>
                            </div>
                            <span className={`text-sm font-black ${trx.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {trx.type === 'in' ? '+' : '-'} Rp {trx.amount.toLocaleString('id-ID')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Card Status Inventaris */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Ketersediaan Aset</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    {data.inventories.map(inv => {
                      const percent = Math.round((inv.available / inv.total) * 100);
                      return (
                        <div key={inv.id}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-bold text-slate-700">{inv.name}</span>
                            <span className="text-slate-500 font-medium">{inv.available} / {inv.total} Unit</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${percent === 0 ? 'bg-red-500' : percent < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INVENTARIS TAB */}
          {activeTab === 'inv' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Approval Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-amber-500" size={18}/> Menunggu Persetujuan & Log Peminjaman</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-200">
                        <th className="p-4">Tgl</th>
                        <th className="p-4">Peminjam</th>
                        <th className="p-4">Barang</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.loans.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">Tidak ada data peminjaman</td></tr>
                      ) : data.loans.map(loan => {
                        const inv = data.inventories.find(i => i.id === loan.inventoryId);
                        return (
                          <tr key={loan.id} className="text-sm hover:bg-slate-50 transition">
                            <td className="p-4 text-slate-500 whitespace-nowrap">{loan.date}</td>
                            <td className="p-4 font-bold text-slate-800">{loan.userName}</td>
                            <td className="p-4 text-slate-600">{inv?.name || 'Barang Dihapus'}</td>
                            <td className="p-4 text-center font-black text-blue-600">{loan.qty}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block
                                ${loan.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                  loan.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {loan.status === 'pending' ? 'Menunggu' : loan.status === 'approved' ? 'Dipinjam' : 'Dikembalikan'}
                              </span>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              {loan.status === 'pending' && (
                                <button onClick={() => handleApproveLoan(loan)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                                  Setujui Pinjam
                                </button>
                              )}
                              {loan.status === 'approved' && (
                                <button onClick={() => handleReturnLoan(loan)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm flex items-center ml-auto">
                                  <Check size={14} className="mr-1"/> Tandai Kembali
                                </button>
                              )}
                              {loan.status === 'returned' && (
                                <span className="text-xs text-slate-400 font-medium">Selesai ({loan.returnDate})</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master Aset */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Master Data Aset RT</h3>
                    <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition flex items-center shadow-md">
                      <Plus size={16} className="mr-1"/> Tambah Aset Baru
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                    {data.inventories.map(inv => (
                      <div key={inv.id} className="border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h4 className="font-black text-lg text-slate-800">{inv.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 mb-4">{inv.desc}</p>
                        
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Kondisi</p>
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{inv.condition}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Stok Tersedia</p>
                            <span className="text-3xl font-black text-blue-600">{inv.available}<span className="text-sm text-slate-400 font-medium ml-1">/ {inv.total}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {/* SURAT TAB */}
          {activeTab === 'surat' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
              <div className="p-5 border-b border-slate-100 bg-purple-50">
                <h3 className="font-bold text-purple-900 flex items-center"><FileSignature className="mr-2 text-purple-600" size={18}/> Approval E-Surat Pengantar</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-200">
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Pemohon</th>
                    <th className="p-4">Jenis Surat</th>
                    <th className="p-4">Status / No. Surat</th>
                    <th className="p-4 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.letters.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">Belum ada permohonan surat</td></tr>
                  ) : data.letters.map(letter => (
                    <tr key={letter.id} className="text-sm">
                      <td className="p-4 text-slate-500">{letter.date}</td>
                      <td className="p-4 font-bold text-slate-800">{letter.userName}</td>
                      <td className="p-4 font-medium text-slate-600">{letter.type}</td>
                      <td className="p-4">
                        {letter.status === 'pending' ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">Perlu Tinjauan</span>
                        ) : (
                          <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-1 rounded border border-emerald-200">{letter.noSurat}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {letter.status === 'pending' && (
                          <button onClick={() => handleApproveLetter(letter)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                            Generate & Approve
                          </button>
                        )}
                        {letter.status === 'approved' && (
                          <button className="text-blue-600 hover:text-blue-800 text-xs font-bold underline">Cetak / Unduh PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* KEUANGAN TAB */}
          {activeTab === 'keuangan' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                <p className="text-slate-500 uppercase tracking-widest font-black text-sm mb-2">Total Saldo Kas RT.26 Saat Ini</p>
                <h1 className="text-5xl font-black text-emerald-600">Rp {data.balance.toLocaleString('id-ID')}</h1>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Buku Kas Digital (Mutasi)</h3>
                  <div className="flex gap-2">
                    <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center"><Plus size={14} className="mr-1"/> Pemasukan</button>
                    <button className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 flex items-center"><Plus size={14} className="mr-1"/> Pengeluaran</button>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white text-[10px] uppercase tracking-wider text-slate-400 font-black border-b border-slate-100">
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Keterangan</th>
                      <th className="p-4 text-right">Debet (Masuk)</th>
                      <th className="p-4 text-right">Kredit (Keluar)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.transactions.map(trx => (
                      <tr key={trx.id} className="text-sm hover:bg-slate-50">
                        <td className="p-4 text-slate-500">{trx.date}</td>
                        <td className="p-4 font-bold text-slate-700">{trx.desc}</td>
                        <td className="p-4 text-right font-black text-emerald-600">{trx.type === 'in' ? `Rp ${trx.amount.toLocaleString('id-ID')}` : '-'}</td>
                        <td className="p-4 text-right font-black text-red-500">{trx.type === 'out' ? `Rp ${trx.amount.toLocaleString('id-ID')}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ==========================================
// WARGA MOBILE APP (PWA STYLE)
// ==========================================
function WargaMobileApp({ user, onLogout, db, appId, data }) {
  const [activeTab, setActiveTab] = useState('home');
  const [showLoanModal, setShowLoanModal] = useState(null);
  const [loanQty, setLoanQty] = useState(1);
  const [letterType, setLetterType] = useState('');

  // Form Submissions to Cloud
  const handleApplyLoan = async () => {
    if (loanQty > showLoanModal.available) return alert("Jumlah melebihi stok tersedia!");
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'loans'), {
      userId: user.uid,
      userName: "Budi Santoso (Warga)", // Mock Profile Name
      inventoryId: showLoanModal.id,
      qty: parseInt(loanQty),
      status: 'pending',
      date: new Date().toLocaleDateString('id-ID'),
      createdAt: Date.now()
    });
    
    setShowLoanModal(null);
    setLoanQty(1);
    alert("Berhasil! Menunggu persetujuan Pengurus RT.");
  };

  const handleApplyLetter = async () => {
    if (!letterType) return alert("Pilih jenis surat!");
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'letters'), {
      userId: user.uid,
      userName: "Budi Santoso (Warga)", // Mock Profile Name
      type: letterType,
      status: 'pending',
      date: new Date().toLocaleDateString('id-ID'),
      createdAt: Date.now()
    });
    
    setLetterType('');
    alert("Permohonan surat berhasil dikirim!");
  };

  // Filter My Data
  const myLoans = data.loans.filter(l => l.userId === user.uid);
  const myLetters = data.letters.filter(l => l.userId === user.uid);

  return (
    <div className="bg-slate-100 min-h-screen pb-24 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      {/* PWA Header */}
      <header className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-5 rounded-b-[2rem] shadow-xl relative z-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-blue-200 text-xs font-medium">Sistem Informasi Warga</p>
            <h1 className="text-xl font-black tracking-tight">SIAD-26</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-sm transition">
            <LogOut size={18} className="text-white"/>
          </button>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">B</div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Halo, Budi S.</h2>
            <p className="text-blue-200 text-xs font-medium flex items-center"><Home size={10} className="mr-1"/> Blok A No. 12</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 -mt-4 relative z-10 space-y-6">
        
        {/* TAB: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Keuangan Widget */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transparansi Saldo Kas</span>
                <Info size={16} className="text-slate-300" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Rp {data.balance.toLocaleString('id-ID')}</h3>
              
              <div className="mt-5 bg-emerald-50 rounded-2xl p-3 flex items-center justify-between border border-emerald-100">
                <div className="flex items-center">
                  <div className="bg-emerald-500 rounded-full p-1.5 mr-3 text-white"><CheckCircle size={14}/></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Iuran Bulan Ini</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Lunas (Maret 2026)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agenda Widget */}
            <div>
              <h4 className="font-black text-slate-800 text-sm mb-3 px-1 flex items-center">
                <Clock size={16} className="mr-2 text-blue-600"/> Agenda Terdekat
              </h4>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center">
                  <div className="bg-red-50 text-red-600 rounded-xl p-2 text-center w-14 mr-4 border border-red-100">
                    <span className="block text-[10px] font-black uppercase">Mar</span>
                    <span className="block text-xl font-black leading-none">15</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">Kerja Bakti Masal</h5>
                    <p className="text-xs text-slate-500 mt-0.5">07:00 WIB - Lapangan RT</p>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-100"></div>
                <div className="flex items-center">
                  <div className="bg-blue-50 text-blue-600 rounded-xl p-2 text-center w-14 mr-4 border border-blue-100">
                    <span className="block text-[10px] font-black uppercase">Mar</span>
                    <span className="block text-xl font-black leading-none">28</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">Arisan Ibu-Ibu PKK</h5>
                    <p className="text-xs text-slate-500 mt-0.5">16:00 WIB - Rumah Bu RT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INVENTARIS */}
        {activeTab === 'inv' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 mt-4">
            
            {/* My Loans */}
            {myLoans.length > 0 && (
              <div>
                <h4 className="font-black text-slate-800 text-sm mb-2 px-1">Riwayat Peminjaman Saya</h4>
                <div className="space-y-2">
                  {myLoans.map(loan => {
                    const item = data.inventories.find(i => i.id === loan.inventoryId);
                    return (
                      <div key={loan.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-sm text-slate-800">{item?.name || 'Barang'} <span className="text-blue-600 font-black">(x{loan.qty})</span></h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">{loan.date}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${loan.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            loan.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {loan.status === 'pending' ? 'Menunggu' : loan.status === 'approved' ? 'Dipinjam' : 'Selesai'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Item List */}
            <div>
              <h4 className="font-black text-slate-800 text-sm mb-3 px-1">Pinjam Aset RT</h4>
              <div className="grid grid-cols-1 gap-3">
                {data.inventories.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-bold text-slate-800">{item.name}</h5>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-center">
                        <span className="block text-lg font-black leading-none">{item.available}</span>
                        <span className="block text-[8px] uppercase font-bold mt-1">Tersedia</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowLoanModal(item)}
                      disabled={item.available === 0}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm
                        ${item.available > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {item.available > 0 ? 'Ajukan Pinjam' : 'Stok Habis'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SURAT */}
        {activeTab === 'surat' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 mt-4">
             {/* Form Pengajuan */}
             <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="font-black text-slate-800 text-base mb-1">E-Surat Pengantar</h4>
                <p className="text-xs text-slate-500 mb-5">Ajukan surat pengantar mandiri tanpa perlu ke rumah RT.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Pilih Jenis Surat</label>
                    <select 
                      value={letterType} onChange={e => setLetterType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 outline-none font-medium"
                    >
                      <option value="">-- Sentuh untuk memilih --</option>
                      <option value="Surat Pengantar Domisili">Pengantar Domisili</option>
                      <option value="Surat Keterangan Usaha (SKU)">Surat Keterangan Usaha (SKU)</option>
                      <option value="Surat Keterangan Tidak Mampu">Surat Keterangan Tidak Mampu</option>
                      <option value="Surat Pengantar Kematian">Surat Pengantar Kematian</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleApplyLetter}
                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                  >
                    Kirim Permohonan
                  </button>
                </div>
             </div>

             {/* Riwayat Surat */}
             {myLetters.length > 0 && (
               <div>
                  <h4 className="font-black text-slate-800 text-sm mb-3 px-1">Status Permohonan Surat</h4>
                  <div className="space-y-3">
                    {myLetters.map(letter => (
                      <div key={letter.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        {letter.status === 'approved' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-sm text-slate-800">{letter.type}</h5>
                            <p className="text-[10px] text-slate-400 mt-1">{letter.date}</p>
                            {letter.status === 'approved' && (
                              <div className="mt-2 bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block">
                                <span className="text-[10px] text-slate-500 block">Nomor Surat:</span>
                                <span className="text-xs font-black text-slate-800">{letter.noSurat}</span>
                              </div>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                            ${letter.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {letter.status === 'pending' ? 'Diproses' : 'Selesai'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             )}
           </div>
        )}
      </main>

      {/* Floating Modal for Loan */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-black text-slate-800 mb-1">Pinjam {showLoanModal.name}</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">Harap kembalikan barang dalam kondisi semula.</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Jumlah Unit (Maks: {showLoanModal.available})</label>
              <div className="flex items-center">
                <button 
                  onClick={() => setLoanQty(Math.max(1, loanQty - 1))}
                  className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-bold text-xl flex items-center justify-center active:scale-95"
                >-</button>
                <input 
                  type="number" 
                  className="flex-1 bg-transparent text-center text-2xl font-black text-slate-800 outline-none"
                  value={loanQty}
                  onChange={(e) => setLoanQty(e.target.value)}
                  readOnly
                />
                <button 
                  onClick={() => setLoanQty(Math.min(showLoanModal.available, loanQty + 1))}
                  className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-bold text-xl flex items-center justify-center active:scale-95"
                >+</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowLoanModal(null)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 active:bg-slate-200 transition">Batal</button>
              <button onClick={handleApplyLoan} className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-200 active:scale-95 transition">Konfirmasi Pinjam</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation PWA Style */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-40 pb-safe">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Home size={22} className={`mb-1 transition-transform ${activeTab === 'home' ? 'scale-110' : ''}`} />
          <span className="text-[9px] font-bold">Beranda</span>
        </button>
        <button onClick={() => setActiveTab('inv')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'inv' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Box size={22} className={`mb-1 transition-transform ${activeTab === 'inv' ? 'scale-110' : ''}`} />
          <span className="text-[9px] font-bold">Inventaris</span>
        </button>
        <button onClick={() => setActiveTab('surat')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'surat' ? 'text-blue-600' : 'text-slate-400'}`}>
          <FileSignature size={22} className={`mb-1 transition-transform ${activeTab === 'surat' ? 'scale-110' : ''}`} />
          <span className="text-[9px] font-bold">E-Surat</span>
        </button>
      </nav>
    </div>
  );
}