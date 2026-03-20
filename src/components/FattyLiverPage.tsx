import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Activity, TrendingUp, MessageCircle, Send, 
  AlertCircle, Plus, FileText, Loader2, Thermometer, Pill, User, Scale, Utensils
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
  { date: '01/15', weight: 85.2, ast: 45, alt: 55, dietExercise: '早餐：燕麥粥\n午餐：雞胸肉沙拉\n晚餐：燙青菜、糙米飯\n運動：快走 30 分鐘', symptoms: '容易疲倦' },
  { date: '01/30', weight: 84.5, ast: 42, alt: 50, dietExercise: '早餐：無糖豆漿、地瓜\n午餐：健康餐盒\n晚餐：鮭魚、花椰菜\n運動：慢跑 20 分鐘', symptoms: '無明顯不適' },
  { date: '02/15', weight: 83.1, ast: 38, alt: 45, dietExercise: '早餐：水煮蛋、黑咖啡\n午餐：蔬菜湯、全麥麵包\n晚餐：豆腐、青菜\n運動：瑜珈 45 分鐘', symptoms: '精神變好' },
  { date: '03/01', weight: 82.0, ast: 35, alt: 40, dietExercise: '早餐：優格、堅果\n午餐：烤雞腿排、生菜\n晚餐：清蒸魚、菠菜\n運動：游泳 30 分鐘', symptoms: '無' },
  { date: '03/10', weight: 81.5, ast: 32, alt: 36, dietExercise: '早餐：全麥吐司、無糖鮮奶\n午餐：糙米飯、瘦肉、青菜\n晚餐：蔬菜沙拉\n運動：快走 40 分鐘', symptoms: '無' },
];

