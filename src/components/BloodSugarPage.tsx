import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Activity, TrendingUp, MessageCircle, Send, 
  AlertCircle, Plus, FileText, Loader2, Thermometer, Pill, Droplet, User
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mock data for charts
const initialChartData = [
  { date: '01/15', fasting: 115, postprandial: 160 },
  { date: '01/30', fasting: 108, postprandial: 155 },
  { date: '02/15', fasting: 105, postprandial: 148 },
  { date: '03/01', fasting: 98, postprandial: 135 },
  { date: '03/10', fasting: 95, postprandial: 130 },
];

export default function BloodSugarPage({ userId }: { userId: string | null }) {
  const [activeTab, setActiveTab] = useState<'education' | 'tracking' | 'trends'>('education');

  // --- Education Chat State ---
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '您好！我是您的血糖與糖尿病衛教助手。關於低GI飲食、碳水化合物計算，或是降血糖藥物/胰島素的疑問，有什麼我可以幫忙解答的嗎？' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Tracking State ---
  const [fasting, setFasting] = useState<number | ''>('');
  const [postprandial, setPostprandial] = useState<number | ''>('');
  const [medications, setMedications] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingAdvice, setTrackingAdvice] = useState<{ advice: string; score: number; riskLevel: 'Low' | 'Medium' | 'High' } | null>(null);

  // --- Chart State ---
  const [chartData, setChartData] = useState(initialChartData);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);

  // Fetch records from Firestore
  useEffect(() => {
    if (!userId) return;
    
    const path = `users/${userId}/bloodSugarRecords`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(30));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = new Date(data.timestamp);
        return {
          date: `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`,
          fasting: data.fasting,
          postprandial: data.postprandial,
          medications: data.medications,
          sideEffects: data.sideEffects,
          symptoms: data.symptoms
        };
      });
      
      if (records.length > 0) {
        setChartData(records);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [userId]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'education') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    
    // Reset textarea height
    const textarea = document.getElementById('bs-chat-input-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: '你是一位專門指導病患控制血糖與預防糖尿病併發症的衛教機器人。請提供飲食衛教（如低GI飲食、控制碳水化合物）、生活習慣建議（如規律運動），以及低血糖/高血糖發作時的處置方式。回答要簡潔易懂、具體實用，並適時給予關懷。',
          temperature: 0.3,
        }
      });

      const response = await chat.sendMessage({ message: userMsg });
      
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || '抱歉，我現在無法回答。' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', text: '發生連線錯誤，請稍後再試。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzeTracking = async () => {
    if (!sideEffects.trim() && !symptoms.trim() && !medications.trim() && fasting === '' && postprandial === '') return;
    if (!userId) {
      alert("請先登入");
      return;
    }
    
    setTrackingLoading(true);
    setTrackingAdvice(null);

    // Save to Firestore
    if (fasting !== '' || postprandial !== '') {
      const path = `users/${userId}/bloodSugarRecords`;
      try {
        await addDoc(collection(db, path), {
          userId,
          ...(fasting !== '' && { fasting: Number(fasting) }),
          ...(postprandial !== '' && { postprandial: Number(postprandial) }),
          medications: medications.trim(),
          sideEffects: sideEffects.trim(),
          symptoms: symptoms.trim(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `病患今日量測血糖：空腹血糖 ${fasting || '未提供'} mg/dL / 飯後血糖 ${postprandial || '未提供'} mg/dL\n病患今日用藥紀錄：${medications || '無'}\n病患紀錄的藥物副作用：${sideEffects || '無'}\n病患紀錄的血糖相關症狀(如多飲、多尿、疲倦、低血糖發抖等)：${symptoms || '無'}\n\n請根據以上資訊，評估病患的血糖控制狀況。若血糖偏高或偏低請給予提醒；若有用藥、副作用或不適症狀，請給予具體的舒緩建議或就醫提醒。請用溫暖關懷的語氣。`,
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              advice: {
                type: Type.STRING,
                description: "給病患的具體建議，使用 Markdown 格式，語氣溫暖關懷。",
              },
              score: {
                type: Type.NUMBER,
                description: "血糖健康分數 (0-100)，分數越高代表狀況越好、風險越低。",
              },
              riskLevel: {
                type: Type.STRING,
                description: "糖尿病風險評估，必須是 'Low', 'Medium', 或 'High' 其中之一。",
              }
            },
            required: ["advice", "score", "riskLevel"]
          }
        }
      });

      const jsonStr = response.text?.trim() || '{}';
      const result = JSON.parse(jsonStr);

      setTrackingAdvice({
        advice: result.advice || '無法產生建議，請稍後再試。',
        score: result.score || 0,
        riskLevel: result.riskLevel || 'Medium'
      });
      
      // Clear inputs
      setFasting('');
      setPostprandial('');
      setMedications('');
      setSideEffects('');
      setSymptoms('');
    } catch (error) {
      console.error(error);
      setTrackingAdvice({
        advice: '分析過程中發生錯誤，請稍後再試。',
        score: 0,
        riskLevel: 'Medium'
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('education')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'education' 
              ? 'bg-teal-50 text-teal-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          衛教小幫手
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'tracking' 
              ? 'bg-teal-50 text-teal-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          健康紀錄
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'trends' 
              ? 'bg-teal-50 text-teal-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          檢驗與趨勢
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'education' && (
          <motion.div
            key="education"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]"
          >
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <Droplet className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">血糖與飲食衛教助手</h3>
                <p className="text-xs text-slate-500">解答低GI飲食與糖尿病預防疑問</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                      <Droplet className="w-4 h-4 text-teal-600" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-sm shadow-md shadow-teal-600/20' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                      <Markdown>
                        {msg.text}
                      </Markdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                    <Droplet className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span className="text-sm text-slate-500">正在思考...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2 items-end">
                <textarea
                  id="bs-chat-input-textarea"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                  placeholder="輸入您的問題... (Shift+Enter 換行)"
                  rows={1}
                  className="flex-1 border border-slate-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none overflow-y-auto"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 w-[44px] h-[44px]"
                >
                  <Send className="w-5 h-5 -ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tracking' && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  綜合健康紀錄
                </h3>
                <p className="text-sm text-slate-500">記錄您的血糖、副作用與症狀，AI 將為您提供專屬建議。</p>
              </div>

              {/* Blood Sugar Input */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Droplet className="w-4 h-4 text-teal-500" />
                  今日血糖紀錄 (mg/dL)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={fasting}
                      onChange={(e) => setFasting(e.target.value ? Number(e.target.value) : '')}
                      placeholder="空腹血糖"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                  <span className="text-slate-400 font-medium">/</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={postprandial}
                      onChange={(e) => setPostprandial(e.target.value ? Number(e.target.value) : '')}
                      placeholder="飯後血糖 (飯後2小時)"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">正常血糖標準：空腹 &lt; 100 mg/dL 且 飯後 &lt; 140 mg/dL。</p>
              </div>

              <hr className="border-slate-100" />

              {/* Symptoms */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  高/低血糖或其他症狀紀錄
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="例如：容易口渴、頻尿、飯前容易發抖冒冷汗..."
                  rows={3}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                />
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Pill className="w-4 h-4 text-teal-500" />
                  今日用藥紀錄
                </label>
                <textarea
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="例如：Metformin 1顆、施打胰島素..."
                  rows={2}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                />
              </div>

              {/* Side Effects */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  降血糖藥物副作用紀錄
                </label>
                <textarea
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  placeholder="例如：服用 Metformin 後容易脹氣、拉肚子..."
                  rows={2}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAnalyzeTracking}
                disabled={trackingLoading || (!sideEffects.trim() && !symptoms.trim() && !medications.trim() && fasting === '' && postprandial === '')}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {trackingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                分析紀錄並獲取建議
              </button>
            </div>

            <AnimatePresence>
              {trackingAdvice && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-teal-50 rounded-2xl border border-teal-100 p-6 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-teal-100">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">血糖健康分數</h4>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${trackingAdvice.score >= 80 ? 'text-emerald-500' : trackingAdvice.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {trackingAdvice.score}
                        </span>
                        <span className="text-sm font-medium text-slate-400">/ 100</span>
                      </div>
                    </div>
                    
                    <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">糖尿病風險評估</h4>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        trackingAdvice.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' :
                        trackingAdvice.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {trackingAdvice.riskLevel === 'Low' && <Activity className="w-4 h-4" />}
                        {trackingAdvice.riskLevel === 'Medium' && <AlertCircle className="w-4 h-4" />}
                        {trackingAdvice.riskLevel === 'High' && <Thermometer className="w-4 h-4" />}
                        {trackingAdvice.riskLevel === 'Low' ? '低風險' : trackingAdvice.riskLevel === 'Medium' ? '中度風險' : '高風險'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-teal-600" />
                      <h4 className="font-medium text-teal-900">AI 智慧建議</h4>
                    </div>
                    <div className="prose prose-sm prose-teal max-w-none text-teal-900">
                      <Markdown>{trackingAdvice.advice}</Markdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  血糖趨勢分析
                </h3>
                <p className="text-sm text-slate-500">追蹤您的血糖變化，了解控制成效。</p>
              </div>
            </div>

            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    setSelectedDataPoint(data.activePayload[0].payload);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <ReferenceLine y={140} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '標準飯後血糖', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: '標準空腹血糖', fill: '#10b981', fontSize: 10 }} />
                  <Line 
                    type="monotone" 
                    dataKey="postprandial" 
                    name="飯後血糖" 
                    stroke="#0d9488" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fasting" 
                    name="空腹血糖" 
                    stroke="#14b8a6" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {selectedDataPoint && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-500" />
                  紀錄詳情：{selectedDataPoint.date}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">血糖</span>
                    <span className="font-medium text-slate-700">空腹: {selectedDataPoint.fasting || '-'} / 飯後: {selectedDataPoint.postprandial || '-'} mg/dL</span>
                  </div>
                  {selectedDataPoint.medications && (
                    <div>
                      <span className="text-slate-500 block mb-1">服藥狀況</span>
                      <span className="font-medium text-slate-700">{selectedDataPoint.medications}</span>
                    </div>
                  )}
                  {selectedDataPoint.sideEffects && (
                    <div>
                      <span className="text-slate-500 block mb-1">副作用</span>
                      <span className="font-medium text-slate-700">{selectedDataPoint.sideEffects}</span>
                    </div>
                  )}
                  {selectedDataPoint.symptoms && (
                    <div>
                      <span className="text-slate-500 block mb-1">症狀</span>
                      <span className="font-medium text-slate-700">{selectedDataPoint.symptoms}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
              <p><strong>趨勢解讀：</strong> 您的血糖在過去兩個月有逐漸下降的趨勢，目前已接近標準值。請繼續保持良好的飲食與服藥習慣。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
