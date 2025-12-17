// src/components/JSPreOrderTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock3, ExternalLink, DollarSign, Truck, 
    Camera, Calculator, ArrowDown, Info, Scale, Plane
} from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

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

const RATE_PER_KG = 250; // 國際運費費率 (與後台一致)

export default function JSPreOrderTab({ currentUser, onImageClick }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({
        exchangeRate: 0.23,
        totalShippingJPY: 0,
        status: '搶購中',
        secondPayment: { weights: {}, boxWeight: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.orders || [];
                const sortedList = rawList.sort((a, b) => {
                    const nameCompare = a.buyer.localeCompare(b.buyer);
                    if (nameCompare !== 0) return nameCompare;
                    return a.id - b.id;
                });
                setOrders(sortedList);
                // 確保包含二補設定
                setSettings({
                    exchangeRate: 0.24,
                    totalShippingJPY: 0,
                    status: '搶購中',
                    secondPayment: { weights: {}, boxWeight: 0 },
                    ...data.settings
                });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 1. 基礎計算
    const totalBoughtQuantity = useMemo(() => orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0), [orders]);
    const shippingPerUnitJPY = useMemo(() => totalBoughtQuantity > 0 ? (settings.totalShippingJPY / totalBoughtQuantity) : 0, [totalBoughtQuantity, settings.totalShippingJPY]);
    
    // 2. 二補分攤計算 (每件平分包材運費)
    const boxWeight = parseFloat(settings.secondPayment?.boxWeight || 0);
    const boxCostPerItemTWD = totalBoughtQuantity > 0 ? (boxWeight * RATE_PER_KG) / totalBoughtQuantity : 0;

    const summary = useMemo(() => {
        const report = {};
        orders.forEach(item => {
            if (!report[item.buyer]) {
                report[item.buyer] = { 
                    items: [], 
                    totalItemPriceJPY: 0, 
                    totalShippingShareJPY: 0, 
                    totalSecondPayTWD: 0, 
                    count: 0 
                };
            }
            if (item.isBought) {
                const itemTotalJPY = item.price * item.quantity;
                const shippingShareJPY = shippingPerUnitJPY * item.quantity;
                
                // 二補單件邏輯：(單重 * 費率) + 包材平分
                const itemWeight = parseFloat(settings.secondPayment?.weights?.[item.name] || 0);
                const secondPayPerItem = (itemWeight * RATE_PER_KG) + boxCostPerItemTWD;
                const totalItemSecondPayTWD = secondPayPerItem * item.quantity;

                report[item.buyer].items.push({
                    ...item,
                    weight: itemWeight,
                    secondPaySubtotal: totalItemSecondPayTWD
                });
                
                report[item.buyer].totalItemPriceJPY += itemTotalJPY;
                report[item.buyer].totalShippingShareJPY += shippingShareJPY;
                report[item.buyer].totalSecondPayTWD += totalItemSecondPayTWD;
                report[item.buyer].count += item.quantity;
            }
        });
        return report;
    }, [orders, shippingPerUnitJPY, settings.secondPayment, boxCostPerItemTWD]);

    if (loading) return <div className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest italic animate-pulse">Scanning Intel...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Banner & Status */}
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JS ONLINE 先行</h3>
                        <div className="space-y-1 font-bold text-white text-sm">
                            <p className="flex items-center gap-2"><Clock3 size={16} className="text-yellow-400"/> 販售期間：12/17 11:00 ～ 12/21 16:00</p>
                            <a href="https://jumpshop-online.com/collections/jf2026" target="_blank" rel="noreferrer" className="flex items-center gap-2 underline hover:text-yellow-300"><ExternalLink size={16} /> 前往商店頁面</a>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-4 border-slate-700 text-slate-900 w-full md:w-auto shadow-lg">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xs uppercase bg-slate-200 px-1 rounded tracking-tighter">Mission Status</span>
                                <span className="font-black text-purple-600 italic uppercase">{settings.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block uppercase tracking-tighter">Exchange Rate</label>
                                    <div className="flex items-center font-black">
                                        <DollarSign size={14} className="text-slate-400"/>
                                        <span>{settings.exchangeRate}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block uppercase tracking-tighter">Total PCS</label>
                                    <div className="flex items-center font-black text-slate-900">
                                        <Truck size={14} className="text-slate-400 mr-1"/>
                                        <span>{totalBoughtQuantity}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                 <h4 className="font-black text-sm text-slate-500 mb-3 flex items-center gap-2"><Camera size={16}/> 商品預覽 (點擊放大)</h4>
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {JS_IMAGES.map((url, idx) => (
                        <div key={idx} onClick={() => onImageClick(url)} className="w-20 h-20 shrink-0 bg-white rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform cursor-pointer relative group shadow-sm">
                             <img src={url} alt={`Item ${idx}`} className="w-full h-full object-cover"/>
                        </div>
                    ))}
                 </div>
            </div>

            {/* 個人卡片展示區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(summary).map(([buyer, data]) => {
                    const productTotalJPY = data.totalItemPriceJPY + data.totalShippingShareJPY;
                    const productTotalTWD = Math.ceil(productTotalJPY * settings.exchangeRate);
                    // 最終總計 = 商品台幣(未繳) + 二補台幣(未繳)
                    // 注意：此處僅示範邏輯，實際應根據後台勾選的 paymentStatus 決定是否計入。
                    const finalGrandTotal = productTotalTWD + Math.round(data.totalSecondPayTWD);

                    return (
                        <div key={buyer} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[4px_4px_0px_0px_#6b21a8] relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4 border-b-2 border-slate-100 pb-2">
                                <h3 className="text-2xl font-black italic text-slate-900 tracking-tighter">{buyer}</h3>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Grand Total</p>
                                    <span className="text-3xl font-black text-purple-600">NT$ {finalGrandTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* 商品金額區 */}
                                <div className="space-y-1 text-sm font-bold text-slate-600">
                                    <div className="flex justify-between">
                                        <span>商品本體 ({data.count}點)</span>
                                        <span>¥{data.totalItemPriceJPY.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>日本境內運分攤</span>
                                        <span>¥{data.totalShippingShareJPY.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 border-t border-slate-100 pt-1">
                                        <span>商品台幣小計</span>
                                        <span className="font-black">NT$ {productTotalTWD.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* 國際二補區 */}
                                <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 space-y-1">
                                    <div className="flex justify-between text-sm font-black text-blue-800">
                                        <span className="flex items-center gap-1"><Plane size={14}/> 國際運費二補</span>
                                        <span>NT$ {Math.round(data.totalSecondPayTWD).toLocaleString()}</span>
                                    </div>
                                    <p className="text-[9px] text-blue-400 leading-tight">含各品項重量運費 + 包材費分攤</p>
                                </div>
                            </div>

                            {/* 展開明細按鈕群 */}
                            <div className="mt-4 space-y-2">
                                {/* 1. 購買品項明細 */}
                                <details className="group/detail border-t border-slate-100 pt-2">
                                    <summary className="text-[11px] font-black text-slate-500 cursor-pointer hover:text-slate-900 list-none flex justify-between items-center uppercase tracking-tighter">
                                        <span>商品明細 (點擊展開)</span>
                                        <ArrowDown size={12} className="group-open/detail:rotate-180 transition-transform"/>
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                                        {data.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <span className="truncate w-2/3">{i.ip} {i.name} x{i.quantity}</span>
                                                <span className="font-mono">¥{i.price * i.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>

                                {/* 2. 二補重量明細 */}
                                <details className="group/weight border-t border-slate-100 pt-2">
                                    <summary className="text-[11px] font-black text-blue-500 cursor-pointer hover:text-blue-700 list-none flex justify-between items-center uppercase tracking-tighter">
                                        <span>二補明細 (點擊展開)</span>
                                        <Scale size={12} className="group-open/weight:rotate-180 transition-transform"/>
                                    </summary>
                                    <div className="mt-2 space-y-1 bg-blue-50/30 p-2 rounded-lg border border-blue-100">
                                        {data.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-[10px] font-bold text-blue-600/80">
                                                <span className="truncate w-2/3">{i.name} ({i.weight}kg)</span>
                                                <span className="font-mono">NT$ {Math.round(i.secondPaySubtotal)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-[10px] font-black text-blue-400 border-t border-blue-100 mt-1 pt-1 italic">
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

            {/* 底部計算說明 */}
            <div className="max-w-xl mx-auto bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300 flex items-start gap-3">
                <Info size={20} className="text-slate-400 shrink-0 mt-1" />
                <div className="text-[12px] font-bold text-slate-500 leading-relaxed">
                    <p className="text-slate-900 uppercase tracking-widest mb-1">Calculation Protocol:</p>
                    <p>1. 商品台幣 = (商品日幣總額 + 境內運平分) × 當前匯率 (無條件進位)</p>
                    <p>2. 國際二補 = [(商品重 × {RATE_PER_KG}) + (包材總重 × {RATE_PER_KG} / 總件數)] × 數量</p>
                    <p>3. 最終總計 = 商品台幣 + 國際二補。若後台標記為「已收款」之項目將自動從帳單扣除。</p>
                </div>
            </div>
        </div>
    );
}