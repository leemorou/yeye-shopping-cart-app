// src/components/SecondPaymentForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Package, Save, Plane, Info, Wallet } from 'lucide-react';

const ADMIN_USER = "葉葉";
const RATE_PER_KG = 250; // 每公斤費率

export default function SecondPaymentForm({ group, orders, currentUser, onUpdate }) {
    const isAdmin = currentUser?.name === ADMIN_USER;
    
    // 初始化資料
    const [weights, setWeights] = useState(group.secondPayment?.weights || {});
    const [boxWeight, setBoxWeight] = useState(group.secondPayment?.boxWeight || 0);
    const [minChargeDiff, setMinChargeDiff] = useState(group.secondPayment?.minChargeDiff || 0);

    // 商品清單
    const uniqueItems = useMemo(() => group.items || [], [group.items]);

    // 計算邏輯
    const calculations = useMemo(() => {
        let totalProductWeight = 0;
        let totalItemsCount = 0;
        const uniqueUserIds = new Set();

        orders.forEach(order => {
            uniqueUserIds.add(order.userId); 
            order.items.forEach(item => {
                const w = parseFloat(weights[item.itemId] || 0);
                totalProductWeight += w * item.quantity;
                totalItemsCount += item.quantity;
            });
        });

        // 1. 重量與運費計算 (這是給物流公司的)
        const totalWeight = totalProductWeight + parseFloat(boxWeight || 0);
        const billingWeight = Math.max(0.3, totalWeight); // 最低 0.3kg
        const totalShippingAmount = Math.round(billingWeight * RATE_PER_KG);

        // 2. 箱子費分攤 (依商品數)
        const boxCost = (parseFloat(boxWeight || 0) * RATE_PER_KG);
        const boxCostPerItem = totalItemsCount > 0 ? boxCost / totalItemsCount : 0;

        // 3. 低消差額分攤 (這筆錢只算在團員頭上，不加進總運費)
        const minChargeTotal = parseFloat(minChargeDiff || 0);
        const userCount = uniqueUserIds.size;
        const minChargePerPerson = userCount > 0 ? minChargeTotal / userCount : 0;

        return {
            totalWeight: totalWeight.toFixed(2),
            billingWeight: billingWeight.toFixed(2),
            totalAmount: totalShippingAmount, 
            totalItemsCount,
            boxCostPerItem,
            minChargeTotal,
            minChargePerPerson
        };
    }, [weights, boxWeight, minChargeDiff, orders]);

    // 儲存處理
    const handleSave = () => {
        onUpdate({
            weights,
            boxWeight: parseFloat(boxWeight),
            minChargeDiff: parseFloat(minChargeDiff)
        });
    };

    return (
        <div className="space-y-6 font-sans text-slate-800">
            {/* 頂部資訊看板 */}
            <div className="bg-slate-900 text-white p-4 rounded-xl border-2 border-yellow-400 shadow-lg">
                <h4 className="font-black italic text-lg text-yellow-400 mb-3 flex items-center gap-2 transform -skew-x-3">
                    <Plane size={20} /> 國際運費試算 (INTL SHIPPING)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-800 p-2 rounded border border-slate-600 flex flex-col justify-center">
                        <span className="text-slate-400 block text-xs mb-1">總計費重 (Billing Weight)</span>
                        {/* ★ 修改：使用 flex 讓大字和小字排在同一行，並對齊底部 */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-mono font-bold text-white">{calculations.billingWeight} kg</span>
                            <span className="text-[10px] text-slate-500">(實重 {calculations.totalWeight} kg)</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-600 flex flex-col justify-center">
                        <span className="text-slate-400 block text-xs mb-1">總二補金額 (Total Cost)</span>
                        <span className="text-xl font-mono font-bold text-yellow-400">NT$ {calculations.totalAmount}</span>
                    </div>
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                    <Info size={12} /> 費率：NT$250/kg (未滿 0.3kg 以 0.3kg 計)
                </div>
            </div>

            {/* 重量輸入區 (表格) */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b-2 border-slate-900 text-slate-700 font-bold">
                        <tr>
                            <th className="p-3 text-left">項目名稱</th>
                            <th className="p-3 text-center w-24">數值</th>
                            <th className="p-3 text-right">分攤試算</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {/* 1. 商品列表 */}
                        {uniqueItems.map(item => {
                            const w = parseFloat(weights[item.id] || 0);
                            const itemCost = Math.round((w * RATE_PER_KG) + calculations.boxCostPerItem);
                            return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">{item.name} <span className="text-xs text-slate-400 block">{item.spec}</span></td>
                                    <td className="p-3 text-center">
                                        {isAdmin ? (
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-20 border-2 border-slate-300 rounded px-1 text-center font-bold focus:border-yellow-400 focus:outline-none"
                                                placeholder="kg"
                                                value={weights[item.id] || ''}
                                                onChange={(e) => setWeights({...weights, [item.id]: e.target.value})}
                                            />
                                        ) : (
                                            <span className="font-mono">{w || '-'} kg</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-700">
                                        NT$ {itemCost}<span className="text-[10px] text-slate-400 font-normal">/個</span>
                                    </td>
                                </tr>
                            );
                        })}
                        
                        {/* 2. 箱子包材 */}
                        <tr className="bg-yellow-50/50">
                            <td className="p-3 font-black text-slate-800 flex items-center gap-2">
                                <Package size={16} /> 箱子包材 (Shared Box)
                            </td>
                            <td className="p-3 text-center">
                                {isAdmin ? (
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-20 border-2 border-yellow-400 rounded px-1 text-center font-bold focus:outline-none bg-white"
                                        placeholder="kg"
                                        value={boxWeight}
                                        onChange={(e) => setBoxWeight(e.target.value)}
                                    />
                                ) : (
                                    <span className="font-mono">{boxWeight} kg</span>
                                )}
                            </td>
                            <td className="p-3 text-right text-xs text-slate-500">
                                <span className="font-bold text-slate-700 block">NT$ {Math.round(calculations.boxCostPerItem)}/個</span>
                                (依商品數分攤)
                            </td>
                        </tr>

                        {/* 3. 低消差額 */}
                        <tr className="bg-blue-50/50">
                            <td className="p-3 font-black text-slate-800 flex items-center gap-2">
                                <Wallet size={16} /> 低消差額 (Min Charge)
                            </td>
                            <td className="p-3 text-center">
                                {isAdmin ? (
                                    <input 
                                        type="number" 
                                        className="w-20 border-2 border-blue-400 rounded px-1 text-center font-bold focus:outline-none bg-white"
                                        placeholder="NT$"
                                        value={minChargeDiff}
                                        onChange={(e) => setMinChargeDiff(e.target.value)}
                                    />
                                ) : (
                                    <span className="font-mono">NT$ {minChargeDiff}</span>
                                )}
                            </td>
                            <td className="p-3 text-right text-xs text-slate-500">
                                <span className="font-bold text-slate-700 block">NT$ {Math.round(calculations.minChargePerPerson)}/人</span>
                                (依人數均分)
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 團員分攤預覽 */}
            <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                <h5 className="font-bold text-slate-700 mb-2 border-b border-slate-300 pb-1 flex justify-between items-end">
                    <span>團員二補試算</span>
                    <span className="text-[10px] text-slate-400 font-normal">公式：(商品重x250) + (箱子費x數量) + 低消均分</span>
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {orders.map(order => {
                        let userTotalShipping = 0;
                        order.items.forEach(i => {
                            const w = parseFloat(weights[i.itemId] || 0);
                            const itemShipping = (w * RATE_PER_KG) + calculations.boxCostPerItem;
                            userTotalShipping += itemShipping * i.quantity;
                        });
                        
                        userTotalShipping += calculations.minChargePerPerson;
                        
                        return (
                            <div key={order.userId} className="flex justify-between text-sm hover:bg-slate-100 p-1 rounded">
                                <span className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700">{order.userName}</span>
                                    <span className="text-xs text-slate-400">({order.items.reduce((a,b)=>a+b.quantity,0)} 件)</span>
                                </span>
                                <span className="font-mono font-black text-slate-900">NT$ {Math.round(userTotalShipping)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 只有管理員能儲存 */}
            {isAdmin && (
                <div className="flex justify-end pt-2">
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-yellow-400 rounded font-black border-2 border-slate-900 hover:bg-slate-800 shadow-[4px_4px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                        <Save size={18} /> 儲存重量設定
                    </button>
                </div>
            )}
        </div>
    );
}