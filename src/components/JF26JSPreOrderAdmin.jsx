import React, { useState, useEffect, useMemo } from 'react';
import { 
    Save, Calculator, RefreshCcw, DollarSign, Truck, 
    CheckCircle, XCircle, AlertTriangle 
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ORDER_STAGES = ["搶購中", "搶購完畢", "商品收款", "官方出貨", "抵台", "二補收款", "出貨", "結案"];

export default function JSAdminManager({ currentUser }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({ exchangeRate: 0.24, totalShippingJPY: 0, status: '搶購中' });
    const [loading, setLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    // 1. 監聽與讀取
    useEffect(() => {
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.orders || [];
                // 管理介面建議按買家排序，方便對帳
                const sortedList = rawList.sort((a, b) => a.buyer.localeCompare(b.buyer) || a.id - b.id);
                setOrders(sortedList);
                setSettings(data.settings || { exchangeRate: 0.24, totalShippingJPY: 0, status: '搶購中' });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 2. 核心編輯邏輯
    const handleOrderChange = (id, field, value) => {
        setOrders(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        setIsDirty(true);
    };

    const batchUpdatePrice = (ip, name, newPrice) => {
        if (!confirm(`確定要將所有「${ip} ${name}」的價格更新為 ¥${newPrice} 嗎？`)) return;
        setOrders(prev => prev.map(item => (item.ip === ip && item.name === name) ? { ...item, price: Number(newPrice) } : item));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main"), {
                orders,
                settings,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || '葉葉'
            });
            setIsDirty(false);
            alert("後台數據儲存成功！");
        } catch (e) {
            alert("儲存失敗：" + e.message);
        }
    };

    // 3. 計算屬性
    const totalBoughtQuantity = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);
    const shippingPerUnitJPY = useMemo(() => totalBoughtQuantity > 0 ? (settings.totalShippingJPY / totalBoughtQuantity) : 0, [totalBoughtQuantity, settings.totalShippingJPY]);

    if (loading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse">加載作戰資料中...</div>;

    return (
        <div className="space-y-6 p-4 bg-slate-50 min-h-screen">
            {/* 頂部管理工具列 */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">訂單階段</label>
                        <select 
                            value={settings.status} 
                            onChange={(e) => { setSettings({...settings, status: e.target.value}); setIsDirty(true); }}
                            className="w-full font-bold border-2 border-slate-200 rounded-lg px-2 py-1.5 focus:border-yellow-400 outline-none"
                        >
                            {ORDER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">當前匯率</label>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2 text-slate-400" size={14} />
                            <input 
                                type="number" step="0.001" value={settings.exchangeRate}
                                onChange={(e) => { setSettings({...settings, exchangeRate: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                                className="w-full pl-7 font-mono font-bold border-2 border-slate-200 rounded-lg py-1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">總運費 (JPY)</label>
                        <div className="relative">
                            <Truck className="absolute left-2 top-2 text-slate-400" size={14} />
                            <input 
                                type="number" value={settings.totalShippingJPY}
                                onChange={(e) => { setSettings({...settings, totalShippingJPY: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                                className="w-full pl-7 font-mono font-bold border-2 border-slate-200 rounded-lg py-1"
                            />
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2 text-white flex flex-col justify-center items-center">
                        <span className="text-[10px] text-slate-400">每件運費預估</span>
                        <span className="text-sm font-black text-yellow-400">¥ {shippingPerUnitJPY.toFixed(1)}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`shrink-0 flex items-center gap-2 px-8 py-3 rounded-xl font-black text-lg transition-all ${isDirty ? 'bg-red-500 text-white shadow-[4px_4px_0px_0px_#7f1d1d] hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    <Save size={20} /> 儲存變更
                </button>
            </div>

            {/* 編輯表格區 */}
            <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#0f172a]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-white text-[10px] uppercase font-black">
                            <th className="p-4 w-24">買家</th>
                            <th className="p-4">商品細節</th>
                            <th className="p-4 text-center w-20">數量</th>
                            <th className="p-4 text-right w-32">日幣單價</th>
                            <th className="p-4 text-center w-24">狀態</th>
                            <th className="p-4 text-center w-16">批次</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-100">
                        {orders.map((item) => (
                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.isBought && 'bg-red-50/50'}`}>
                                <td className="p-4">
                                    <span className="font-black text-slate-900 bg-yellow-400/30 px-2 py-1 rounded">{item.buyer}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold">{item.ip}</span>
                                        <span className="font-bold text-slate-700">{item.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center font-mono font-black">{item.quantity}</td>
                                <td className="p-4">
                                    <input 
                                        type="number" value={item.price}
                                        onChange={(e) => handleOrderChange(item.id, 'price', e.target.value)}
                                        className="w-full text-right font-mono font-bold bg-transparent border-b-2 border-dotted border-slate-300 focus:border-slate-900 outline-none"
                                    />
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleOrderChange(item.id, 'isBought', !item.isBought)}
                                        className={`flex items-center gap-1 mx-auto px-2 py-1 rounded font-black text-xs border-2 transition-all ${item.isBought ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-400'}`}
                                    >
                                        {item.isBought ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                                        {item.isBought ? '已買到' : '未買到'}
                                    </button>
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => batchUpdatePrice(item.ip, item.name, item.price)}
                                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                                        title="同品項批次改價"
                                    >
                                        <RefreshCcw size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isDirty && (
                <div className="fixed bottom-10 right-10 flex items-center gap-3 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white animate-bounce">
                    <AlertTriangle size={24} />
                    <span className="font-black text-lg">記得儲存變更！</span>
                </div>
            )}
        </div>
    );
}