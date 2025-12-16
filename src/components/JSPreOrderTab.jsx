// src/components/JSPreOrderTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock3, ExternalLink, DollarSign, Truck, Save, 
    Camera, Calculator, RefreshCcw, ArrowDown 
} from 'lucide-react';
// ★ 補上缺少的 Firebase 函式
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // 請確認這個路徑指向您的 firebase 設定檔

const ORDER_STAGES = [
    "搶購中", "搶購完畢", "商品收款", "官方出貨", "抵台", "二補收款", "出貨", "結案"
];

const JS_IMAGES = [
    "https://pbs.twimg.com/media/G8MiWocaEAAYWbC?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MiYLNbIAA_YJg?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MiZktakAAvzHC?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8Mis25acAAqfys?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MivlbakAA4A73?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MixoiaAAAyEGE?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8Mi4L9b0AAPNmS?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8Mi6X_bwAAkrMd?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MjC5vbgAE_hJg?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MjIZ0bwAAEAhT?format=jpg&name=large"
];

export default function JSPreOrderTab({ currentUser, isAdmin, onImageClick }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({
        exchangeRate: 0.24,
        totalShippingJPY: 0,
        status: '搶購中'
    });
    const [loading, setLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false); 

    // 讀取資料 (Firestore) & 自動排序
    useEffect(() => {
        setLoading(true);
        // 路徑設定
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main");
        
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // ★ 自動排序邏輯 (Group by Name)
                const rawList = data.orders || [];
                const sortedList = rawList.sort((a, b) => {
                    const nameCompare = a.buyer.localeCompare(b.buyer);
                    if (nameCompare !== 0) return nameCompare;
                    return a.id - b.id;
                });

                setOrders(sortedList);
                setSettings(data.settings || { exchangeRate: 0.24, totalShippingJPY: 0, status: '搶購中' });
            } else {
                setOrders([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching data:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // 儲存資料
    const handleSave = async () => {
        try {
            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main"), {
                orders,
                settings,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || 'Unknown'
            });
            setIsDirty(false);
            alert("儲存成功！");
        } catch (e) {
            console.error("Save error:", e);
            alert("儲存失敗");
        }
    };

    const handleOrderChange = (id, field, value) => {
        if (!isAdmin) return;
        setOrders(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
        setIsDirty(true);
    };

    const batchUpdatePrice = (ip, name, newPrice) => {
        if (!isAdmin) return;
        if (!confirm(`確定要將所有「${ip} ${name}」的價格更新為 ¥${newPrice} 嗎？`)) return;
        setOrders(prev => prev.map(item => 
            (item.ip === ip && item.name === name) ? { ...item, price: Number(newPrice) } : item
        ));
        setIsDirty(true);
    };

    // 計算邏輯
    const totalBoughtQuantity = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);
    const shippingPerUnitJPY = useMemo(() => totalBoughtQuantity > 0 ? (settings.totalShippingJPY / totalBoughtQuantity) : 0, [totalBoughtQuantity, settings.totalShippingJPY]);
    const summary = useMemo(() => {
        const report = {};
        orders.forEach(item => {
            if (!report[item.buyer]) {
                report[item.buyer] = { items: [], totalItemPriceJPY: 0, totalShippingShareJPY: 0, count: 0 };
            }
            if (item.isBought) {
                const itemTotalJPY = item.price * item.quantity;
                const shippingShareJPY = shippingPerUnitJPY * item.quantity;
                report[item.buyer].items.push(item);
                report[item.buyer].totalItemPriceJPY += itemTotalJPY;
                report[item.buyer].totalShippingShareJPY += shippingShareJPY;
                report[item.buyer].count += item.quantity;
            }
        });
        return report;
    }, [orders, shippingPerUnitJPY]);

    if (loading) return <div className="p-10 text-center font-bold text-slate-500">載入數據中...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Banner & Status */}
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2 flex items-center gap-2">
                            JS ONLINE 先行
                            {isDirty && <span className="text-sm bg-red-500 text-white px-2 py-1 rounded-full not-italic">未儲存</span>}
                        </h3>
                        <div className="space-y-1 font-bold text-white text-sm">
                            <p className="flex items-center gap-2"><Clock3 size={16} className="text-yellow-400"/> 販售期間：12/17 11:00 ～ 12/21 16:00</p>
                            <a href="https://jumpshop-online.com/collections/jf2026" target="_blank" rel="noreferrer" className="flex items-center gap-2 underline hover:text-yellow-300"><ExternalLink size={16} /> 前往商店頁面</a>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-4 border-slate-700 text-slate-900 w-full md:w-auto shadow-lg">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xs uppercase bg-slate-200 px-1 rounded">STATUS</span>
                                {isAdmin ? (
                                    <select 
                                        value={settings.status}
                                        onChange={(e) => { setSettings({...settings, status: e.target.value}); setIsDirty(true); }}
                                        className="font-bold border-b-2 border-slate-300 focus:border-yellow-400 outline-none bg-transparent"
                                    >
                                        {ORDER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                ) : (
                                    <span className="font-black text-purple-600">{settings.status}</span>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block">匯率 (JPY→TWD)</label>
                                    <div className="flex items-center font-black">
                                        <DollarSign size={14} className="text-slate-400"/>
                                        {isAdmin ? (
                                            <input 
                                                type="number" step="0.001"
                                                value={settings.exchangeRate}
                                                onChange={(e) => { setSettings({...settings, exchangeRate: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                                                className="w-20 border-b-2 border-slate-300 focus:border-yellow-400 outline-none text-right"
                                            />
                                        ) : (
                                            <span>{settings.exchangeRate}</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block">總運費 (JPY)</label>
                                    <div className="flex items-center font-black">
                                        <Truck size={14} className="text-slate-400"/>
                                        {isAdmin ? (
                                            <input 
                                                type="number"
                                                value={settings.totalShippingJPY}
                                                onChange={(e) => { setSettings({...settings, totalShippingJPY: parseFloat(e.target.value)||0}); setIsDirty(true); }}
                                                className="w-20 border-b-2 border-slate-300 focus:border-yellow-400 outline-none text-right"
                                            />
                                        ) : (
                                            <span>{settings.totalShippingJPY}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {isAdmin && (
                                <button onClick={handleSave} className="w-full bg-slate-900 text-yellow-400 font-black py-1.5 rounded hover:bg-slate-800 flex items-center justify-center gap-2 text-sm mt-1">
                                    <Save size={14}/> 儲存設定
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                 <h4 className="font-black text-sm text-slate-500 mb-3 flex items-center gap-2"><Camera size={16}/> 商品預覽 (點擊放大)</h4>
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {JS_IMAGES.map((url, idx) => (
                        <div key={idx} onClick={() => onImageClick(url)} className="w-20 h-20 shrink-0 bg-white rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform cursor-pointer relative group">
                             <img src={url} alt={`Item ${idx}`} className="w-full h-full object-cover"/>
                             <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    ))}
                 </div>
            </div>

            {/* Calculation Table */}
            <div className="bg-white border-4 border-slate-900 rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_#FACC15]">
                <div className="bg-slate-100 p-4 border-b-4 border-slate-900 flex justify-between items-center">
                    <h4 className="font-black text-xl text-slate-900 flex items-center gap-2"><Calculator size={20}/> 購買登記表</h4>
                    <div className="text-xs font-bold text-slate-500 flex flex-col md:flex-row gap-2 md:gap-4 items-end md:items-center">
                        <span>有效商品數: <span className="text-slate-900 text-lg">{totalBoughtQuantity}</span></span>
                        <span>單件運費: <span className="text-slate-900 text-lg">¥{shippingPerUnitJPY.toFixed(1)}</span></span>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-yellow-400 text-xs uppercase tracking-wider font-black">
                                <th className="p-3 w-20">買家</th>
                                <th className="p-3">商品 (IP / 名稱)</th>
                                <th className="p-3 text-center w-16">數量</th>
                                <th className="p-3 text-right w-28">單價(JPY)</th>
                                <th className="p-3 text-center w-20">買到?</th>
                                {isAdmin && <th className="p-3 text-center w-24">操作</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-bold text-sm">
                            {orders.map((item) => (
                                <tr key={item.id} className={`${item.isBought ? 'bg-white' : 'bg-red-50 opacity-60'} hover:bg-yellow-50 transition-colors`}>
                                    <td className="p-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-900 text-xs">
                                            {item.buyer.charAt(0)}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className="inline-block bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded mr-2 border border-slate-300">{item.ip}</span>
                                        <span className={item.isBought ? "text-slate-900" : "text-slate-400 line-through decoration-2"}>{item.name}</span>
                                    </td>
                                    <td className="p-3 text-center text-lg">{item.quantity}</td>
                                    <td className="p-3 text-right">
                                        {isAdmin ? (
                                            <input 
                                                type="number" 
                                                value={item.price}
                                                onChange={(e) => handleOrderChange(item.id, 'price', e.target.value)}
                                                className="w-20 text-right border-b border-slate-300 focus:border-yellow-500 outline-none bg-transparent"
                                                placeholder="0"
                                            />
                                        ) : (
                                            <span className="font-mono">¥{item.price}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={item.isBought}
                                            disabled={!isAdmin}
                                            onChange={(e) => handleOrderChange(item.id, 'isBought', e.target.checked)}
                                            className="w-5 h-5 rounded border-2 border-slate-400 text-yellow-400 focus:ring-yellow-400 disabled:opacity-50"
                                        />
                                    </td>
                                    {isAdmin && (
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => batchUpdatePrice(item.ip, item.name, item.price)}
                                                className="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs"
                                                title="將此價格套用到所有同名商品"
                                            >
                                                <RefreshCcw size={14}/>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {isAdmin && isDirty && (
                    <div className="p-4 bg-yellow-50 border-t-2 border-slate-200 flex justify-center">
                        <button onClick={handleSave} className="bg-red-500 text-white font-black px-8 py-2 rounded shadow-lg hover:bg-red-600 animate-pulse">
                            有未儲存的變更 - 點此儲存
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(summary).map(([buyer, data]) => {
                    const totalJPY = data.totalItemPriceJPY + data.totalShippingShareJPY;
                    const totalTWD = Math.ceil(totalJPY * settings.exchangeRate);
                    
                    return (
                        <div key={buyer} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[4px_4px_0px_0px_#6b21a8] relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign size={100} />
                            </div>
                            
                            <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2 relative z-10">
                                <h3 className="text-2xl font-black italic text-slate-900">{buyer}</h3>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400">TOTAL</p>
                                    <span className="text-3xl font-black text-purple-600">NT$ {totalTWD}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm font-bold text-slate-600 relative z-10">
                                <div className="flex justify-between">
                                    <span>商品總額 ({data.count}點)</span>
                                    <span>¥{data.totalItemPriceJPY.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>運費分攤 (每件¥{shippingPerUnitJPY.toFixed(0)})</span>
                                    <span>¥{data.totalShippingShareJPY.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-800">
                                    <span>總計 (JPY)</span>
                                    <span>¥{Math.ceil(totalJPY).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-300">
                                <details className="group/detail">
                                    <summary className="text-xs font-black text-slate-500 cursor-pointer hover:text-slate-900 list-none flex justify-between items-center">
                                        <span>查看購買明細</span>
                                        <ArrowDown size={12} className="group-open/detail:rotate-180 transition-transform"/>
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                                        {data.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-medium text-slate-600 bg-slate-50 p-1.5 rounded">
                                                <span className="truncate w-2/3">{i.ip} {i.name} x{i.quantity}</span>
                                                <span>¥{i.price * i.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}