import React, { useState } from 'react';
import { Pill, Droplet } from 'lucide-react';
import MedAnalyzer from './components/MedAnalyzer';
import UricAcidPage from './components/UricAcidPage';

export default function App() {
  const [activePage, setActivePage] = useState<'analyzer' | 'uricAcid'>('analyzer');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">MedAnalyzer Pro</h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">專業藥品分析與交互作用檢查</p>
            </div>
          </div>
          
          {/* Main Navigation */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActivePage('analyzer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'analyzer' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">藥品分析</span>
            </button>
            <button
              onClick={() => setActivePage('uricAcid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'uricAcid' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplet className="w-4 h-4" />
              <span className="hidden sm:inline">尿酸問題輔助</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePage === 'analyzer' ? <MedAnalyzer /> : <UricAcidPage />}
      </main>
    </div>
  );
}
