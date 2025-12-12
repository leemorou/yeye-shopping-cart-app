// src/components/PersonalRequestForm.jsx
import React, { useState } from 'react';
import { Package, Link as LinkIcon, Tag, Plus, Minus, X, Save, ShoppingCart, Info } from 'lucide-react';

export default function PersonalRequestForm({ onSubmit, onCancel }) {
    // 基本資訊
    const [ipName, setIpName] = useState(''); // 委託 IP / 系列
    const [type, setType] = useState('預購'); // 預購 or 現貨
    const [sourceUrl, setSourceUrl] = useState(''); // 販售網址/文章連結
    const [note, setNote] = useState(''); // 備註

    // 商品清單 (預設一項)
    const [items, setItems] = useState([{ id: Date.now(), name: '', price: '', quantity: 1, url: '' }]);

    // --- 商品操作邏輯 ---
    const addItem = () => {
        setItems([...items, { id: Date.now(), name: '', price: '', quantity: 1, url: '' }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    // --- 提交 ---
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // 驗證
        if (!ipName.trim()) return alert("請填寫委託的 IP 或商品系列名稱！");
        if (!sourceUrl.trim()) return alert("請提供商品來源網址！");
        
        const validItems = items.filter(i => i.name.trim() && i.price);
        if (validItems.length === 0) return alert("請至少填寫一項委託商品（需包含名稱與價格）！");

        onSubmit({
            ipName,
            type,
            sourceUrl,
            note,
            items: validItems
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 font-sans text-slate-800">
            
            {/* === 區塊 1: 委託基本資訊 === */}
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                <h4 className="font-black italic text-lg text-slate-900 border-b-2 border-slate-300 pb-2 mb-3 flex items-center gap-2">
                    <Info size={20} className="text-blue-600" /> 委託情報 (INFO)
                </h4>

                <div className="space-y-4">
                    {/* IP / 系列名稱 */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-1">
                            委託 IP / 商品系列 <span className="text-red-500">*</span>
                        </label>
                        <input 
                            className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold placeholder:font-normal"
                            placeholder="例如：吉伊卡哇、咒術迴戰 懷玉玉折..."
                            value={ipName}
                            onChange={(e) => setIpName(e.target.value)}
                        />
                    </div>

                    {/* 預購 or 現貨 */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-1">
                            商品性質 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            <label className={`flex-1 cursor-pointer border-2 rounded-lg p-2 text-center font-black transition-all ${type === '預購' ? 'bg-slate-900 text-yellow-400 border-slate-900 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                                <input type="radio" className="hidden" value="預購" checked={type === '預購'} onChange={() => setType('預購')} />
                                ⏳ 預購
                            </label>
                            <label className={`flex-1 cursor-pointer border-2 rounded-lg p-2 text-center font-black transition-all ${type === '現貨' ? 'bg-green-600 text-white border-green-800 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                                <input type="radio" className="hidden" value="現貨" checked={type === '現貨'} onChange={() => setType('現貨')} />
                                ⚡ 現貨
                            </label>
                        </div>
                    </div>

                    {/* 來源網址 */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-1">
                            商品資訊來源 / 販售網址 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <LinkIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                className="w-full border-2 border-slate-900 rounded p-2 pl-9 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold placeholder:font-normal"
                                placeholder="請貼上官方推特、網站或賣場連結..."
                                value={sourceUrl}
                                onChange={(e) => setSourceUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 備註 */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-1">備註 (選填)</label>
                        <textarea 
                            className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-medium placeholder:font-normal h-20"
                            placeholder="例如：如果沒貨請通知我..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* === 區塊 2: 委託品項清單 === */}
            <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black italic text-lg text-slate-900 transform -skew-x-3 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-red-600" /> 委託清單 (ITEMS)
                    </h4>
                    <button type="button" onClick={addItem} className="text-xs font-black px-3 py-1.5 bg-yellow-400 text-slate-900 rounded border-2 border-slate-900 hover:bg-yellow-500 transition-all shadow-sm">
                        + 新增品項
                    </button>
                </div>

                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border-2 border-slate-900 relative shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] animate-in fade-in slide-in-from-bottom-1">
                            {/* 標題列：編號 + 刪除 */}
                            <div className="flex justify-between items-center mb-2 border-b border-dashed border-slate-200 pb-1">
                                <span className="text-xs font-black text-slate-400 italic">ITEM #{idx + 1}</span>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                                {/* 品名 */}
                                <div className="col-span-8">
                                    <label className="text-[10px] font-bold text-slate-500">品名 <span className="text-red-500">*</span></label>
                                    <input 
                                        className="w-full border-2 border-slate-200 rounded p-1.5 text-sm font-bold focus:border-slate-900 focus:ring-0" 
                                        placeholder="例如：小八娃娃 S號"
                                        value={item.name}
                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    />
                                </div>
                                {/* 日幣單價 */}
                                <div className="col-span-4">
                                    <label className="text-[10px] font-bold text-slate-500">日幣單價 <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number"
                                        className="w-full border-2 border-slate-200 rounded p-1.5 text-sm font-black text-red-600 focus:border-slate-900 focus:ring-0" 
                                        placeholder="¥"
                                        value={item.price}
                                        onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                                    />
                                </div>
                                {/* 數量 */}
                                <div className="col-span-4 sm:col-span-3">
                                    <label className="text-[10px] font-bold text-slate-500">數量</label>
                                    <div className="flex items-center">
                                        <button type="button" onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} className="bg-slate-200 p-1 rounded-l border-y-2 border-l-2 border-slate-200 hover:bg-slate-300"><Minus size={12}/></button>
                                        <input 
                                            type="number"
                                            className="w-full text-center border-y-2 border-slate-200 p-1 text-sm font-bold h-[30px]" 
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <button type="button" onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)} className="bg-slate-200 p-1 rounded-r border-y-2 border-r-2 border-slate-200 hover:bg-slate-300"><Plus size={12}/></button>
                                    </div>
                                </div>
                                {/* 商品網址 (選填) */}
                                <div className="col-span-8 sm:col-span-9">
                                    <label className="text-[10px] font-bold text-slate-500">該品項網址 (若與主來源不同)</label>
                                    <input 
                                        className="w-full border-2 border-slate-200 rounded p-1.5 text-sm text-slate-500 focus:border-slate-900 focus:ring-0" 
                                        placeholder="http://..."
                                        value={item.url}
                                        onChange={(e) => updateItem(item.id, 'url', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* === 底部按鈕 === */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-100 font-bold italic transition-all">
                    <X size={16} className="inline mr-1" /> 取消
                </button>
                <button type="submit" className="px-6 py-2 rounded bg-purple-600 text-white border-2 border-purple-800 hover:bg-purple-700 font-black italic shadow-[4px_4px_0px_0px_rgba(76,29,149,1)] active:translate-y-0.5 active:shadow-none transition-all">
                    <Save size={16} className="inline mr-1" /> 送出委託
                </button>
            </div>
        </form>
    );
}