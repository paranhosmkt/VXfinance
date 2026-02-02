
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  PlusCircle, 
  FileText, 
  BarChart3, 
  PieChart,
  X,
  Menu,
  Download,
  Upload,
  Trash2,
  Database,
  Users,
  Briefcase,
  Plus,
  History,
  ChevronRight,
  Calendar,
  Pencil,
  FileDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Transaction, TransactionType, CategoryGroup, Client, Project } from './types';
import { INITIAL_TRANSACTIONS, CATEGORIES as DEFAULT_CATEGORIES } from './constants';

const App: React.FC = () => {
  // State from LocalStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vx-transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('vx-clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('vx-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('vx-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [view, setView] = useState<'dashboard' | 'transactions' | 'reports' | 'clients' | 'projects' | 'history'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [selectedMonthDRE, setSelectedMonthDRE] = useState<string>('all');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const dreRef = useRef<HTMLDivElement>(null);

  // Form States
  const [newTx, setNewTx] = useState({
    description: '',
    amount: '', 
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    category: '',
    clientId: '',
    projectId: ''
  });

  // Initialize first category if not set
  useEffect(() => {
    if (!newTx.category && categories.length > 0) {
      setNewTx(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const [newClientName, setNewClientName] = useState('');
  const [newProject, setNewProject] = useState({ name: '', clientId: '' });
  const [newCat, setNewCat] = useState({ name: '', group: CategoryGroup.OPERATING_EXPENSE });

  // Persistance
  useEffect(() => {
    localStorage.setItem('vx-transactions', JSON.stringify(transactions));
    localStorage.setItem('vx-clients', JSON.stringify(clients));
    localStorage.setItem('vx-projects', JSON.stringify(projects));
    localStorage.setItem('vx-categories', JSON.stringify(categories));
  }, [transactions, clients, projects, categories]);

  // Aggregated Monthly Data
  const monthlyData = useMemo(() => {
    const groups = transactions.reduce((acc: any, curr) => {
      const month = curr.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = { month, income: 0, expense: 0, count: 0 };
      if (curr.type === TransactionType.INCOME) acc[month].income += curr.amount;
      else acc[month].expense += curr.amount;
      acc[month].count += 1;
      return acc;
    }, {});
    return Object.values(groups).sort((a: any, b: any) => b.month.localeCompare(a.month)) as any[];
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [transactions]);

  // DRE Calculations (Filtered)
  const dreTotals = useMemo(() => {
    const filtered = selectedMonthDRE === 'all' 
      ? transactions 
      : transactions.filter(t => t.date.startsWith(selectedMonthDRE));

    const income = filtered
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const expenses = filtered
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const cogs = filtered
      .filter(t => t.group === CategoryGroup.COGS)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const operating = filtered
      .filter(t => t.group === CategoryGroup.OPERATING_EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const financial = filtered
      .filter(t => t.group === CategoryGroup.FINANCIAL)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { income, expenses, cogs, operating, financial, balance: income - expenses };
  }, [transactions, selectedMonthDRE]);

  const parseCurrencyString = (val: string): number => {
    const cleanValue = val.replace(/\D/g, "");
    if (!cleanValue) return 0;
    return parseFloat(cleanValue) / 100;
  };

  const maskCurrency = (value: string | number, forceType?: TransactionType) => {
    const cleanValue = String(value).replace(/\D/g, "");
    if (!cleanValue) return '';
    const options = { style: 'currency', currency: 'BRL' };
    const formatted = new Intl.NumberFormat('pt-BR', options).format(parseFloat(cleanValue) / 100);
    const type = forceType || newTx.type;
    return type === TransactionType.EXPENSE ? `-${formatted}` : formatted;
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setNewTx({
      description: tx.description,
      amount: maskCurrency(Math.round(tx.amount * 100), tx.type),
      type: tx.type,
      date: tx.date,
      category: tx.category,
      clientId: tx.clientId || '',
      projectId: tx.projectId || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingTxId(null);
    setNewTx({ 
      description: '', 
      amount: '', 
      type: TransactionType.EXPENSE, 
      date: new Date().toISOString().split('T')[0], 
      category: categories[0]?.name || '', 
      clientId: '', 
      projectId: '' 
    });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseCurrencyString(newTx.amount);
    if (amountValue === 0) return;

    const cat = categories.find((c: any) => c.name === newTx.category);
    
    if (editingTxId) {
      setTransactions(transactions.map(t => t.id === editingTxId ? {
        ...t,
        description: newTx.description,
        amount: amountValue,
        date: newTx.date,
        type: newTx.type,
        category: newTx.category,
        group: cat?.group || CategoryGroup.OPERATING_EXPENSE,
        clientId: newTx.clientId || undefined,
        projectId: newTx.projectId || undefined
      } : t));
    } else {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        description: newTx.description,
        amount: amountValue,
        date: newTx.date,
        type: newTx.type,
        category: newTx.category,
        group: cat?.group || CategoryGroup.OPERATING_EXPENSE,
        clientId: newTx.clientId || undefined,
        projectId: newTx.projectId || undefined
      };
      setTransactions([transaction, ...transactions]);
    }
    
    resetForm();
  };

  const handleDownloadPDF = async () => {
    if (!dreRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(dreRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      const filename = `DRE_VX_Finance_${selectedMonthDRE === 'all' ? 'Consolidado' : selectedMonthDRE}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;
    const exists = categories.find((c: any) => c.name.toLowerCase() === newCat.name.toLowerCase());
    if (exists) {
      alert("Esta categoria já existe.");
      return;
    }
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    setNewTx(prev => ({ ...prev, category: newCat.name }));
    setNewCat({ name: '', group: CategoryGroup.OPERATING_EXPENSE });
    setShowAddCategoryModal(false);
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    const client: Client = { id: crypto.randomUUID(), name: newClientName };
    setClients([...clients, client]);
    setNewClientName('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientId) return;
    const proj: Project = { id: crypto.randomUUID(), name: newProject.name, clientId: newProject.clientId };
    setProjects([...projects, proj]);
    setNewProject({ name: '', clientId: '' });
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm("Deseja realmente excluir este lançamento?")) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const clearAllData = () => {
    if (window.confirm("ATENÇÃO: Isso apagará permanentemente todos os seus dados do navegador. Deseja continuar?")) {
      setTransactions([]);
      setClients([]);
      setProjects([]);
      setCategories(DEFAULT_CATEGORIES);
      localStorage.clear();
    }
  };

  const exportData = () => {
    const data = { transactions, clients, projects, categories };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `vx-finance-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error("O arquivo não parece ser um backup válido da VX Finance.");
        }

        if (window.confirm("Atenção: A importação substituirá todos os dados atuais. Deseja prosseguir?")) {
          setTransactions(data.transactions);
          setClients(data.clients || []);
          setProjects(data.projects || []);
          setCategories(data.categories || DEFAULT_CATEGORIES);
          alert("Backup restaurado com sucesso!");
        }
      } catch (err) {
        alert("Erro ao importar dados: " + (err instanceof Error ? err.message : "Arquivo corrompido ou inválido."));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const categoryPieData = useMemo(() => {
    const cats = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc: any, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm z-50`}>
        <div className="p-6 flex items-center gap-4">
          <div className="relative w-14 h-14 flex flex-col items-center justify-center flex-shrink-0 group transition-transform hover:scale-105 cursor-pointer">
            <div className="absolute inset-0 border-[3px] border-[#ee5a07] rounded-full border-t-transparent -rotate-45 group-hover:rotate-45 transition-transform duration-700"></div>
            <div className="absolute inset-0 border-[3px] border-[#ee5a07]/10 rounded-full"></div>
            
            <div className="z-10 flex flex-col items-center leading-[0.8] mt-1">
              <span className="text-xl font-black text-[#ee5a07] tracking-tighter">VX</span>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em] -mt-1 scale-90">Virtual</span>
            </div>
          </div>
          {isSidebarOpen && <span className="font-black text-2xl text-slate-800 tracking-tighter whitespace-nowrap">Finance</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" collapsed={!isSidebarOpen} />
          <NavItem active={view === 'transactions'} onClick={() => setView('transactions')} icon={<BarChart3 size={20} />} label="Transações" collapsed={!isSidebarOpen} />
          <NavItem active={view === 'clients'} onClick={() => setView('clients')} icon={<Users size={20} />} label="Clientes" collapsed={!isSidebarOpen} />
          <NavItem active={view === 'projects'} onClick={() => setView('projects')} icon={<Briefcase size={20} />} label="Projetos" collapsed={!isSidebarOpen} />
          <NavItem active={view === 'reports'} onClick={() => setView('reports')} icon={<FileText size={20} />} label="DRE" collapsed={!isSidebarOpen} />
          <NavItem active={view === 'history'} onClick={() => setView('history')} icon={<History size={20} />} label="Histórico" collapsed={!isSidebarOpen} />
        </nav>

        <div className="p-4 space-y-2 border-t border-slate-100">
          {isSidebarOpen && (
            <div className="px-4 py-2 bg-emerald-50 rounded-lg flex items-center gap-2 mb-2">
              <Database size={14} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">Armazenamento Local</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportData} title="Exportar Backup" className="flex items-center justify-center gap-3 px-2 py-2.5 text-slate-500 hover:text-[#ee5a07] hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
              <Download size={18} />
              {isSidebarOpen && <span className="text-sm font-medium">Exportar</span>}
            </button>
            <div className="relative">
              <input type="file" id="import-file" className="hidden" accept=".json" onChange={handleImportData} />
              <label htmlFor="import-file" title="Importar Backup" className="flex items-center justify-center gap-3 px-2 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer">
                <Upload size={18} />
                {isSidebarOpen && <span className="text-sm font-medium">Importar</span>}
              </label>
            </div>
          </div>

          <button onClick={clearAllData} title="Limpar Tudo" className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
            <Trash2 size={18} />
            {isSidebarOpen && <span className="text-sm font-medium">Limpar Tudo</span>}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-[#ee5a07] hover:bg-[#ee5a07]/5 rounded-lg transition-colors mt-2">
            <Menu size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight capitalize">
              {view === 'dashboard' && 'Visão Geral'}
              {view === 'history' && 'Histórico Mensal'}
              {view === 'transactions' && 'Lançamentos'}
              {view === 'clients' && 'Gestão de Clientes'}
              {view === 'projects' && 'Gestão de Projetos'}
              {view === 'reports' && 'DRE Simplificada'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">VX Virtual Finance - {view === 'reports' && selectedMonthDRE !== 'all' ? `Análise de ${formatMonth(selectedMonthDRE)}` : 'Consolidado Local'}</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-[#ee5a07] hover:bg-[#d44d06] text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-[#ee5a07]/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <PlusCircle size={20} />
            Novo Lançamento
          </button>
        </header>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Entradas" value={formatCurrency(totals.income)} icon={<ArrowUpCircle className="text-emerald-500" />} color="bg-emerald-50" />
              <StatCard title="Saídas" value={formatCurrency(totals.expenses)} icon={<ArrowDownCircle className="text-rose-500" />} color="bg-rose-50" />
              <StatCard title="Saldo em Caixa" value={formatCurrency(totals.balance)} icon={<PieChart className="text-[#ee5a07]" />} color="bg-[#ee5a07]/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                  Fluxo Mensal
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Geral</span>
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...monthlyData].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => formatCurrency(val)} />
                      <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Receita" />
                      <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Despesa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                  Gastos por Categoria
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pizza</span>
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie 
                        data={categoryPieData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        {categoryPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#ee5a07', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {monthlyData.length > 0 ? monthlyData.map((data) => (
              <div key={data.month} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-black text-slate-800 text-xl capitalize leading-none mb-1">{formatMonth(data.month)}</h4>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.count} lançamentos</span>
                    </div>
                    <div className="bg-[#ee5a07]/5 p-2.5 rounded-2xl text-[#ee5a07]">
                       <Calendar size={20} />
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Entradas</span>
                      <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(data.income)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Saídas</span>
                      <span className="font-bold text-rose-500 tabular-nums">{formatCurrency(data.expense)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-300 uppercase block mb-0.5">Resultado Líquido</span>
                    <span className={`text-xl font-black tabular-nums ${data.income - data.expense >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(data.income - data.expense)}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setSelectedMonthDRE(data.month); setView('reports'); }}
                    className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:bg-[#ee5a07] hover:text-white transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-32 text-center text-slate-400 font-bold">Nenhum histórico disponível.</div>
            )}
          </div>
        )}

        {/* Transactions Table View */}
        {view === 'transactions' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-800 text-lg">Histórico Financeiro</h3>
               <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest">{transactions.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Atribuição</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-5 text-sm text-slate-500 tabular-nums">{tx.date}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-800">{tx.description}</td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-500 group-hover:bg-[#ee5a07]/10 group-hover:text-[#ee5a07] transition-colors">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        <div className="flex flex-col">
                           <span className="font-medium">{tx.clientId ? clients.find(c => c.id === tx.clientId)?.name : '-'}</span>
                           {tx.projectId && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Proj: {projects.find(p => p.id === tx.projectId)?.name}</span>}
                        </div>
                      </td>
                      <td className={`px-6 py-5 text-sm font-black text-right tabular-nums ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenEdit(tx)} title="Editar" className="text-slate-300 hover:text-[#ee5a07] transition-all p-2 hover:bg-[#ee5a07]/5 rounded-xl">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => deleteTransaction(tx.id)} title="Excluir" className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-xl">
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports View (DRE) */}
        {view === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto flex justify-between items-center gap-4 flex-wrap">
               <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtro de Competência</span>
                  <select 
                    value={selectedMonthDRE} 
                    onChange={(e) => setSelectedMonthDRE(e.target.value)}
                    className="bg-transparent font-black text-slate-800 text-sm outline-none cursor-pointer"
                  >
                    <option value="all">Consolidado Geral</option>
                    {[...monthlyData].reverse().map(d => (
                      <option key={d.month} value={d.month}>{formatMonth(d.month)}</option>
                    ))}
                  </select>
               </div>
               
               <button 
                 onClick={handleDownloadPDF}
                 disabled={isExporting}
                 className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
               >
                 {isExporting ? <span className="animate-pulse">Gerando...</span> : <><FileDown size={18} /> Baixar PDF</>}
               </button>
            </div>

            <div ref={dreRef} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-4xl mx-auto relative overflow-hidden pdf-export-container">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <FileText size={120} className="text-[#ee5a07]" />
              </div>

              <div className="flex justify-between items-end mb-12 border-b-2 border-slate-50 pb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Demonstrativo de Resultados</h2>
                  <p className="text-slate-400 font-bold tracking-widest text-[10px] mt-1">VX VIRTUAL TECHNOLOGY SOLUTIONS</p>
                </div>
                <div className="text-right">
                   <div className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full mb-2 tracking-widest uppercase">
                     {selectedMonthDRE === 'all' ? 'Relatório Consolidado' : formatMonth(selectedMonthDRE)}
                   </div>
                   <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Base de Dados Local</div>
                </div>
              </div>
              
              <div className="space-y-2 relative z-10">
                <DRELine label="(+) RECEITA BRUTA" value={dreTotals.income} bold highlight />
                <DRELine label="(-) IMPOSTOS (Estimativa 6%)" value={dreTotals.income * 0.06} isNegative />
                <div className="h-px bg-slate-100 my-4" />
                <DRELine label="(=) RECEITA LÍQUIDA" value={dreTotals.income * 0.94} bold />
                <DRELine label="(-) CUSTOS DE VENDA (CPV/CSP)" value={dreTotals.cogs} isNegative />
                <div className="h-px bg-slate-100 my-4" />
                <DRELine label="(=) LUCRO BRUTO" value={(dreTotals.income * 0.94) - dreTotals.cogs} bold />
                <DRELine label="(-) DESPESAS OPERACIONAIS" value={dreTotals.operating} isNegative />
                <DRELine label="(+/-) RESULTADO FINANCEIRO" value={dreTotals.financial} />
                <div className="pt-12">
                  <div className={`p-8 rounded-[2rem] border-2 flex justify-between items-center transition-all ${dreTotals.balance >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Lucro / Prejuízo Líquido</span>
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">Resultado do Exercício</span>
                    </div>
                    <div className="text-right">
                       <span className={`text-5xl font-black tabular-nums tracking-tighter ${dreTotals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {formatCurrency(dreTotals.balance)}
                       </span>
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                         Margem Líquida: {dreTotals.income > 0 ? ((dreTotals.balance / dreTotals.income) * 100).toFixed(1) : 0}%
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients View */}
        {view === 'clients' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-500">
             <div className="lg:col-span-1">
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
                 <h3 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
                   <Users size={24} className="text-[#ee5a07]" /> Novo Cliente
                 </h3>
                 <form onSubmit={handleAddClient} className="space-y-6">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Cliente / Empresa</label>
                     <input required type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-[#ee5a07]/10 outline-none transition-all" placeholder="Ex: Google Inc" />
                   </div>
                   <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-lg">
                     Cadastrar Cliente
                   </button>
                 </form>
               </div>
             </div>
             <div className="lg:col-span-2">
               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 font-black text-slate-400 text-xs uppercase tracking-widest flex justify-between">
                   Lista de Parceiros
                   <span className="text-[#ee5a07]">{clients.length} ativos</span>
                 </div>
                 <div className="divide-y divide-slate-100">
                   {clients.map(client => (
                     <div key={client.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-all group">
                       <div>
                         <div className="font-black text-slate-800 text-lg group-hover:text-[#ee5a07] transition-colors">{client.name}</div>
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{projects.filter(p => p.clientId === client.id).length} Projetos Vinculados</div>
                       </div>
                       <button onClick={() => setClients(clients.filter(c => c.id !== client.id))} className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-xl">
                         <X size={20} />
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* Projects View */}
        {view === 'projects' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-8 duration-500">
             <div className="lg:col-span-1">
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
                 <h3 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
                   <Briefcase size={24} className="text-[#ee5a07]" /> Novo Projeto
                 </h3>
                 <form onSubmit={handleAddProject} className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Projeto</label>
                     <input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-[#ee5a07]/10 outline-none transition-all" placeholder="Ex: Redesign Website" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente Responsável</label>
                     <select required value={newProject.clientId} onChange={e => setNewProject({...newProject, clientId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-[#ee5a07]/10 outline-none transition-all">
                       <option value="">Selecione um cliente...</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   <button type="submit" className="w-full bg-[#ee5a07] text-white font-black py-4 rounded-2xl hover:bg-[#d44d06] transition-all shadow-lg shadow-[#ee5a07]/20">
                     Criar Projeto
                   </button>
                 </form>
               </div>
             </div>
             <div className="lg:col-span-2">
               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 font-black text-slate-400 text-xs uppercase tracking-widest">
                   Carteira de Projetos
                 </div>
                 <div className="divide-y divide-slate-100">
                   {projects.map(project => (
                     <div key={project.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-all group">
                       <div>
                         <div className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{project.name}</div>
                         <div className="flex items-center gap-2 mt-1">
                            <Users size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-tight">{clients.find(c => c.id === project.clientId)?.name || 'Cliente Removido'}</span>
                         </div>
                       </div>
                       <button onClick={() => setProjects(projects.filter(p => p.id !== project.id))} className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-xl">
                         <X size={20} />
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
        )}
      </main>

      {/* Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingTxId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editingTxId ? 'Alterar registro existente' : 'Registrar nova movimentação'}</p>
              </div>
              <button onClick={resetForm} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition-all hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição da Operação</label>
                  <input autoFocus required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none focus:border-[#ee5a07] focus:ring-4 focus:ring-[#ee5a07]/5 transition-all" placeholder="Ex: Recebimento Projeto Alpha" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Operação</label>
                  <select value={newTx.type} onChange={e => {
                    const newType = e.target.value as TransactionType;
                    setNewTx({...newTx, type: newType, amount: maskCurrency(newTx.amount, newType)});
                  }} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black outline-none transition-all ${newTx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <option value={TransactionType.INCOME}>Entrada (+)</option>
                    <option value={TransactionType.EXPENSE}>Saída (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total</label>
                  <input required type="text" inputMode="numeric" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: maskCurrency(e.target.value)})} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xl outline-none focus:border-[#ee5a07] focus:ring-4 focus:ring-[#ee5a07]/5 transition-all ${newTx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`} placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input required type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none focus:border-[#ee5a07] focus:ring-4 focus:ring-[#ee5a07]/5 transition-all" />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                  <div className="flex gap-2">
                    <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none focus:border-[#ee5a07] transition-all">
                      {categories.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddCategoryModal(true)} className="bg-[#ee5a07] text-white p-4 rounded-2xl shadow-lg shadow-[#ee5a07]/10 hover:bg-[#d44d06] transition-all">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente Atribuído</label>
                  <select value={newTx.clientId} onChange={e => setNewTx({...newTx, clientId: e.target.value, projectId: ''})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none focus:border-[#ee5a07] transition-all">
                    <option value="">Nenhum Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projeto Vinculado</label>
                  <select disabled={!newTx.clientId} value={newTx.projectId} onChange={e => setNewTx({...newTx, projectId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none focus:border-[#ee5a07] transition-all disabled:opacity-40">
                    <option value="">Nenhum Projeto Específico</option>
                    {projects.filter(p => p.clientId === newTx.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#ee5a07] hover:bg-black text-white font-black py-5 rounded-3xl shadow-2xl shadow-[#ee5a07]/30 transition-all mt-6 transform active:scale-95 uppercase tracking-widest text-sm">
                {editingTxId ? 'Salvar Alterações' : 'Efetuar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Nova Categoria</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome</label>
                <input autoFocus required type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#ee5a07] transition-all" placeholder="Ex: Software SaaS" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Grupo DRE</label>
                <select value={newCat.group} onChange={e => setNewCat({...newCat, group: e.target.value as CategoryGroup})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#ee5a07] transition-all">
                  {Object.entries(CategoryGroup).map(([key, value]) => (
                    <option key={key} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-[#ee5a07] text-white font-black py-4 rounded-xl shadow-lg shadow-[#ee5a07]/10 hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest">
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const NavItem = ({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed: boolean }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-[#ee5a07] text-white shadow-lg shadow-[#ee5a07]/20 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}>
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-[#ee5a07]'} transition-colors`}>{icon}</span>
    {!collapsed && <span className="font-black text-xs uppercase tracking-widest truncate">{label}</span>}
  </button>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className={`bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-default`}>
    <div className="flex justify-between items-start mb-8">
      <div className={`${color} p-4 rounded-2xl group-hover:rotate-12 transition-transform duration-500`}>{icon}</div>
      <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">{title}</span>
    </div>
    <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</div>
  </div>
);

const DRELine = ({ label, value, isNegative = false, bold = false, highlight = false }: { label: string, value: number, isNegative?: boolean, bold?: boolean, highlight?: boolean }) => (
  <div className={`flex justify-between items-center px-6 py-4 rounded-2xl transition-all hover:bg-slate-50/80 ${bold ? 'font-black text-slate-900' : 'text-slate-500 font-bold'} ${highlight ? 'bg-[#ee5a07]/5 border-l-4 border-[#ee5a07] shadow-sm' : ''}`}>
    <span className="text-xs uppercase tracking-widest">{label}</span>
    <span className={`tabular-nums ${isNegative ? 'text-rose-500' : ''} ${bold ? 'text-lg' : 'text-sm'}`}>
      {isNegative ? '-' : ''} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value))}
    </span>
  </div>
);

export default App;
