import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Archive, Trash2, ChevronDown, ChevronUp, Pill, AlertTriangle, CheckCircle, Zap, Info, FlaskConical, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface SavedMed {
  id: string;
  name: string;
  analysis: string;
  timestamp: string;
}

export default function MyMedsPage({ userId }: { userId: string | null }) {
  const [meds, setMeds] = useState<SavedMed[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const path = `users/${userId}/myMeds`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMeds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedMed[];
      
      setMeds(fetchedMeds);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    const path = `users/${userId}/myMeds`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">我的藥箱</h2>
            <p className="text-sm text-slate-500 mt-1">管理您儲存的藥品分析紀錄</p>
          </div>
        </div>

        {meds.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">藥箱是空的</h3>
            <p className="text-slate-500 mt-1">您還沒有儲存任何藥品。在「藥品分析」查詢後，點擊「加入我的藥箱」即可儲存。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {meds.map((med) => (
                <motion.div 
                  key={med.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
                >
                  <div 
                    onClick={() => toggleExpand(med.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{med.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(med.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleDelete(med.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-1 text-slate-400">
                        {expandedId === med.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === med.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                      >
                        <div className="p-6 prose prose-slate max-w-none prose-headings:font-medium prose-p:leading-relaxed prose-li:marker:text-indigo-500">
                          <Markdown
                            components={{
                              img: ({node, alt, src, ...props}) => {
                                const [hasError, setHasError] = React.useState(false);
                                if (hasError || !src || src.includes('unknown')) {
                                  return (
                                    <div className="max-w-xs sm:max-w-sm rounded-xl bg-slate-50 p-6 border border-slate-200 border-dashed text-center mx-auto my-6 text-slate-500 text-sm flex flex-col items-center justify-center">
                                      <FlaskConical className="w-8 h-8 mb-2 text-slate-300" />
                                      <p>{alt && alt !== '化學結構圖' && !alt.includes('如果無法辨識') ? alt : '無法載入化學結構圖，可能無此藥品的結構資料'}</p>
                                    </div>
                                  );
                                }
                                return (
                                  <img 
                                    src={src}
                                    alt={alt}
                                    {...props} 
                                    className="max-w-xs sm:max-w-sm rounded-xl bg-white p-4 border border-slate-200 shadow-sm mx-auto my-6" 
                                    onError={() => setHasError(true)}
                                  />
                                );
                              },
                              h2: ({node, children, ...props}) => {
                                const text = React.Children.toArray(children).join('');
                                
                                let Icon = Info;
                                let colorClass = "text-indigo-600";
                                let bgClass = "bg-indigo-50";
                                let borderClass = "border-indigo-100";

                                if (text.includes('概述')) {
                                  Icon = Info;
                                  colorClass = "text-blue-600";
                                  bgClass = "bg-blue-50";
                                  borderClass = "border-blue-100";
                                } else if (text.includes('化學結構')) {
                                  Icon = FlaskConical;
                                  colorClass = "text-purple-600";
                                  bgClass = "bg-purple-50";
                                  borderClass = "border-purple-100";
                                } else if (text.includes('成分')) {
                                  Icon = Pill;
                                  colorClass = "text-teal-600";
                                  bgClass = "bg-teal-50";
                                  borderClass = "border-teal-100";
                                } else if (text.includes('副作用')) {
                                  Icon = AlertTriangle;
                                  colorClass = "text-rose-600";
                                  bgClass = "bg-rose-50";
                                  borderClass = "border-rose-100";
                                } else if (text.includes('服用須知')) {
                                  Icon = CheckCircle;
                                  colorClass = "text-emerald-600";
                                  bgClass = "bg-emerald-50";
                                  borderClass = "border-emerald-100";
                                } else if (text.includes('交互作用')) {
                                  Icon = Zap;
                                  colorClass = "text-amber-600";
                                  bgClass = "bg-amber-50";
                                  borderClass = "border-amber-100";
                                }

                                return (
                                  <h2 className={`flex items-center gap-2 mt-8 mb-4 pb-3 border-b ${borderClass} text-xl font-bold text-slate-800 first:mt-0`} {...props}>
                                    <span className={`p-1.5 rounded-lg ${bgClass}`}>
                                      <Icon className={`w-5 h-5 ${colorClass}`} />
                                    </span>
                                    {children}
                                  </h2>
                                );
                              }
                            }}
                          >
                            {med.analysis}
                          </Markdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
