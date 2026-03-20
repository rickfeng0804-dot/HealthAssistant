import React, { useState, useRef } from 'react';
import { Camera, Upload, Search, AlertTriangle, Info, Activity, Loader2, X, Pill, Clock, Zap, CheckCircle, FlaskConical, Bookmark, BookmarkCheck } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function MedAnalyzer({ userId }: { userId: string | null }) {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setImage(base64Image);
        
        setIdentifying(true);
        try {
          const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            const response = await ai.models.generateContent({
              model: 'gemini-3.1-pro-preview',
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: match[1],
                      data: match[2]
                    }
                  },
                  { text: '請辨識圖片中的藥品名稱。請只輸出最主要的一個或一組藥品名稱（中英文皆可），不要輸出任何其他多餘的描述、標點符號或解釋。如果圖片中沒有藥品或無法辨識，請回覆「無法辨識」。' }
                ]
              },
              config: {
                temperature: 0.1,
              }
            });
            
            const identifiedName = response.text?.trim();
            if (identifiedName && !identifiedName.includes('無法辨識')) {
              setQuery(identifiedName);
            }
          }
        } catch (err) {
          console.error('Image identification failed:', err);
        } finally {
          setIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const analyzeMedication = async () => {
    if (!query.trim() && !image) {
      setError('請輸入藥品名稱或上傳/拍攝藥品照片。');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setIsSaved(false);

    try {
      const parts: any[] = [];
      
      if (image) {
        const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      if (query.trim()) {
        parts.push({ text: `請分析此藥品：${query}` });
      } else {
        parts.push({ text: '請辨識圖片中的藥品並進行分析。' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          systemInstruction: `你是一位專業的藥師與藥理學家。你的任務是分析使用者提供的藥品名稱或圖片，並以繁體中文提供詳細、準確且結構化的資訊。
請務必使用以下 Markdown 格式回覆：

## 藥品概述
[提供藥品的基本介紹、它是什麼以及它的作用機制]

## 化學結構
![如果無法辨識藥品，請填寫替代文字，例如：無法取得此藥品的化學結構](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/[藥品英文學名]/PNG)
(註：請確保網址中的英文學名全小寫且無空格。若無法確定英文學名，請將網址中的學名替換為 unknown)

## 藥品成分
[詳細列出藥品的主要有效成分(Active Ingredients)與賦形劑(Inactive Ingredients)，並提供各成分的詳細說明與作用]

## 副作用
[列出常見及嚴重的副作用]

## 服用須知
[說明如何服用、劑量指引、忘記服藥時該怎麼辦等注意事項]

## 交互作用
[詳細說明應避免與哪些其他藥品、保健食品或食物一起服用，以免產生交互作用]

如果使用者提供的是圖片，請先辨識圖片中的藥品名稱，然後再提供分析。如果圖片不是藥品，請明確告知。`,
          temperature: 0.2,
        }
      });

      setResult(response.text || '無法取得分析結果，請稍後再試。');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '分析過程中發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToMeds = async () => {
    if (!userId || !result) return;
    setIsSaving(true);
    const path = `users/${userId}/myMeds`;
    try {
      await addDoc(collection(db, path), {
        userId,
        name: query.trim() || '未命名藥品',
        analysis: result,
        timestamp: new Date().toISOString()
      });
      setIsSaved(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">查詢藥品</h2>
          <p className="text-sm text-slate-500">輸入藥品名稱，或上傳/拍攝藥品包裝、處方籤照片以進行辨識。</p>
        </div>

        <div className="space-y-4">
          {/* Text Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={identifying ? "正在辨識圖片中的藥品..." : "例如：普拿疼 (Panadol)、Amoxicillin..."}
              disabled={identifying}
              className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow disabled:bg-slate-50 disabled:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && analyzeMedication()}
            />
            {identifying && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Image Preview */}
          <AnimatePresence>
            {image && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
              >
                <img src={image} alt="Uploaded medication" className="w-full max-h-64 object-contain" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={handleImageUpload}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Upload className="w-4 h-4" />
              上傳照片
            </button>
            
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Camera className="w-4 h-4" />
              拍攝照片
            </button>

            <button
              onClick={analyzeMedication}
              disabled={loading || (!query.trim() && !image)}
              className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  開始分析
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-medium text-slate-900">分析報告</h2>
              </div>
              {userId && (
                <button
                  onClick={handleSaveToMeds}
                  disabled={isSaved || isSaving}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isSaved 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {isSaved ? '已加入藥箱' : '加入我的藥箱'}
                </button>
              )}
            </div>
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
                {result}
              </Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
