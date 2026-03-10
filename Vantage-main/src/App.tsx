/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Package, 
  AlertTriangle, 
  FileText, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight,
  LayoutDashboard,
  Settings,
  Menu,
  ChevronRight,
  TrendingDown,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Project {
  id: string;
  name: string;
  spending_limit: number;
  total_spent: number;
  status: string;
  remaining_budget: number;
  blocked_count: number;
}

interface InventoryItem {
  sku: string;
  description: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  unit: string;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Command Center' },
    { id: 'sentinel', icon: Shield, label: 'The Sentinel' },
    { id: 'vault', icon: Package, label: 'The Vault' },
    { id: 'projects', icon: FileText, label: 'Projects' },
  ];

  return (
    <div className="w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Shield className="text-black w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tighter text-white">VANTAGE</h1>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-white/10 text-white' 
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="bg-zinc-900/50 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-zinc-300">Sentinel Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [summary, setSummary] = useState<Project[]>([]);

  useEffect(() => {
    fetch('/api/dashboard-summary')
      .then(res => res.json())
      .then(setSummary);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white">Command Center</h2>
        <p className="text-zinc-400">Real-time financial integrity monitoring</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summary.map((proj) => (
          <motion.div 
            key={proj.project_name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-white">{proj.project_name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                proj.blocked_count > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                {proj.blocked_count > 0 ? 'ALERTS ACTIVE' : 'SECURE'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Liquidity Gauge</span>
                <span className="text-white font-mono">
                  {((proj.total_spent / proj.spending_limit) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(proj.total_spent / proj.spending_limit) * 100}%` }}
                  className={`h-full ${
                    proj.total_spent / proj.spending_limit > 0.9 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold">Spent</p>
                <p className="text-lg font-mono text-white">${proj.total_spent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold">Remaining</p>
                <p className="text-lg font-mono text-emerald-400">${proj.remaining_budget.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white">Recent System Logs</h3>
          <button className="text-xs text-zinc-500 hover:text-white transition-colors">View All</button>
        </div>
        <div className="divide-y divide-white/5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Activity className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Catalyst Sync Successful</p>
                <p className="text-xs text-zinc-500">Project "Residencial Arcos" updated spending limit to $750,000</p>
              </div>
              <span className="text-xs text-zinc-600 font-mono">2m ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Sentinel = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
  }, []);

  const handleSimulateUpload = async () => {
    if (!selectedProject) return alert('Select a project first');
    setIsUploading(true);
    
    // Simulate invoice data extraction
    const mockInvoice = {
      vendor: "Materiales del Norte SA",
      items: [
        { name: "Cemento Gris 50kg", qty: 10, price: 185 },
        { name: "Varilla 3/8", qty: 5, price: 260 },
        { name: "Pala de Obra", qty: 2, price: 450 } // This might not be in BOM
      ]
    };

    try {
      const res = await fetch('/api/validate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          invoiceData: mockInvoice,
          fileName: 'invoice_001.pdf'
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white">The Sentinel</h2>
        <p className="text-zinc-400">AI-Powered Invoice & BOM Validation</p>
      </header>

      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest">Select Project</label>
          <select 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Choose a project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div 
          onClick={handleSimulateUpload}
          className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
            isUploading ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
          }`}
        >
          {isUploading ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
              />
              <p className="text-emerald-500 font-bold">Sentinel is analyzing document...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">Upload Invoice or Pro-forma</p>
                <p className="text-zinc-500">Drag and drop PDF/JPG or click to browse</p>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden"
          >
            <div className={`p-6 flex items-center justify-between ${
              result.status === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <div className="flex items-center gap-3">
                {result.status === 'APPROVED' ? (
                  <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                ) : (
                  <XCircle className="text-red-500 w-6 h-6" />
                )}
                <h3 className="font-bold text-white">
                  Validation Result: {result.status}
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">PO ID: {result.poId.slice(0,8)}</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Extracted Items</h4>
                  <div className="space-y-2">
                    {result.result.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                        <div>
                          <p className="text-sm text-white font-medium">{item.description}</p>
                          <p className="text-xs text-zinc-500">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-mono">${(item.price * item.quantity).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">AI Reasoning</h4>
                  <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5 text-sm text-zinc-300 leading-relaxed italic">
                    "{result.result.reasoning}"
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Total Invoice</span>
                      <span className="text-2xl font-mono text-white">${result.result.total_invoice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {result.status === 'BLOCKED' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500 w-5 h-5" />
                    <p className="text-sm text-red-200">This purchase exceeds the remaining project budget.</p>
                  </div>
                  <button className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors">
                    Request Exception
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Vault = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch('/api/inventory').then(res => res.json()).then(setInventory);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white">The Vault</h2>
        <p className="text-zinc-400">Centralized Inventory & Asset Management</p>
      </header>

      <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search SKUs, materials..."
              className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-11 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-colors">
            Add Stock
          </button>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Material / SKU</th>
              <th className="px-6 py-4">On Hand</th>
              <th className="px-6 py-4">Reserved</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {inventory.map((item) => (
              <tr key={item.sku} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm text-white font-medium">{item.description}</p>
                  <p className="text-xs text-zinc-500 font-mono">{item.sku}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-white font-mono">{item.quantity_on_hand} {item.unit}s</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-zinc-400 font-mono">{item.quantity_reserved} {item.unit}s</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    item.quantity_on_hand > 10 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {item.quantity_on_hand > 10 ? 'IN STOCK' : 'LOW STOCK'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'sentinel' && <Sentinel />}
            {activeTab === 'vault' && <Vault />}
            {activeTab === 'projects' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <FileText className="w-16 h-16 text-zinc-800" />
                <h3 className="text-xl font-bold text-white">Project Management</h3>
                <p className="text-zinc-500 max-w-md">Detailed project view and BOM management coming soon. Use Command Center for overview.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
