import React, { useState, useEffect } from 'react';
import { Pill, Droplet, HeartPulse, Activity, Leaf, LogOut, History, Archive } from 'lucide-react';
import MedAnalyzer from './components/MedAnalyzer';
import UricAcidPage from './components/UricAcidPage';
import BloodPressurePage from './components/BloodPressurePage';
import BloodSugarPage from './components/BloodSugarPage';
import FattyLiverPage from './components/FattyLiverPage';
import HistoryPage from './components/HistoryPage';
import MyMedsPage from './components/MyMedsPage';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activePage, setActivePage] = useState<'analyzer' | 'uricAcid' | 'bloodPressure' | 'bloodSugar' | 'fattyLiver' | 'history' | 'myMeds'>('analyzer');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Pill className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">智慧用藥助手</h1>
          <p className="text-slate-500 mb-8">請登入以繼續使用並儲存您的健康紀錄</p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">Intelligent Medication Assistant (智慧用藥助手)</h1>
                  <p className="text-xs text-slate-500 font-medium hidden sm:block">臺北市立成功高級中學 馮柏翔 作品</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
            
            {/* Main Navigation */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto w-full sm:w-fit">
              <button
                onClick={() => setActivePage('analyzer')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'analyzer' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>藥品分析</span>
              </button>
              <button
                onClick={() => setActivePage('uricAcid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'uricAcid' 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Droplet className="w-4 h-4" />
                <span>尿酸問題輔助</span>
              </button>
              <button
                onClick={() => setActivePage('bloodPressure')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'bloodPressure' 
                    ? 'bg-white text-rose-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HeartPulse className="w-4 h-4" />
                <span>血壓問題輔助</span>
              </button>
              <button
                onClick={() => setActivePage('bloodSugar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'bloodSugar' 
                    ? 'bg-white text-teal-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>血糖問題輔助</span>
              </button>
              <button
                onClick={() => setActivePage('fattyLiver')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'fattyLiver' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Leaf className="w-4 h-4" />
                <span>脂肪肝問題輔助</span>
              </button>
              <button
                onClick={() => setActivePage('history')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'history' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>綜合歷史紀錄</span>
              </button>
              <button
                onClick={() => setActivePage('myMeds')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'myMeds' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>我的藥箱</span>
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activePage === 'analyzer' && <MedAnalyzer userId={userId} />}
          {activePage === 'uricAcid' && <UricAcidPage userId={userId} />}
          {activePage === 'bloodPressure' && <BloodPressurePage userId={userId} />}
          {activePage === 'bloodSugar' && <BloodSugarPage userId={userId} />}
          {activePage === 'fattyLiver' && <FattyLiverPage userId={userId} />}
          {activePage === 'history' && <HistoryPage userId={userId} />}
          {activePage === 'myMeds' && <MyMedsPage userId={userId} />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
