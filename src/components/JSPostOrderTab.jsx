// src/components/JSPostOrderTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock3, ExternalLink, DollarSign, Truck, 
    Camera, Calculator, ArrowDown, Info, Scale, Plane, Search
} from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// 事後通販預設圖集 (可根據需求更改)
const POST_IMAGES = [
    "https://pbs.twimg.com/media/G8MiWocaEAAYWbC?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MiYLNbIAA_YJg?format=jpg&name=large",
    "https://pbs.twimg.com/media/G8MiZktakAAvzHC?format=jpg&name=large"
];

const RATE_PER_KG = 250; 

export default function JSPostOrderTab({ currentUser, onImageClick }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({
        exchangeRate: 0.207,
        totalShippingJPY: 0,
        status: '下單中',
        secondPayment: { weights: {}, boxWeight: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLoading(true);
        // 🟢 指向事後通販路徑：jf26_post_calc_data
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_post_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.orders || [];
                const sortedList = rawList.sort((a, b) => a.buyer.localeCompare(b.buyer));
                setOrders(sortedList);
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

    // 1. 基礎計算邏輯 (比照先行)
    const totalBoughtQuantity = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);
    const shippingPerUnitJPY = useMemo(() => totalBoughtQuantity > 0 ? (settings.totalShippingJPY / totalBoughtQuantity) : 0, [totalBoughtQuantity, settings.totalShippingJPY]);
    const boxWeight = parseFloat(settings.secondPayment?.boxWeight || 0);
    const boxCostPerItemTWD = totalBoughtQuantity > 0 ? (boxWeight * RATE_PER_KG) / totalBoughtQuantity : 0;

    // 2. 彙整買家數據
    const summary = useMemo(() => {
        const report = {};
        orders.forEach(item => {
            if (!report[item.buyer]) {
                report[item.buyer] = { 
                    items: [], totalItemPriceJPY: 0, totalShippingShareJPY: 0, 
                    totalSecondPayTWD: 0, count: 0 
                };
            }
            if (item.isBought) {
                const itemTotalJPY = item.price * item.quantity;
                const shippingShareJPY = shippingPerUnitJPY * item.quantity;
                const itemWeight = parseFloat(settings.secondPayment?.weights?.[item.name] || 0);
                const secondPayPerItem = (itemWeight * RATE_PER_KG) + boxCostPerItemTWD;
                const totalItemSecondPayTWD = secondPayPerItem * item.quantity;

                report[item.buyer].items.push({
                    ...item, weight: itemWeight, secondPaySubtotal: totalItemSecondPayTWD
                });
                report[item.buyer].totalItemPriceJPY += itemTotalJPY;
                report[item.buyer].totalShippingShareJPY += shippingShareJPY;
                report[item.buyer].totalSecondPayTWD += totalItemSecondPayTWD;
                report[item.buyer].count += item.quantity;
            }
        });
        return report;
    }, [orders, shippingPerUnitJPY, settings.secondPayment, boxCostPerItemTWD]);

    // 過濾搜尋結果
    const filteredSummary = useMemo(() => {
        return Object.entries(summary).filter(([buyer]) => 
            buyer.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [summary, searchTerm]);

    if (loading) return <div className="p-10 text-center font-bold text-slate-500 italic animate-pulse">Syncing Post-Order Intel...</div>;

    return (
        <div className="space-y-8 pb-20">
           {/* Banner & Status */}
            <div className="bg-indigo-900 text-white p-6 rounded-xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JF26 事後通販中心</h3>
                        <div className="space-y-1 font-bold text-white text-sm">
                            {/* 🟢 修正：販售期間與連結 */}
                            <p className="flex items-center gap-2">
                                <Clock3 size={16} className="text-yellow-400"/> 販售期間：12/22 09:00 ～
                            </p>
                            <a 
                                href="https://jumpshop-online.com/collections/jsol%EF%BD%B0jf2026" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center gap-2 underline hover:text-yellow-300 transition-colors"
                            >
                                <ExternalLink size={16} /> 前往商店頁面
                            </a>
                        </div>
                    </div>
                    
                    {/* 🟢 樣式還原：Mission Status 標籤 */}
                    <div className="bg-white p-4 rounded-lg border-4 border-slate-700 text-slate-900 w-full md:w-auto shadow-lg">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xs uppercase bg-slate-200 px-1 rounded tracking-tighter text-slate-800">Mission Status</span>
                                <span className="font-black text-indigo-600 italic uppercase">{settings.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block uppercase tracking-tighter">Exchange Rate</label>
                                    <div className="flex items-center font-black text-indigo-600">
                                        <DollarSign size={14}/><span>{settings.exchangeRate}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block uppercase tracking-tighter">Total Items</label>
                                    <div className="flex items-center font-black text-slate-900">
                                        <Truck size={14} className="text-slate-400 mr-1"/><span>{totalBoughtQuantity}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 商品圖集 */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                 <h4 className="font-black text-sm text-slate-500 mb-3 flex items-center gap-2"><Camera size={16}/> 事後商品預覽</h4>
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {POST_IMAGES.map((url, idx) => (
                        <div key={idx} onClick={() => onImageClick(url)} className="w-20 h-20 shrink-0 rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform cursor-pointer shadow-sm">
                             <img src={url} alt="Item" className="w-full h-full object-cover"/>
                        </div>
                    ))}
                 </div>
            </div>

            {/* 搜尋列 */}
            <div className="flex bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#0f172a]">
                <div className="p-3 bg-slate-100 border-r-4 border-slate-900 text-slate-900"><Search size={20} strokeWidth={3}/></div>
                <input 
                    className="w-full p-3 font-bold outline-none text-lg" 
                    placeholder="輸入英雄暱稱搜尋對帳單..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>

            {/* 個人卡片展示區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSummary.map(([buyer, data]) => {
                    const productTotalJPY = data.totalItemPriceJPY + data.totalShippingShareJPY;
                    const productTotalTWD = Math.ceil(productTotalJPY * settings.exchangeRate);
                    const finalGrandTotal = productTotalTWD + Math.round(data.totalSecondPayTWD);

                    return (
                        <div key={buyer} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[4px_4px_0px_0px_#4f46e5] relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4 border-b-2 border-slate-100 pb-2">
                                <h3 className="text-2xl font-black italic text-slate-900 tracking-tighter">{buyer}</h3>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Grand Total</p>
                                    <span className="text-3xl font-black text-indigo-600">NT$ {finalGrandTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1 text-sm font-bold text-slate-600">
                                    <div className="flex justify-between">
                                        <span>商品本體 ({data.count}點)</span>
                                        <span>¥{data.totalItemPriceJPY.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                                        <span>日本境內運分攤</span>
                                        <span>¥{data.totalShippingShareJPY.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 border-t border-slate-100 pt-1">
                                        <span>本體台幣小計</span>
                                        <span className="font-black">NT$ {productTotalTWD.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 space-y-1">
                                    <div className="flex justify-between text-sm font-black text-indigo-800">
                                        <span className="flex items-center gap-1"><Plane size={14}/> 國際運費二補</span>
                                        <span>NT$ {Math.round(data.totalSecondPayTWD).toLocaleString()}</span>
                                    </div>
                                    <p className="text-[9px] text-indigo-400 leading-tight italic">含品項重量運費 + 包材費分攤</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <details className="group/detail border-t border-slate-100 pt-2">
                                    <summary className="text-[11px] font-black text-slate-500 cursor-pointer hover:text-slate-900 list-none flex justify-between items-center uppercase tracking-tighter">
                                        <span>品項明細 (點擊展開)</span>
                                        <ArrowDown size={12} className="group-open/detail:rotate-180 transition-transform"/>
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                                        {data.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <span className="truncate w-2/3">{i.name} x{i.quantity}</span>
                                                <span className="font-mono">¥{i.price * i.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>

                                <details className="group/weight border-t border-slate-100 pt-2">
                                    <summary className="text-[11px] font-black text-indigo-500 cursor-pointer hover:text-indigo-700 list-none flex justify-between items-center uppercase tracking-tighter">
                                        <span>二補明細 (點擊展開)</span>
                                        <Scale size={12} className="group-open/weight:rotate-180 transition-transform"/>
                                    </summary>
                                    <div className="mt-2 space-y-1 bg-indigo-50/30 p-2 rounded-lg border border-indigo-100">
                                        {data.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-[10px] font-bold text-indigo-600/80">
                                                <span className="truncate w-2/3">{i.name} ({i.weight || 0}kg)</span>
                                                <span className="font-mono">NT$ {Math.round(i.secondPaySubtotal)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-[10px] font-black text-indigo-400 border-t border-indigo-100 mt-1 pt-1 italic">
                                            <span>包材費平攤 (每件)</span>
                                            <span>NT$ {boxCostPerItemTWD.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 底部說明 */}
            <div className="max-w-xl mx-auto bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300 flex items-start gap-3">
                <Info size={20} className="text-slate-400 shrink-0 mt-1" />
                <div className="text-[12px] font-bold text-slate-500 leading-relaxed">
                    <p className="text-slate-900 uppercase tracking-widest mb-1 font-black underline">Calculation Protocol (Post-Order):</p>
                    <p>1. 本體台幣 = (商品日幣額 + 日本境內運分攤) × 當前匯率</p>
                    <p>2. 國際二補 = [(商品重 × {RATE_PER_KG}) + (包材總重 × {RATE_PER_KG} / 總件數)] × 數量</p>
                    <p>3. 最終總計 = 本體台幣 + 國際二補。實際金額請參考管理員標記之收款狀態。</p>
                </div>
            </div>
        </div>
    );
}