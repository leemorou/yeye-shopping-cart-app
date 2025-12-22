// src/components/JF26JSPreOrderAdmin.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Save, Calculator, RefreshCcw, DollarSign, Truck, 
    CheckCircle, XCircle, AlertTriangle, PackageCheck, Scale, Info, CheckSquare
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ORDER_STAGES = ["搶購中", "搶購完畢", "商品收款", "官方出貨", "抵台", "二補收款", "出貨", "結案"];
const RATE_PER_KG = 250; // 國際運費費率

export default function JSAdminManager({ currentUser }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({ 
        exchangeRate: 0.24, 
        totalShippingJPY: 0, 
        status: '搶購中',
        intlShippingTWD: 0, 
        secondPayment: { weights: {}, boxWeight: 0, minChargeDiff: 0 } // 🟢 新增二補重量結構
    });
    const [loading, setLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    // 1. 監聽與讀取
    useEffect(() => {
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.orders || [];
                const sortedList = rawList.sort((a, b) => a.buyer.localeCompare(b.buyer) || a.id - b.id);
                setOrders(sortedList);
                setSettings({
                    exchangeRate: 0.24,
                    totalShippingJPY: 0,
                    status: '搶購中',
                    intlShippingTWD: 0,
                    secondPayment: { weights: {}, boxWeight: 0, minChargeDiff: 0 },
                    ...data.settings
                });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 2. 編輯邏輯
    const handleOrderChange = (id, field, value) => {
        setOrders(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        setIsDirty(true);
    };

    // 更新特定商品的重量
    const handleWeightChange = (itemId, weight) => {
        setSettings(prev => ({
            ...prev,
            secondPayment: {
                ...prev.secondPayment,
                weights: { ...prev.secondPayment.weights, [itemId]: weight }
            }
        }));
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
            alert("JF26 資料儲存成功！");
        } catch (e) {
            alert("儲存失敗：" + e.message);
        }
    };

    const batchUpdateUserStatus = (buyerName, field, status) => {
    if (!confirm(`確定要將 ${buyerName} 的所有商品標記為【${status}】嗎？`)) return;
    
    setOrders(prev => prev.map(item => 
        item.buyer === buyerName ? { ...item, [field]: status } : item
    ));
    setIsDirty(true);
    };

    // 3. 計算邏輯
    // 整理所有「已買到」的唯一商品種類
    const uniqueBoughtItems = useMemo(() => {
        const seen = new Set();
        return orders.filter(o => {
            if (o.isBought && !seen.has(o.name)) {
                seen.add(o.name);
                return true;
            }
            return false;
        });
    }, [orders]);

    const totalBoughtQty = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);

    if (loading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse">同步 JF26 資料中...</div>;

    return (
        <div className="space-y-6 p-4">
            {/* 🟢 頂部控制台：包含基礎設定與二補重量設定 */}
            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">進度狀態</label>
                        <select 
                            value={settings.status} 
                            onChange={(e) => { setSettings({...settings, status: e.target.value}); setIsDirty(true); }}
                            className="w-full font-bold border-2 border-slate-200 rounded-lg px-2 py-1.5 focus:border-yellow-400 outline-none bg-white"
                        >
                            {ORDER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">匯率</label>
                        <input 
                            type="number" step="0.001" value={settings.exchangeRate}
                            onChange={(e) => { setSettings({...settings, exchangeRate: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                            className="w-full font-mono font-bold border-2 border-slate-200 rounded-lg py-1.5 px-3"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">日本運費 (JPY)</label>
                        <input 
                            type="number" value={settings.totalShippingJPY}
                            onChange={(e) => { setSettings({...settings, totalShippingJPY: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                            className="w-full font-mono font-bold border-2 border-slate-200 rounded-lg py-1.5 px-3"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black transition-all ${isDirty ? 'bg-red-500 text-white shadow-[4px_4px_0px_0px_#7f1d1d] hover:-translate-y-1' : 'bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-slate-200'}`}
                        >
                            <Save size={18} /> 儲存變更
                        </button>
                    </div>
                </div>

                {/* 🟢 JF26 詳細重量計算區 */}
                <div className="border-t-2 border-slate-100 pt-6">
                    <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase italic text-blue-600">
                        <Scale size={18}/> JF26 重量控制台 (1kg = {RATE_PER_KG}元)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 左：基礎分攤 */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                                <label className="block text-xs font-black text-slate-500 mb-2 uppercase">包材總重量 (kg)</label>
                                <input 
                                    type="number" step="0.01" value={settings.secondPayment.boxWeight}
                                    onChange={e => { setSettings({...settings, secondPayment: {...settings.secondPayment, boxWeight: e.target.value}}); setIsDirty(true); }}
                                    className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 font-mono font-black text-blue-600"
                                />
                                <p className="text-[9px] text-slate-400 mt-2 italic">* 此重量產生的運費將由 {totalBoughtQty} 件商品平分</p>
                            </div>
                        </div>

                        {/* 右：各商品單重 */}
                        <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 max-h-60 overflow-y-auto">
                            <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-tighter">各商品單重設定</label>
                            <div className="space-y-2">
                                {uniqueBoughtItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 group">
                                        <span className="flex-1 text-[11px] font-bold truncate text-slate-600" title={item.name}>{item.name}</span>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" step="0.001" placeholder="0.000"
                                                value={settings.secondPayment.weights[item.name] || ''}
                                                onChange={e => {
                                                    const newWeights = { ...settings.secondPayment.weights, [item.name]: e.target.value };
                                                    setSettings({...settings, secondPayment: {...settings.secondPayment, weights: newWeights}});
                                                    setIsDirty(true);
                                                }}
                                                className="w-20 text-right font-mono font-black text-blue-600 border-b border-slate-200 outline-none text-xs"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">kg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 快速對帳控制台 */}
            {/* 🟢 快速對帳控制台 (比照事後通販優化) */}
<div className="bg-slate-900 p-5 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#ccc]">
    <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="text-yellow-400" size={20}/>
        <h4 className="text-white font-black italic tracking-tighter">HERO 快速對帳面板 (先行)</h4>
    </div>
    
    {/* 網格佈局：手機 2 欄 / 平板 4 欄 / 電腦 6 欄 */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from(new Set(orders.map(o => o.buyer))).sort().map(buyer => (
            <div key={buyer} className="bg-slate-800 border border-slate-700 p-2 rounded-xl flex flex-col gap-2 transition-all hover:border-slate-500">
                <div className="text-yellow-400 font-black text-center border-b border-slate-700 pb-1 text-sm truncate px-1">
                    {buyer}
                </div>
                <div className="grid grid-cols-2 gap-1">
                    <button 
                        onClick={() => batchUpdateUserStatus(buyer, 'paymentStatus', '已收款')}
                        className="text-[10px] bg-green-600 text-white py-1.5 rounded font-black hover:bg-green-500 active:scale-95 transition-all"
                    >
                        商品
                    </button>
                    <button 
                        onClick={() => batchUpdateUserStatus(buyer, 'shippingPaymentStatus', '已收款')}
                        className="text-[10px] bg-purple-600 text-white py-1.5 rounded font-black hover:bg-purple-500 active:scale-95 transition-all"
                    >
                        二補
                    </button>
                </div>
            </div>
        ))}
    </div>
    
    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold italic">
        <Info size={12}/> 提示：點擊按鈕會將該成員「所有」先行商品標記為已收款。
    </div>
</div>

            {/* 對帳清單表格 */}
            <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#0f172a]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                                <th className="p-4 w-24">買家</th>
                                <th className="p-4">商品</th>
                                <th className="p-4 text-center w-20">數量</th>
                                <th className="p-4 text-right w-28">單價(¥)</th>
                                <th className="p-4 text-center w-20">購入</th>
                                <th className="p-4 text-center w-32">商品收款</th>
                                <th className="p-4 text-center w-32">二補收款</th>
                                <th className="p-4 text-center w-16">批次</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100 font-bold text-sm">
                            {orders.map((item) => (
                                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.isBought && 'bg-red-50/50 opacity-60'}`}>
                                    <td className="p-4 font-black text-blue-600 italic">{item.buyer}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase">{item.ip}</span>
                                            <span className="truncate max-w-[220px]">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-mono">{item.quantity}</td>
                                    <td className="p-4">
                                        <input 
                                            type="number" value={item.price}
                                            onChange={(e) => handleOrderChange(item.id, 'price', e.target.value)}
                                            className="w-full text-right font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-slate-900 outline-none"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" checked={item.isBought}
                                            onChange={(e) => handleOrderChange(item.id, 'isBought', e.target.checked)}
                                            className="w-5 h-5 accent-slate-900"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <select 
                                            value={item.paymentStatus || '未收款'}
                                            onChange={(e) => handleOrderChange(item.id, 'paymentStatus', e.target.value)}
                                            className={`text-[10px] font-black border-2 rounded px-2 py-1 outline-none ${item.paymentStatus === '已收款' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-red-300 text-red-500'}`}
                                        >
                                            <option value="未收款">未收款</option>
                                            <option value="已收款">已收款</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <select 
                                            value={item.shippingPaymentStatus || '未收款'}
                                            onChange={(e) => handleOrderChange(item.id, 'shippingPaymentStatus', e.target.value)}
                                            className={`text-[10px] font-black border-2 rounded px-2 py-1 outline-none ${item.shippingPaymentStatus === '已收款' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-slate-50 border-slate-300 text-slate-400'}`}
                                        >
                                            <option value="未收款">未收款</option>
                                            <option value="已收款">已收款</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => batchUpdatePrice(item.ip, item.name, item.price)}
                                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded"
                                            title="同步此品項價格"
                                        >
                                            <RefreshCcw size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 未儲存警告 */}
            {isDirty && (
                <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white animate-bounce z-50">
                    <AlertTriangle size={24} />
                    <span className="font-black uppercase tracking-widest">Unsaved Changes!</span>
                </div>
            )}
        </div>
    );
}