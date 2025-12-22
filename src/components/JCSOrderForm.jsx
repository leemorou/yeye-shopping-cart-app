// src/components/JCSOrderForm.jsx
import React, { useState, useEffect } from 'react';
import { 
    Ticket, CheckCircle, XCircle, Clock, Info, TruckIcon
} from 'lucide-react';
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";

const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function JCSLotteryTab({ currentUser, isAdmin }) {
    const [orders, setOrders] = useState([]);
    const [jcsSettings, setJcsSettings] = useState({ totalDomesticShipping: 0, exchangeRate: 0.24 });

    // 取得當前使用者的中文名稱
    const myNickName = USER_MAPPING[currentUser?.id] || currentUser?.name || "";

    useEffect(() => {
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // 【修正：數字排序邏輯】
            const sortedList = list.sort((a, b) => {
                const numA = parseInt(a.id.replace('order_', '')) || 0;
                const numB = parseInt(b.id.replace('order_', '')) || 0;
                return numA - numB;
            });

            // 確保顯示 10 個框，若資料庫不足則填補
            const displayOrders = Array.from({ length: 10 }, (_, i) => {
                const targetId = `order_${i+1}`;
                const found = sortedList.find(o => o.id === targetId);
                return found || { id: targetId, items: [] };
            });

            setOrders(displayOrders);
        });
        
        const unsubSettings = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), (snap) => {
            if (snap.exists()) setJcsSettings(snap.data());
        });

        return () => { unsubOrders(); unsubSettings(); };
    }, []);

    const getStatusColor = (status) => {
        if (status === 'WON') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'LOST') return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
        return 'bg-white text-slate-900 border-slate-200';
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JCS 抽選分配狀況</h3>
                        <div className="flex gap-4 text-sm font-bold text-white/80">
                            <span className="flex items-center gap-1"><Info size={14}/> 匯率: {jcsSettings.exchangeRate || 0.24}</span>
                            <span className="flex items-center gap-1"><TruckIcon size={14}/> 日本境內運費(總): ¥{Number(jcsSettings.totalDomesticShipping).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 rotate-2 text-xs sm:text-sm">
                        抽選結果已公布
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => {
                    const displayItems = isAdmin 
                        ? (order.items || [])
                        : (order.items || []).filter(item => item.assignments?.some(a => a.user === myNickName));

                    if (!isAdmin && displayItems.length === 0) return null;

                    const orderTotalYen = displayItems.reduce((sum, i) => {
                        const myAs = i.assignments?.find(a => a.user === myNickName);
                        const qty = isAdmin ? i.qty : (myAs?.qty || 0);
                        return sum + (Number(i.price) * qty);
                    }, 0);

                    return (
                        <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8]">
                            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                <h4 className="font-black italic text-lg flex items-center gap-2">
                                    <Ticket size={20} className="text-purple-400"/> ORDER #{order.id.replace('order_', '')}
                                </h4>
                                <div className="text-xs font-mono text-yellow-400 font-bold italic">¥{orderTotalYen.toLocaleString()}</div>
                            </div>
                            <div className="p-4 min-h-[120px]">
                                <div className="space-y-3 text-slate-700">
                                    {displayItems.length > 0 ? displayItems.map((item, idx) => {
                                        const myAs = item.assignments?.find(a => a.user === myNickName);
                                        const displayQty = isAdmin ? item.qty : (myAs?.qty || 0);
                                        return (
                                            <div key={idx} className={`p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-sm leading-tight">{item.name}</div>
                                                        <div className="text-[10px] opacity-75 mt-1">
                                                            ¥{item.price} x {displayQty}
                                                            {isAdmin && item.assignments?.length > 0 && (
                                                                <span className="ml-1 text-purple-600 font-black">
                                                                    ({item.assignments.map(a => `${a.user}${a.qty}`).join(',')})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-black text-sm">¥{(item.price * displayQty).toLocaleString()}</div>
                                                        {item.status === 'WON' ? <CheckCircle size={16} className="text-green-600 inline ml-1"/> : item.status === 'LOST' ? <XCircle size={16} className="text-slate-400 inline ml-1"/> : <Clock size={16} className="text-slate-400 inline ml-1"/>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-6 text-slate-300 font-bold italic">WAITING FOR DATA...</div>
                                    )}
                                    {displayItems.length > 0 && (
                                        <div className="pt-2 border-t border-dashed border-slate-200 text-right">
                                            <span className="text-[10px] font-black text-slate-400 mr-2 uppercase">Order Subtotal</span>
                                            <span className="font-black text-slate-900 font-mono italic">
                                                ≈ NT$ {Math.ceil(orderTotalYen * jcsSettings.exchangeRate).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}