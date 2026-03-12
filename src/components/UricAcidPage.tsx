import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Droplet, Activity, TrendingUp, MessageCircle, Send, 
  AlertCircle, Plus, FileText, Loader2, Thermometer, Pill, GlassWater
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mock data for charts
const initialChartData = [
  { date: '01/15', uricAcid: 8.5 },
  { date: '01/30', uricAcid: 8.1 },
  { date: '02/15', uricAcid: 7.6 },
  { date: '03/01', uricAcid: 7.2 },
  { date: '03/10', uricAcid: 6.8 },
];

export default function UricAcidPage() {
  const [activeTab, setActiveTab] = useState<'education' | 'tracking' | 'trends'>('education');

  // --- Education Chat State ---
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '您好！我是您的尿酸與痛風衛教助手。關於低普林飲食、飲水建議，或是痛風發作時的處置，有什麼我可以幫忙解答的嗎？' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Tracking State ---
  const [waterIntake, setWaterIntake] = useState(0); // in ml
  const [sideEffects, setSideEffects] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingAdvice, setTrackingAdvice] = useState<string | null>(null);

  // --- Chart State ---
  const [chartData, setChartData] = useState(initialChartData);

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
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: '你是一位專門指導病患控制尿酸與預防痛風的衛教機器人。請提供飲食衛教（如低普林飲食、避免酒精與含糖飲料）、飲水提醒（每日建議量），以及痛風發作時的處置方式。回答要簡潔易懂、具體實用，並適時給予關懷。',
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
    if (!sideEffects.trim() && !symptoms.trim() && waterIntake === 0) return;
    
    setTrackingLoading(true);
    setTrackingAdvice(null);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `病患今日飲水量：${waterIntake} ml\n病患紀錄的藥物副作用：${sideEffects || '無'}\n病患紀錄的痛風/關節症狀：${symptoms || '無'}\n\n請根據以上資訊，評估病患的尿酸控制狀況。若飲水不足請給予提醒；若有副作用或痛風症狀，請給予具體的舒緩建議或就醫提醒。請用溫暖關懷的語氣，並以 Markdown 格式輸出。`,
        config: {
          temperature: 0.4,
        }
      });

      setTrackingAdvice(response.text || '無法產生建議，請稍後再試。');
    } catch (error) {
      console.error(error);
      setTrackingAdvice('分析過程中發生錯誤，請稍後再試。');
    } finally {
      setTrackingLoading(false);
    }
  };

  const addWater = (amount: number) => {
    setWaterIntake(prev => prev + amount);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('education')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'education' 
              ? 'bg-blue-50 text-blue-700' 
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
              ? 'bg-blue-50 text-blue-700' 
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
              ? 'bg-blue-50 text-blue-700' 
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
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Droplet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">尿酸與飲食衛教助手</h3>
                <p className="text-xs text-slate-500">解答低普林飲食與痛風預防疑問</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                      <Markdown>
                        {msg.text}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-500">正在思考...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="輸入您的問題，例如：我可以吃海鮮嗎？"
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
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
                  <Activity className="w-5 h-5 text-blue-600" />
                  綜合健康紀錄
                </h3>
                <p className="text-sm text-slate-500">記錄您的飲水、副作用與症狀，AI 將為您提供專屬建議。</p>
              </div>

              {/* Water Intake */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <GlassWater className="w-4 h-4 text-blue-500" />
                  今日飲水紀錄
                </label>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-blue-600">{waterIntake} <span className="text-base font-medium text-slate-500">ml</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => addWater(250)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">+ 250ml</button>
                    <button onClick={() => addWater(500)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">+ 500ml</button>
                    <button onClick={() => setWaterIntake(0)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">重置</button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">痛風患者建議每日飲水量至少 2000-3000 ml，以促進尿酸排泄。</p>
              </div>

              <hr className="border-slate-100" />

              {/* Symptoms */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  痛風或其他症狀紀錄
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="例如：右腳大拇趾關節紅腫熱痛、輕微發燒..."
                  rows={3}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </div>

              {/* Side Effects */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Pill className="w-4 h-4 text-amber-500" />
                  降尿酸藥物副作用紀錄
                </label>
                <textarea
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  placeholder="例如：服用秋水仙素後有腹瀉情況、皮膚起紅疹..."
                  rows={3}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAnalyzeTracking}
                disabled={trackingLoading || (!sideEffects.trim() && !symptoms.trim() && waterIntake === 0)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                  className="bg-blue-50 rounded-2xl border border-blue-100 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">AI 智慧建議</h4>
                  </div>
                  <div className="prose prose-sm prose-blue max-w-none text-blue-900">
                    <Markdown>{trackingAdvice}</Markdown>
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
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  尿酸檢驗值趨勢
                </h3>
                <p className="text-sm text-slate-500">追蹤您的血液尿酸濃度 (mg/dL)，目標值通常為 6.0 以下。</p>
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
                <FileText className="w-4 h-4" />
                匯出報表給醫師
              </button>
            </div>

            <div className="h-80 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[4, 10]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <ReferenceLine y={6.0} label={{ position: 'top', value: '目標值 (6.0)', fill: '#10b981', fontSize: 12 }} stroke="#10b981" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="uricAcid" name="尿酸 (mg/dL)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mt-4 border border-slate-100">
              <h4 className="text-sm font-medium text-slate-900 mb-2">近期摘要</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>最新尿酸值為 <span className="font-semibold text-blue-600">6.8 mg/dL</span>，較上次下降。</li>
                <li>距離痛風控制目標 <span className="font-semibold text-emerald-600">6.0 mg/dL</span> 還有進步空間。</li>
                <li>建議持續保持充足飲水與低普林飲食，並按時服藥。</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