export default function FattyLiverPage({ userId }: { userId: string | null }) {
  const [activeTab, setActiveTab] = useState<'education' | 'tracking' | 'trends'>('education');

  // --- Education Chat State ---
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '您好！我是您的脂肪肝衛教助手。關於減重、地中海飲食、有氧運動，或是肝臟保健的疑問，有什麼我可以幫忙解答的嗎？' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Tracking State ---
  const [weight, setWeight] = useState<number | ''>('');
  const [dietExercise, setDietExercise] = useState('');
  const [medications, setMedications] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingAdvice, setTrackingAdvice] = useState<{ advice: string; score: number; riskLevel: 'Low' | 'Medium' | 'High' } | null>(null);

  // --- Chart State ---
  const [chartData, setChartData] = useState(initialChartData);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);

  // Fetch records from Firestore
  useEffect(() => {
    if (!userId) return;
    
    const path = `users/${userId}/fattyLiverRecords`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(30));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = new Date(data.timestamp);
        return {
          date: `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`,
          weight: data.weight,
          ast: data.ast,
          alt: data.alt,
          dietExercise: data.dietExercise,
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
    const textarea = document.getElementById('fl-chat-input-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: '你是一位專門指導病患改善脂肪肝與預防肝炎的衛教機器人。請提供飲食衛教（如減少精緻糖、控制碳水化合物、地中海飲食）、生活習慣建議（如規律有氧運動、減重），以及相關症狀的處置方式。回答要簡潔易懂、具體實用，並適時給予關懷。',
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
    if (!dietExercise.trim() && !symptoms.trim() && !medications.trim() && weight === '') return;
    if (!userId) {
      alert("請先登入");
      return;
    }
    
    setTrackingLoading(true);
    setTrackingAdvice(null);

    // Save to Firestore
    if (weight !== '') {
      const path = `users/${userId}/fattyLiverRecords`;
      const healthRecordsPath = `users/${userId}/healthRecords`;
      const timestamp = new Date().toISOString();
      const recordData = {
        userId,
        weight: Number(weight),
        dietExercise: dietExercise.trim(),
        medications: medications.trim(),
        symptoms: symptoms.trim(),
        timestamp
      };

      try {
        await addDoc(collection(db, path), recordData);
        await addDoc(collection(db, healthRecordsPath), {
          userId,
          type: 'fattyLiver',
          title: '脂肪肝紀錄',
          summary: `體重 ${weight} kg`,
          timestamp,
          details: recordData
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `病患今日體重：${weight || '未提供'} kg\n病患今日飲食與運動紀錄：${dietExercise || '無'}\n病患今日用藥/保健食品紀錄：${medications || '無'}\n病患紀錄的相關症狀(如疲倦、右上腹不適等)：${symptoms || '無'}\n\n請根據以上資訊，評估病患的脂肪肝控制狀況。針對體重管理與飲食運動給予具體建議；若有不適症狀，請給予舒緩建議或就醫提醒。請用溫暖關懷的語氣。`,
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
                description: "肝臟健康分數 (0-100)，分數越高代表狀況越好、風險越低。",
              },
              riskLevel: {
                type: Type.STRING,
                description: "脂肪肝惡化風險評估，必須是 'Low', 'Medium', 或 'High' 其中之一。",
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
      setWeight('');
      setDietExercise('');
      setMedications('');
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
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'education' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          衛教小幫手
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'tracking' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          健康紀錄
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'trends' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          數值趨勢
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
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">脂肪肝衛教助手</h3>
                <p className="text-xs text-slate-500">解答減重、飲食與肝臟保健疑問</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-sm shadow-md shadow-emerald-600/20' 
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
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-slate-500">正在思考...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2 items-end">
                <textarea
                  id="fl-chat-input-textarea"
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
                  className="flex-1 border border-slate-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none overflow-y-auto"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 w-[44px] h-[44px]"
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
                  <Activity className="w-5 h-5 text-emerald-600" />
                  綜合健康紀錄
                </h3>
                <p className="text-sm text-slate-500">記錄您的體重、飲食運動與症狀，AI 將為您提供專屬建議。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weight */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Scale className="w-4 h-4 text-emerald-500" />
                    今日體重 (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="例如：75.5"
                    className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Diet & Exercise */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                  飲食與運動紀錄
                </label>
                <textarea
                  value={dietExercise}
                  onChange={(e) => setDietExercise(e.target.value)}
                  placeholder="例如：今天吃了燕麥粥、燙青菜；快走 30 分鐘..."
                  rows={3}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>

              {/* Symptoms */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  相關症狀紀錄
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="例如：容易疲倦、右上腹悶痛..."
                  rows={2}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Pill className="w-4 h-4 text-emerald-500" />
                  今日用藥 / 保健食品紀錄
                </label>
                <textarea
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="例如：維他命E、降血脂藥物..."
                  rows={2}
                  className="block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAnalyzeTracking}
                disabled={trackingLoading || (!dietExercise.trim() && !symptoms.trim() && !medications.trim() && weight === '')}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {trackingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                {trackingLoading ? 'AI 分析中...' : '分析紀錄並獲取建議'}
              </button>
            </div>

            {/* AI Advice Result */}
            {trackingAdvice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    AI 綜合評估建議
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-slate-500">健康分數</div>
                      <div className="text-2xl font-bold text-emerald-600">{trackingAdvice.score}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      trackingAdvice.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                      trackingAdvice.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {trackingAdvice.riskLevel === 'Low' ? '狀況良好' :
                       trackingAdvice.riskLevel === 'Medium' ? '需要注意' : '建議就醫'}
                    </div>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-li:marker:text-emerald-500">
                  <Markdown>{trackingAdvice.advice}</Markdown>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">體重與肝功能指數趨勢</h3>
                  <p className="text-sm text-slate-500">觀察您的體重與 AST/ALT 變化</p>
                </div>
                <button className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  新增數值
                </button>
              </div>
              
              <div className="h-[300px] w-full cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        setSelectedDataPoint(data.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <ReferenceLine y={40} yAxisId="right" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '肝指數標準上限', fill: '#ef4444', fontSize: 12 }} />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="weight" 
                      name="體重 (kg)"
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="ast" 
                      name="AST (GOT)"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="alt" 
                      name="ALT (GPT)"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-center text-sm text-slate-500">
                💡 點擊圖表中的數據點，可查看該日期的詳細紀錄
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedDataPoint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-emerald-800 font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {selectedDataPoint.date} 詳細紀錄
                      </h4>
                      <button 
                        onClick={() => setSelectedDataPoint(null)}
                        className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                      >
                        關閉
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
                          <Utensils className="w-4 h-4" />
                          飲食與運動
                        </div>
                        <div className="bg-white/60 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-line">
                          {selectedDataPoint.dietExercise || '無紀錄'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
                          <Thermometer className="w-4 h-4" />
                          相關症狀
                        </div>
                        <div className="bg-white/60 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-line">
                          {selectedDataPoint.symptoms || '無紀錄'}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="text-sm font-medium text-slate-500 mb-1">最新體重</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-slate-900">81.5</div>
                  <div className="text-sm font-medium text-slate-500">kg</div>
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  較上月減少 1.6 kg
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="text-sm font-medium text-slate-500 mb-1">最新 AST (GOT)</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-slate-900">32</div>
                  <div className="text-sm font-medium text-slate-500">U/L</div>
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1">
                  正常範圍 (&lt; 40)
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="text-sm font-medium text-slate-500 mb-1">最新 ALT (GPT)</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-slate-900">36</div>
                  <div className="text-sm font-medium text-slate-500">U/L</div>
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1">
                  正常範圍 (&lt; 40)
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
