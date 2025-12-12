// src/components/OrderSummary.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Edit3, Download, FileSpreadsheet, Calculator, Truck, User, DollarSign, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const ADMIN_USER = "葉葉";

export default function OrderSummary({ group, orders, currentUser, onEdit }) {
    const isAdmin = currentUser?.name === ADMIN_USER;

    // ★ 修改 1: 預設匯率改為 0.21
    const [exchangeRate, setExchangeRate] = useState(group.exchangeRate || 0.21);
    const [shippingFee, setShippingFee] = useState(group.shippingFee || 0);

    // ... (其餘程式碼完全不變，直接複製原檔案的後續部分)
    // 為了節省篇幅，請保留這個檔案原本的 return 結構和邏輯
    // 只要改上面的 useState(group.exchangeRate || 0.21) 即可
    // 如果您需要我提供完整的 OrderSummary.jsx 也請告訴我
    
    useEffect(() => {
        if (group.exchangeRate !== undefined) setExchangeRate(group.exchangeRate);
        if (group.shippingFee !== undefined) setShippingFee(group.shippingFee);
    }, [group]);

    // ... (下略)
    // 自動儲存功能
    const handleSaveSettings = async () => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id), {
                exchangeRate: Number(exchangeRate),
                shippingFee: Number(shippingFee)
            });
            console.log("設定已儲存！");
        } catch (e) {
            console.error("儲存失敗", e);
            alert("設定儲存失敗");
        }
    };

    const userStats = useMemo(() => {
        return orders.map(order => {
            const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
            const totalAmount = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            return { userId: order.userId, userName: order.userName, totalQty, totalAmount };
        }).sort((a, b) => b.totalAmount - a.totalAmount); 
    }, [orders]);

    const grandTotal = userStats.reduce((acc, stat) => acc + stat.totalAmount, 0);
    const grandQty = userStats.reduce((acc, stat) => acc + stat.totalQty, 0);
    const shippingPerItem = grandQty > 0 ? (shippingFee / grandQty) : 0;

    const handleExportExcel = () => {
        const excelData = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                const jpyItemTotal = item.price * item.quantity;
                const itemShippingShare = shippingPerItem * item.quantity;
                const jpyFinalTotal = jpyItemTotal + itemShippingShare;
                excelData.push({
                    "訂購人": order.userName,
                    "商品名稱": item.name,
                    "規格": item.spec || "-",
                    "單價 (¥)": item.price,
                    "數量": item.quantity,
                    "商品小計 (¥)": jpyItemTotal,
                    "運費分攤 (¥)": Math.round(itemShippingShare),
                    "總計 (含運) (¥)": Math.round(jpyFinalTotal),
                    "台幣總計 (NT$)": Math.round(jpyFinalTotal * exchangeRate),
                    "下單時間": new Date(order.updatedAt).toLocaleString()
                });
            });
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "團購明細");
        XLSX.writeFile(wb, `英雄任務結算_${group.title}_匯率${exchangeRate}.xlsx`);
    };

    return (
        <div className="space-y-6 text-slate-800 font-sans">
            
            {/* === 1. 任務設定/費率看板 (Admin Control Panel) === */}
            <div className="bg-slate-900 p-4 rounded-lg border-2 border-yellow-400 shadow-lg text-white">
                <h4 className="font-black italic text-xl text-yellow-400 mb-3 transform -skew-x-3">
                    <Calculator size={20} className="inline mr-2 fill-yellow-400 text-slate-900" /> 任務結算參數
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* 左側：匯率 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-400 flex items-center gap-1"><DollarSign size={14} className="text-red-500" /> 匯率 (JPY → TWD)</label>
                        {isAdmin ? (
                            <input 
                                type="number" step="0.001" value={exchangeRate}
                                onChange={(e) => setExchangeRate(e.target.value)}
                                onBlur={handleSaveSettings}
                                className="w-full px-3 py-1.5 rounded border-2 border-yellow-400 text-center font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-600 bg-yellow-100 shadow-md transition-all"
                            />
                        ) : (
                            <span className="font-mono text-2xl font-black text-yellow-400 bg-slate-800 px-3 py-1 rounded border border-yellow-400">{exchangeRate}</span>
                        )}
                    </div>

                    {/* 右側：運費 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-400 flex items-center gap-1"><Truck size={14} className="text-red-500" /> 境內運費 (JPY)</label>
                        {isAdmin ? (
                            <input 
                                type="number" value={shippingFee}
                                onChange={(e) => setShippingFee(e.target.value)}
                                onBlur={handleSaveSettings}
                                className="w-full px-3 py-1.5 rounded border-2 border-yellow-400 text-center font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-600 bg-yellow-100 shadow-md transition-all"
                            />
                        ) : (
                            <span className="font-mono text-2xl font-black text-yellow-400 bg-slate-800 px-3 py-1 rounded border border-yellow-400">{shippingFee}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* === 2. 總結資訊列 (Grand Total) === */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] gap-4 sm:gap-0">
                <div className="flex gap-6 text-sm font-bold">
                    <div>
                        <span className="text-slate-500 block text-xs">總件數</span>
                        <span className="font-black text-3xl text-red-600 italic">{grandQty}</span>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                        <span className="text-slate-500 block text-xs">總金額 (含運)</span>
                        <div className="flex flex-col leading-snug">
                            <span className="font-black text-xl text-slate-900">¥{(grandTotal + Number(shippingFee)).toLocaleString()}</span>
                            <span className="text-sm text-yellow-600 font-black tracking-wider">≈ NT${Math.round((grandTotal + Number(shippingFee)) * exchangeRate).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                {isAdmin && (
                    <button 
                        onClick={handleExportExcel} 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded border-2 border-green-800 text-sm font-black italic shadow-[2px_2px_0px_0px_rgba(20,83,45,1)] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                        <FileSpreadsheet size={18} /> EXCEL 任務報告
                    </button>
                )}
            </div>

            {/* === 3. 個別金額統計表 (Per User Breakdown) === */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden shadow-lg bg-white">
                <div className="bg-slate-900 px-4 py-3 text-xs font-black text-yellow-400 flex justify-between uppercase">
                    <span>英雄 (參戰件數)</span>
                    <span className="text-right">任務總費用 (TWD)</span>
                </div>
                <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto bg-white">
                    {userStats.map(stat => {
                        const myShippingShare = Math.round(shippingPerItem * stat.totalQty);
                        const myTotalJPY = stat.totalAmount + myShippingShare;
                        const myTotalNTD = Math.round(myTotalJPY * exchangeRate);
                        return (
                            <div key={stat.userId} className="flex justify-between items-center px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-900 flex items-center gap-1">
                                        <User size={14} className="text-red-600" /> {stat.userName}
                                    </span>
                                    <span className="text-slate-500 text-xs italic">{stat.totalQty} 件裝備</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg text-slate-900 font-mono">
                                        ¥{myTotalJPY.toLocaleString()}
                                    </div>
                                    <div className="text-xs font-bold bg-yellow-400/30 text-slate-900 px-1.5 py-0.5 rounded inline-block mt-1 border border-yellow-400">
                                        ≈ NT${myTotalNTD.toLocaleString()}
                                    </div>
                                    {Number(shippingFee) > 0 && <span className="text-[10px] text-slate-400 font-medium ml-1 block">(商品¥{stat.totalAmount} + 運¥{myShippingShare})</span>}
                                </div>
                            </div>
                        );
                    })}
                    {userStats.length === 0 && <div className="p-4 text-center text-slate-300 text-sm italic">目前沒有英雄參戰！</div>}
                </div>
            </div>

            <div className="h-2 bg-yellow-400 border-t-2 border-slate-900 mt-5"></div>

            {/* === 4. 詳細訂單列表 (Per Order Details) === */}
            <div className="space-y-6">
                <h4 className="font-black italic text-lg text-slate-900 flex items-center gap-2 transform -skew-x-3">
                    <Download size={20} className="text-red-600" /> 英雄任務細項
                </h4>
                {orders.map(order => {
                    const isMyOrder = currentUser && order.userId === currentUser.id;
                    const orderItemTotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                    const orderTotalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
                    const orderShippingShare = Math.round(shippingPerItem * orderTotalQty);
                    const orderFinalJPY = orderItemTotal + orderShippingShare;
                    const orderFinalNTD = Math.round(orderFinalJPY * exchangeRate);
                    
                    return (
                        <div key={order.userId} className={`bg-white rounded-lg border-4 ${isMyOrder ? 'border-red-600 shadow-[4px_4px_0px_0px_#FACC15]' : 'border-slate-900 shadow-md'} transition-all`}>
                            <div className={`px-5 py-3 border-b-2 flex justify-between items-center ${isMyOrder ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isMyOrder ? 'bg-red-600 text-white' : 'bg-slate-900 text-yellow-400'}`}>{order.userName.charAt(0)}</div>
                                    <div className="flex flex-col">
                                        <span className={`font-black italic text-sm ${isMyOrder ? 'text-red-700' : 'text-slate-900'}`}>{order.userName} {isMyOrder && "(YOU)"}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{new Date(order.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {isMyOrder && onEdit && <button onClick={onEdit} className="flex items-center gap-1 bg-white text-blue-600 text-xs font-black px-3 py-1.5 rounded border-2 border-slate-900 shadow-sm hover:bg-blue-50 transition-all italic"><Edit3 size={14} /> 編輯</button>}
                            </div>
                            
                            <div className="p-5 bg-white">
                                <ul className="space-y-3">
                                    {order.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-start text-sm border-b border-dashed border-slate-200 last:border-0 pb-2 last:pb-0">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-black text-base">{item.name}</span>
                                                {item.spec && <span className="text-slate-500 text-xs italic">規格: {item.spec}</span>}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-black font-mono text-xl text-red-600 italic">x {item.quantity}</span>
                                                <div className="text-right"><span className="text-xs text-slate-500">¥{item.price}</span></div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                
                                <div className="mt-4 pt-3 border-t-2 border-slate-200 flex flex-col items-end">
                                    <div className="flex gap-4 text-xs text-slate-400 mb-1 font-bold">
                                        <span>商品 ¥{orderItemTotal.toLocaleString()}</span>
                                        <span>+</span>
                                        <span>運費 ¥{orderShippingShare}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-slate-500 text-sm">TOTAL JPY</span>
                                        <span className="font-black text-slate-900 font-mono text-2xl">¥{orderFinalJPY.toLocaleString()}</span>
                                    </div>
                                    <div className="text-lg font-black bg-yellow-400 text-slate-900 px-3 py-0.5 rounded mt-1 italic border-2 border-slate-900">
                                        ≈ NT${orderFinalNTD.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}