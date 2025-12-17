import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock3, ExternalLink, DollarSign, Truck, 
    Camera, Calculator, ArrowDown 
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

export default function JSPreOrderTab({ currentUser, onImageClick }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({
        exchangeRate: 0.24,
        totalShippingJPY: 0,
        status: '搶購中'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main");
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawList = data.orders || [];
                // 維持排序邏輯
                const sortedList = rawList.sort((a, b) => {
                    const nameCompare = a.buyer.localeCompare(b.buyer);
                    if (nameCompare !== 0) return nameCompare;
                    return a.id - b.id;
                });
                setOrders(sortedList);
                setSettings(data.settings || { exchangeRate: 0.24, totalShippingJPY: 0, status: '搶購中' });
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 計算邏輯 (純顯示用)
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
            {/* Banner & Status (純顯示) */}
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden">
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
                                <span className="font-black text-xs uppercase bg-slate-200 px-1 rounded">STATUS</span>
                                <span className="font-black text-purple-600">{settings.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block">匯率 (JPY→TWD)</label>
                                    <div className="flex items-center font-black">
                                        <DollarSign size={14} className="text-slate-400"/>
                                        <span>{settings.exchangeRate}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block">總運費 (JPY)</label>
                                    <div className="flex items-center font-black">
                                        <Truck size={14} className="text-slate-400"/>
                                        <span>{settings.totalShippingJPY}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery (維持原樣) */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                 <h4 className="font-black text-sm text-slate-500 mb-3 flex items-center gap-2"><Camera size={16}/> 商品預覽 (點擊放大)</h4>
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {JS_IMAGES.map((url, idx) => (
                        <div key={idx} onClick={() => onImageClick(url)} className="w-20 h-20 shrink-0 bg-white rounded border border-slate-300 overflow-hidden hover:scale-105 transition-transform cursor-pointer relative group">
                             <img src={url} alt={`Item ${idx}`} className="w-full h-full object-cover"/>
                        </div>
                    ))}
                 </div>
            </div>

            {/* 個人卡片展示區 (Summary Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(summary).map(([buyer, data]) => {
                    const totalJPY = data.totalItemPriceJPY + data.totalShippingShareJPY;
                    const totalTWD = Math.ceil(totalJPY * settings.exchangeRate);
                    return (
                        <div key={buyer} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[4px_4px_0px_0px_#6b21a8] relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                                <h3 className="text-2xl font-black italic text-slate-900">{buyer}</h3>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400">TOTAL</p>
                                    <span className="text-3xl font-black text-purple-600">NT$ {totalTWD}</span>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm font-bold text-slate-600">
                                <div className="flex justify-between">
                                    <span>商品總額 ({data.count}點)</span>
                                    <span>¥{data.totalItemPriceJPY.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>運費分攤 (每件¥{shippingPerUnitJPY.toFixed(0)})</span>
                                    <span>¥{data.totalShippingShareJPY.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-800 font-black">
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