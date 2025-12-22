// src/components/AdminJSPostTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Save, RefreshCcw, AlertTriangle, Scale, CheckSquare, Plus, Trash2, User
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ORDER_STAGES = ["下單中", "下單完畢", "商品收款", "官方出貨", "抵台", "二補收款", "出貨", "結案"];
const RATE_PER_KG = 250; 

// 🟢 英雄對照表
const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function AdminJSPostTab({ currentUser }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({ 
        exchangeRate: 0.207, 
        totalShippingJPY: 0, 
        status: '下單中',
        secondPayment: { weights: {}, boxWeight: 0 } 
    });
    const [loading, setLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    // 🟢 快速新增暫存狀態
    const [newItem, setNewItem] = useState({ 
        name: '', buyer: '', price: '', quantity: 1, img: '', ip: 'JF26' 
    });

    useEffect(() => {
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_post_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setOrders(data.orders || []);
                setSettings({
                    exchangeRate: 0.207,
                    totalShippingJPY: 0,
                    status: '下單中',
                    secondPayment: { weights: {}, boxWeight: 0 },
                    ...data.settings
                });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleAddItem = () => {
        if (!newItem.name || !newItem.buyer || !newItem.price) {
            alert("請完整選擇買家並填寫商品資訊");
            return;
        }
        const orderToAdd = {
            ...newItem,
            id: Date.now(),
            price: Number(newItem.price),
            quantity: Number(newItem.quantity),
            isBought: true,
            paymentStatus: '未收款',
            shippingPaymentStatus: '未收款',
            createdAt: new Date().toISOString()
        };
        setOrders(prev => [...prev, orderToAdd]);
        setNewItem({ ...newItem, name: '', price: '', quantity: 1, img: '' }); // 保留買家，方便連續新增
        setIsDirty(true);
    };

    const handleOrderChange = (id, field, value) => {
        setOrders(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_post_calc_data", "main"), {
                orders,
                settings,
                updatedAt: new Date().toISOString(),
            });
            setIsDirty(false);
            alert("資料儲存成功！");
        } catch (e) { alert("儲存失敗：" + e.message); }
    };

    const batchUpdateUserStatus = (buyerName, field, status) => {
        setOrders(prev => prev.map(item => item.buyer === buyerName ? { ...item, [field]: status } : item));
        setIsDirty(true);
    };

    const uniqueBoughtItems = useMemo(() => {
        const seen = new Set();
        return orders.filter(o => o.isBought && !seen.has(o.name) && seen.add(o.name));
    }, [orders]);

    const totalBoughtQty = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);

    if (loading) return <div className="p-10 text-center font-black text-slate-400">載入中...</div>;

    return (
        <div className="space-y-6">
            {/* 1. 控制台與重量設定 */}
            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#4f46e5]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase text-indigo-600">進度</label>
                        <select value={settings.status} onChange={(e) => {setSettings({...settings, status:e.target.value}); setIsDirty(true);}} className="w-full font-bold border-2 border-slate-200 rounded-lg p-2 bg-white">
                            {ORDER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">匯率</label>
                        <input type="number" step="0.001" value={settings.exchangeRate} onChange={(e) => {setSettings({...settings, exchangeRate:parseFloat(e.target.value)||0}); setIsDirty(true);}} className="w-full font-mono font-bold border-2 border-slate-200 rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">日運 (JPY)</label>
                        <input type="number" value={settings.totalShippingJPY} onChange={(e) => {setSettings({...settings, totalShippingJPY:parseFloat(e.target.value)||0}); setIsDirty(true);}} className="w-full font-mono font-bold border-2 border-slate-200 rounded-lg p-2" />
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleSave} disabled={!isDirty} className={`w-full py-2.5 rounded-xl font-black transition-all ${isDirty ? 'bg-indigo-600 text-white shadow-[4px_4px_0px_0px_#1e1b4b]' : 'bg-slate-100 text-slate-300'}`}>儲存變更</button>
                    </div>
                </div>

                <div className="border-t-2 border-slate-100 pt-6">
                    <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase italic text-indigo-600"><Scale size={18}/> 重量分攤</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase">包材重量 (kg)</label>
                            <input type="number" step="0.01" value={settings.secondPayment.boxWeight} onChange={e => {setSettings({...settings, secondPayment:{...settings.secondPayment, boxWeight:e.target.value}}); setIsDirty(true);}} className="w-full border-2 border-slate-200 rounded-lg p-2 font-mono font-black" />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 max-h-40 overflow-y-auto">
                            <label className="block text-xs font-black text-slate-500 mb-3 uppercase">單品重 (kg)</label>
                            <div className="space-y-2">
                                {uniqueBoughtItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                                        <span className="flex-1 text-[11px] font-bold truncate">{item.name}</span>
                                        <input type="number" step="0.001" value={settings.secondPayment.weights[item.name] || ''} onChange={e => {
                                            const newWeights = { ...settings.secondPayment.weights, [item.name]: e.target.value };
                                            setSettings({...settings, secondPayment: {...settings.secondPayment, weights: newWeights}});
                                            setIsDirty(true);
                                        }} className="w-16 text-right font-mono text-xs border-b" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 🟢 快速新增 (改用 Select) */}
            <div className="bg-indigo-50 p-4 rounded-2xl border-4 border-dashed border-indigo-300">
                <h4 className="text-xs font-black text-indigo-600 mb-3 uppercase flex items-center gap-1"><Plus size={14}/> 快速手動新增</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <select 
                        className="p-2 border-2 border-slate-900 rounded-lg font-bold text-sm bg-white"
                        value={newItem.buyer}
                        onChange={e => setNewItem({...newItem, buyer: e.target.value})}
                    >
                        <option value="">-- 選擇英雄 --</option>
                        {Object.values(USER_MAPPING).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <input placeholder="商品名稱" className="p-2 border-2 border-slate-900 rounded-lg font-bold text-sm" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} />
                    <input type="number" placeholder="日幣單價" className="p-2 border-2 border-slate-900 rounded-lg font-bold text-sm" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} />
                    <input type="number" placeholder="數量" className="p-2 border-2 border-slate-900 rounded-lg font-bold text-sm" value={newItem.quantity} onChange={e=>setNewItem({...newItem, quantity: e.target.value})} />
                    <input placeholder="圖片連結" className="p-2 border-2 border-slate-900 rounded-lg font-bold text-sm" value={newItem.img} onChange={e=>setNewItem({...newItem, img: e.target.value})} />
                    <button onClick={handleAddItem} className="bg-indigo-600 text-white font-black rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-[2px_2px_0px_0px_#000]">
                        新增
                    </button>
                </div>
            </div>

            {/* 3. 🟢 快速收款區塊 (優化佈局避免溢出) */}
            <div className="bg-slate-900 p-5 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#ccc]">
                <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="text-yellow-400" size={20}/>
                    <h4 className="text-white font-black italic">HERO 快速對帳面板</h4>
                </div>
                {/* 改用 Grid 佈局，自動換行 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from(new Set(orders.map(o => o.buyer))).sort().map(buyer => (
                        <div key={buyer} className="bg-slate-800 border border-slate-700 p-2 rounded-xl flex flex-col gap-2">
                            <div className="text-yellow-400 font-black text-center border-b border-slate-700 pb-1 text-sm">{buyer}</div>
                            <div className="grid grid-cols-2 gap-1">
                                <button onClick={() => batchUpdateUserStatus(buyer, 'paymentStatus', '已收款')} className="text-[10px] bg-green-600 text-white py-1 rounded font-black hover:bg-green-500 transition-colors">商品</button>
                                <button onClick={() => batchUpdateUserStatus(buyer, 'shippingPaymentStatus', '已收款')} className="text-[10px] bg-purple-600 text-white py-1 rounded font-black hover:bg-purple-500 transition-colors">二補</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. 訂單清單表格 */}
            <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#0f172a]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="p-4">買家</th>
                                <th className="p-4">內容</th>
                                <th className="p-4 text-center">收款</th>
                                <th className="p-4 text-center">二補</th>
                                <th className="p-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold divide-y-2 divide-slate-50">
                            {orders.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <select 
                                            value={item.buyer} 
                                            onChange={e => handleOrderChange(item.id, 'buyer', e.target.value)}
                                            className="bg-transparent font-black text-indigo-600 outline-none cursor-pointer"
                                        >
                                            {Object.values(USER_MAPPING).map(name => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={item.img || 'https://placehold.co/40x40?text=JF'} className="w-10 h-10 rounded border-2 border-slate-900 object-cover" alt="" />
                                            <div>
                                                <div className="truncate w-40 text-slate-800">{item.name}</div>
                                                <div className="text-[10px] text-slate-400">¥{item.price} x {item.quantity}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <select value={item.paymentStatus} onChange={e=>handleOrderChange(item.id, 'paymentStatus', e.target.value)} className={`text-[10px] p-1 border-2 rounded font-black ${item.paymentStatus==='已收款'?'bg-green-50 border-green-500 text-green-700':'bg-white border-red-200 text-red-500'}`}>
                                            <option value="未收款">未收款</option>
                                            <option value="已收款">已收款</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <select value={item.shippingPaymentStatus} onChange={e=>handleOrderChange(item.id, 'shippingPaymentStatus', e.target.value)} className={`text-[10px] p-1 border-2 rounded font-black ${item.shippingPaymentStatus==='已收款'?'bg-purple-50 border-purple-500 text-purple-700':'bg-white border-slate-200 text-slate-400'}`}>
                                            <option value="未收款">未收款</option>
                                            <option value="已收款">已收款</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={()=>setOrders(orders.filter(o=>o.id!==item.id)) || setIsDirty(true)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDirty && (
                <div className="fixed bottom-10 right-10 flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-white animate-bounce z-50 font-black italic">
                    <AlertTriangle size={24}/> UNSAVED CHANGES!
                </div>
            )}
        </div>
    );
}