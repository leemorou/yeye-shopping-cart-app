// src/components/GroupForm.jsx
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, Sparkles, ArrowUp, ArrowDown, Link as LinkIcon, Package, Calendar, Edit3, Save, Tag } from 'lucide-react'; 

const GEMINI_API_KEY = "AIzaSyDhfACb-gWpOEtmEgd-YJgB0gbGQKoeivE"; 

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
};

export default function GroupForm({ onSubmit, onCancel, initialData = null, submitLabel = "發佈團務" }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState(initialData?.type || '預購'); 
    
    const [imgUrls, setImgUrls] = useState(() => initialData?.images?.filter(url => url.startsWith('http'))?.join(', ') || '');
    const [localImages, setLocalImages] = useState(() => initialData?.images?.filter(url => url.startsWith('data:')) || []);
    const [infoUrl, setInfoUrl] = useState(initialData?.infoUrl || '');
    
    const [deadline, setDeadline] = useState(() => initialData?.deadline ? initialData.deadline.slice(0, 16) : '');
    const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || '');
    
    const [items, setItems] = useState(initialData?.items || [{ id: 1, name: '', spec: '', price: '', limit: '', image: '' }]);

    const [showAiImport, setShowAiImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const addItem = () => setItems([...items, { id: Date.now(), name: '', spec: '', price: '', limit: '', image: '' }]);
    const updateItem = (id, f, v) => setItems(items.map(i => i.id === id ? { ...i, [f]: v } : i));
    const removeItem = (id) => items.length > 1 ? setItems(items.filter(i => i.id !== id)) : setItems([{ id: Date.now(), name: '', spec: '', price: '', limit: '', image: '' }]); 
    
    const moveItem = (idx, dir) => {
        const n = [...items];
        if (dir === 'up' && idx > 0) [n[idx-1], n[idx]] = [n[idx], n[idx-1]];
        if (dir === 'down' && idx < n.length-1) [n[idx+1], n[idx]] = [n[idx], n[idx+1]];
        setItems(n);
    };

    const handleFileChange = async (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const compressed = await Promise.all(files.map(f => compressImage(f)));
            setLocalImages(prev => [...prev, ...compressed]);
            e.target.value = null;
        }
    };

    // --- Gemini AI ---
    const callGemini = async (prompt) => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('GQKoeivE')) { alert("請先填入正確的 Gemini API Key"); return null; }
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                }
            );
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error) {
            console.error('Gemini Call Failed:', error);
            alert("AI 呼叫失敗，請檢查 API Key 或網路");
            return null;
        }
    };

    const handleAiImport = async () => {
        if (!importText) return;
        setAiLoading(true);
        const prompt = `Parse text to JSON array. Keys: "name", "spec", "price" (number), "limit" (number). Text: ${importText}`;
        try {
            let result = await callGemini(prompt);
            if (result) {
                result = result.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedItems = JSON.parse(result);
                if (Array.isArray(parsedItems)) {
                    setItems(prev => [
                        ...prev.filter(i => i.name || i.price),
                        ...parsedItems.map(i => ({ 
                            id: Date.now() + Math.random(), 
                            name: i.name || '', 
                            spec: i.spec || '', 
                            price: i.price || '', 
                            limit: i.limit || '',
                            image: '' 
                        }))
                    ]);
                    setShowAiImport(false);
                    setImportText('');
                } else alert("AI 無法辨識格式");
            }
        } catch (e) { console.error(e); alert("AI 解析失敗"); }
        setAiLoading(false);
    };

    const handleSubmit = () => {
        if (!title || !deadline) return alert("請填寫名稱和收單時間");
        const validItems = items.filter(i => i.name && i.price);
        if (validItems.length === 0) return alert("至少要有一個商品/委託項");
        const manualUrls = imgUrls.split(',').map(s => s.trim()).filter(s => s);
        
        onSubmit({ 
            title, 
            type, // 回傳選擇的類型
            images: [...manualUrls, ...localImages], 
            infoUrl, 
            deadline, 
            releaseDate, 
            items: validItems 
        });
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            {/* 名稱 */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <Package size={16} /> 標題 (必填)
                </label>
                <input 
                    className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="例如：我的英雄學院 6 期 BD 特典"
                    required
                />
            </div>

            {/* ★ 修改：只保留 預購/現貨 兩個選項 (Goal 2) */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <Tag size={16} /> 類型選擇
                </label>
                <div className="flex gap-2 text-xs sm:text-sm">
                    <label className={`flex-1 cursor-pointer border-2 rounded-lg py-2 px-1 text-center font-black transition-all ${type === '預購' ? 'bg-slate-900 text-yellow-400 border-slate-900 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                        <input type="radio" className="hidden" name="groupType" value="預購" checked={type === '預購'} onChange={() => setType('預購')} />
                        ⏳ 預購
                    </label>
                    <label className={`flex-1 cursor-pointer border-2 rounded-lg py-2 px-1 text-center font-black transition-all ${type === '現貨' ? 'bg-green-600 text-white border-green-800 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                        <input type="radio" className="hidden" name="groupType" value="現貨" checked={type === '現貨'} onChange={() => setType('現貨')} />
                        ⚡ 現貨
                    </label>
                </div>
            </div>

            {/* 封面圖片連結 */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <ImageIcon size={16} /> 參考圖片連結 (多個請用逗號分隔)
                </label>
                <textarea 
                    className="w-full border-2 border-slate-900 rounded p-2 text-sm h-16 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    value={imgUrls} 
                    onChange={e => setImgUrls(e.target.value)} 
                    placeholder="圖片網址 (可多個)"
                />
            </div>

            {/* 上傳本機圖片 */}
            <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-100">
                <label className="text-sm font-black italic text-slate-900 flex items-center gap-2">
                    <Upload size={16} /> 上傳本機圖片
                </label>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileChange} 
                    className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-2 file:border-red-800 file:text-xs file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer" 
                />
                {localImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 pb-4">
                        {localImages.map((src, idx) => (
                            <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-900 shadow">
                                <img src={src} className="w-full h-full object-cover" alt="preview" />
                                <button type="button" onClick={() => setLocalImages(p => p.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 transform translate-x-1/3 -translate-y-1/3 border-2 border-white hover:bg-red-700 transition-all"><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 商品資訊連結 */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <LinkIcon size={16} /> 參考/購買連結 (選填)
                </label>
                <input 
                    className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    value={infoUrl} 
                    onChange={e => setInfoUrl(e.target.value)} 
                    placeholder="https://shueisha.co.jp/..."
                />
            </div>
            
            {/* 日期區塊 */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                        <Calendar size={16} /> 截止/希望購買時間 (必填)
                    </label>
                    <input 
                        type="datetime-local" 
                        className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                        value={deadline} 
                        onChange={e => setDeadline(e.target.value)} 
                        required
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-black italic text-slate-900 mb-1">
                        預計發售日 (選填)
                    </label>
                    <input 
                        type="date" 
                        className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                        value={releaseDate} 
                        onChange={e => setReleaseDate(e.target.value)} 
                    />
                </div>
            </div>

            {/* 商品列表區塊 */}
            <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h4 className="font-black italic text-lg text-slate-900 transform -skew-x-3">{type === '個人委託' ? '委託清單 (ITEMS)' : '上架商品清單 (ITEMS)'}</h4>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowAiImport(!showAiImport)} className="text-xs px-3 py-1 flex items-center gap-1 bg-purple-600 text-white rounded font-black border-2 border-purple-800 hover:bg-purple-700 transition-all shadow-[1px_1px_0px_0px_rgba(76,29,149,1)]"><Sparkles size={14} /> AI 智慧匯入</button>
                        <button type="button" onClick={addItem} className="text-sm font-black px-3 py-1 bg-yellow-400 text-slate-900 rounded border-2 border-slate-900 hover:bg-yellow-500 transition-all">+ 新增品項</button>
                    </div>
                </div>

                {showAiImport && (
                    <div className="mb-4 bg-white p-3 rounded-lg border-2 border-purple-600 animate-in fade-in slide-in-from-top-2 shadow-md">
                        <label className="text-xs font-black text-purple-700 mb-1 block italic">貼上商品清單文字</label>
                        <textarea className="w-full border-2 border-slate-900 rounded p-2 text-sm mb-2 h-24 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="請貼上商品清單..." value={importText} onChange={e => setImportText(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAiImport(false)} className="text-slate-600 text-xs hover:text-slate-900 px-2 font-bold">取消</button>
                            <button type="button" onClick={handleAiImport} disabled={aiLoading || !importText} className="bg-purple-600 text-white text-xs px-3 py-1 rounded font-black hover:bg-purple-700 disabled:opacity-50 transition-all">{aiLoading ? "分析中..." : "開始匯入"}</button>
                        </div>
                    </div>
                )}
                
                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border-2 border-slate-900 relative flex gap-3 items-start shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                            <div className="flex flex-col gap-1 justify-center pt-1">
                                <span className="text-xl font-black text-red-600 italic leading-none">{idx + 1}.</span>
                                <button type="button" onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowUp size={16} /></button>
                                <button type="button" onClick={() => moveItem(idx, 'down')} disabled={idx === items.length-1} className="text-slate-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowDown size={16} /></button>
                            </div>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                                <div className="col-span-12 sm:col-span-7"><input className="w-full border-2 border-slate-900 p-2 rounded text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 font-bold placeholder:font-normal" placeholder="品名" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} required /></div>
                                <div className="col-span-12 sm:col-span-5 relative">
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"><LinkIcon size={14} /></div>
                                    <input className="w-full border-2 border-slate-300 p-2 pl-7 rounded text-sm text-slate-700 focus:ring-2 focus:ring-yellow-400" placeholder="圖片連結" value={item.image || ''} onChange={e => updateItem(item.id, 'image', e.target.value)} />
                                    {item.image && <div className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded border-2 border-slate-900 bg-slate-100 overflow-hidden shadow"><img src={item.image} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} /></div>}
                                </div>
                                <div className="col-span-6 sm:col-span-5"><input className="w-full border-2 border-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-yellow-400" placeholder="規格" value={item.spec} onChange={e => updateItem(item.id, 'spec', e.target.value)} /></div>
                                <div className="col-span-3 sm:col-span-4"><input className="w-full border-2 border-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-yellow-400 font-black text-red-600" type="number" placeholder="日幣" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} required /></div>
                                <div className="col-span-3 sm:col-span-3"><input className="w-full border-2 border-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-yellow-400" type="number" placeholder="上限" value={item.limit} onChange={e => updateItem(item.id, 'limit', e.target.value)} /></div>
                            </div>
                            <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-800 p-1 mt-1 shrink-0"><X size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 動作按鈕 */}
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-100 font-bold italic transition-all"><X size={16} className="inline mr-1" /> 取消</button>
                <button type="submit" className="px-6 py-2 rounded bg-slate-900 text-yellow-400 border-2 border-slate-900 hover:bg-slate-700 font-black italic shadow-[4px_4px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all"><Save size={16} className="inline mr-1" /> {submitLabel}</button>
            </div>
        </form>
    );
}