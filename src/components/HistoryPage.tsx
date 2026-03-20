import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Activity, HeartPulse, Droplet, Leaf, Calendar, Filter, Clock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HealthRecord {
  id: string;
  type: 'bloodPressure' | 'bloodSugar' | 'uricAcid' | 'fattyLiver';
  title: string;
  summary: string;
  timestamp: string;
  details: any;
}

export default function HistoryPage({ userId }: { userId: string | null }) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const path = `users/${userId}/healthRecords`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HealthRecord[];
      
      setRecords(fetchedRecords);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'bloodPressure': return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'bloodSugar': return <Activity className="w-5 h-5 text-teal-500" />;
      case 'uricAcid': return <Droplet className="w-5 h-5 text-blue-500" />;
      case 'fattyLiver': return <Leaf className="w-5 h-5 text-emerald-500" />;
      default: return <Activity className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBgColorForType = (type: string) => {
    switch (type) {
      case 'bloodPressure': return 'bg-rose-50 border-rose-100';
      case 'bloodSugar': return 'bg-teal-50 border-teal-100';
      case 'uricAcid': return 'bg-blue-50 border-blue-100';
      case 'fattyLiver': return 'bg-emerald-50 border-emerald-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredRecords = filterType === 'all' 
    ? records 
    : records.filter(r => r.type === filterType);

  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['日期', '類型', '標題', '摘要', '詳細資訊'];
    
    const rows = filteredRecords.map(record => {
      const date = formatDate(record.timestamp);
      const typeStr = {
        'bloodPressure': '血壓',
        'bloodSugar': '血糖',
        'uricAcid': '尿酸',
        'fattyLiver': '脂肪肝'
      }[record.type] || record.type;
      
      const detailsArr = [];
      if (record.details?.symptoms) detailsArr.push(`症狀: ${record.details.symptoms}`);
      if (record.details?.sideEffects) detailsArr.push(`副作用: ${record.details.sideEffects}`);
      if (record.details?.medications) detailsArr.push(`用藥: ${record.details.medications}`);
      if (record.details?.dietExercise) detailsArr.push(`飲食與運動: ${record.details.dietExercise}`);
      const details = detailsArr.join('; ');

      return [
        `"${date}"`,
        `"${typeStr}"`,
        `"${record.title.replace(/"/g, '""')}"`,
        `"${record.summary.replace(/"/g, '""')}"`,
        `"${details.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `health_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              綜合健康歷史紀錄
            </h2>
            <p className="text-sm text-slate-500 mt-1">檢視您所有的健康追蹤數據與紀錄</p>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={exportToCSV}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              匯出 CSV
            </button>
            <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">全部紀錄</option>
              <option value="bloodPressure">血壓</option>
              <option value="bloodSugar">血糖</option>
              <option value="uricAcid">尿酸</option>
              <option value="fattyLiver">脂肪肝</option>
            </select>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">尚無紀錄</h3>
            <p className="text-slate-500 mt-1">您還沒有新增任何健康紀錄，開始追蹤您的健康狀況吧！</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            <AnimatePresence>
              {filteredRecords.map((record, index) => (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  {/* Timeline dot */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {getIconForType(record.type)}
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border shadow-sm bg-white transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getBgColorForType(record.type)}`}>
                        {record.title}
                      </div>
                      <time className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(record.timestamp)}
                      </time>
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="text-lg font-bold text-slate-800">{record.summary}</h4>
                      
                      {/* Optional details preview */}
                      {(record.details?.symptoms || record.details?.sideEffects || record.details?.medications) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs text-slate-600">
                          {record.details?.symptoms && (
                            <span className="bg-slate-100 px-2 py-1 rounded-md">症狀: {record.details.symptoms}</span>
                          )}
                          {record.details?.sideEffects && (
                            <span className="bg-slate-100 px-2 py-1 rounded-md">副作用: {record.details.sideEffects}</span>
                          )}
                          {record.details?.medications && (
                            <span className="bg-slate-100 px-2 py-1 rounded-md">用藥: {record.details.medications}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
