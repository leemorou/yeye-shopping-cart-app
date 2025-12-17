// src/components/SecondPaymentForm.jsx
import React, { useState } from 'react';
import { Scale, Calculator, Save, Download, Info, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

const RATE_PER_KG = 250; // 每公斤運費費率

export default function SecondPaymentForm({ group, orders, currentUser, onUpdate, isReadOnly = false }) {
    const isAdminMode = !isReadOnly && (currentUser?.name === "葉葉" || currentUser?.id === "yeye");
    
    // 狀態初始化：從 Firebase 讀取已存的重量設定
    const [weights, setWeights] = useState(group.secondPayment?.weights || {});
    const [boxWeight, setBoxWeight] = useState(group.secondPayment?.boxWeight || 0);
    const [minChargeDiff, setMinChargeDiff] = useState(group.secondPayment?.minChargeDiff || 0);

    // 1. 整理「所有被訂購過」的商品品項 (用於管理員輸入重量)
    const allOrderedItems = useMemo(() => {
        const itemIds = new Set();
        orders.forEach(order => order.items?.forEach(i => itemIds.add(i.itemId)));
        return group.items?.filter(item => itemIds.has(item.id)) || [];
    }, [group.items, orders]);

    // 2. 計算基礎分攤值
    const groupOrders = orders.filter(o => o.groupId === group.id);
    let totalGroupItemsQty = 0;
    groupOrders.forEach(o => o.items.forEach(i => totalGroupItemsQty += (Number(i.quantity) || 0)));
    
    const uniqueUserCount = new Set(groupOrders.map(o => o.userId)).size;

    // 包材費分攤 (總包材重 * 費率 / 總件數)
    const boxCostPerItem = totalGroupItemsQty > 0 ? (boxWeight * RATE_PER_KG) / totalGroupItemsQty : 0;
    // 低消補貼分攤 (總補貼 / 總人數)
    const minChargePerPerson = uniqueUserCount > 0 ? minChargeDiff / uniqueUserCount : 0;

    // 3. 計算每位英雄的二補明細
    const userPayments = groupOrders.reduce((acc, order) => {
        let userShippingTotal = 0;
        let details = [];

        order.items?.forEach(i => {
            const itemWeight = parseFloat(weights[i.itemId] || 0);
            // 單件運費 = (商品重量 * 費率) + 分攤包材費
            const singleItemShipping = (itemWeight * RATE_PER_KG) + boxCostPerItem;
            const totalItemShipping = singleItemShipping * i.quantity;
            
            userShippingTotal += totalItemShipping;
            details.push({
                name: i.name,
                qty: i.quantity,
                weight: itemWeight,
                subtotal: totalItemShipping
            });
        });

        // 加上人頭分攤的低消補貼
        userShippingTotal += minChargePerPerson;

        if (!acc[order.userId]) {
            acc[order.userId] = { 
                name: order.userName, 
                details: details, 
                total: userShippingTotal 
            };
        } else {
            acc[order.userId].details.push(...details);
            acc[order.userId].total += userShippingTotal;
        }
        return acc;
    }, {});

    const handleSave = () => {
        onUpdate({ weights, boxWeight, minChargeDiff });
        alert("二補重量設定已儲存！");
    };

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* 🟢 管理員：商品重量輸入區 */}
            {isAdminMode && (
                <div className="bg-white p-5 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#000]">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase italic border-b-2 pb-2">
                        <Scale size={20} className="text-blue-600"/> Weight Control Panel
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-200">
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">紙箱/包材總重 (kg)</label>
                            <input type="number" step="0.01" className="w-full bg-transparent font-mono font-bold text-lg outline-none" value={boxWeight} onChange={e => setBoxWeight(e.target.value)} />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-200">
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">未滿低消補貼 (TWD)</label>
                            <input type="number" className="w-full bg-transparent font-mono font-bold text-lg outline-none" value={minChargeDiff} onChange={e => setMinChargeDiff(e.target.value)} />
                        </div>
                    </div>

                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Individual Item Weights</p>
                    <div className="space-y-3">
                        {allOrderedItems.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="flex-1 text-xs font-bold text-slate-700 truncate">{item.name}</span>
                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-300">
                                    <input 
                                        type="number" step="0.001" placeholder="0.000"
                                        className="w-20 text-right font-mono font-black text-blue-600 outline-none"
                                        value={weights[item.id] || ''}
                                        onChange={e => setWeights({...weights, [item.id]: e.target.value})}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">kg</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleSave} className="w-full mt-6 py-3 bg-slate-900 text-yellow-400 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 shadow-[4px_4px_0px_0px_#ccc] transition-all active:translate-y-1 active:shadow-none">
                        <Save size={18} /> SAVE SETTINGS
                    </button>
                </div>
            )}

            {/* 📊 試算結果 (明細表格) */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h3 className="font-black text-slate-900 flex items-center gap-2 italic">
                        <Calculator size={20} className="text-red-600"/> 二補費用明細表
                    </h3>
                    {isReadOnly && <span className="text-[10px] font-black text-blue-600 border-b-2 border-blue-600 pb-0.5">READ ONLY MODE</span>}
                </div>

                {Object.values(userPayments).map((user, idx) => (
                    <div key={idx} className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center">
                            <span className="font-black italic uppercase tracking-tighter">{user.name}</span>
                            <span className="font-mono font-black text-yellow-400">Total: ${Math.round(user.total)}</span>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b">
                                    <tr>
                                        <th className="p-2">Item</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-center">Weight</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {user.details.map((d, i) => (
                                        <tr key={i}>
                                            <td className="p-2 font-bold text-slate-700">{d.name}</td>
                                            <td className="p-2 text-center text-slate-500">{d.qty}</td>
                                            <td className="p-2 text-center font-mono text-slate-400">{d.weight}kg</td>
                                            <td className="p-2 text-right font-mono font-bold">${Math.round(d.subtotal)}</td>
                                        </tr>
                                    ))}
                                    {minChargeDiff > 0 && (
                                        <tr className="bg-yellow-50/50">
                                            <td colSpan={3} className="p-2 text-slate-500 italic">低消分攤費 (Person Share)</td>
                                            <td className="p-2 text-right font-mono font-bold">${Math.round(minChargePerPerson)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {isReadOnly && (
                <div className="bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300 flex items-start gap-3">
                    <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        計算公式：[(商品重量 × {RATE_PER_KG}) + (包材總重 × {RATE_PER_KG} / 總件數)] × 數量 + (低消差額 / 總人數)。
                        所有金額採四捨五入計算。
                    </p>
                </div>
            )}
        </div>
    );
}

// 輔助 Hook
function useMemo(factory, deps) {
    const [val, setVal] = React.useState(factory);
    React.useEffect(() => setVal(factory()), deps);
    return val;
}