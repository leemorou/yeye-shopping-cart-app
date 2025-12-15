// src/components/OrderForm.jsx
import React, { useState } from 'react';
import { Image as ImageIcon, Plus, Minus, Zap, CheckCircle } from 'lucide-react';

export default function OrderForm({ group, currentOrder, onSubmit }) {
    const [quantities, setQuantities] = useState(() => {
        const init = {};
        group.items.forEach(item => {
            const found = currentOrder?.items?.find(i => 
                (i.itemId == item.id) || 
                (i.name?.trim() === item.name?.trim() && (i.spec?.trim() || '') === (item.spec?.trim() || ''))
            );
            init[item.id] = found ? found.quantity : 0;
        });
        return init;
    });

    const handleQtyChange = (itemId, val) => {
        const num = parseInt(val) || 0;
        const item = group.items.find(i => i.id === itemId);
        
        let finalQty = Math.max(0, num);
        if (item?.limit && finalQty > item.limit) {
            finalQty = item.limit;
        }

        setQuantities(prev => ({ ...prev, [itemId]: finalQty }));
    };

    const handleSubmit = () => {
        const finalItems = group.items.map(item => ({ 
            itemId: item.id || item.name, 
            name: item.name, 
            spec: item.spec, 
            price: item.price, 
            image: item.image,
            quantity: quantities[item.id] || 0 
        })).filter(i => i.quantity > 0);

        if (finalItems.length === 0) {
             if (currentOrder) {
                 if (confirm("您將所有商品數量設為 0，確定要取消(刪除)此訂單嗎？")) {
                     onSubmit([]); 
                 }
             } else {
                 alert("請至少選擇一個品項！");
             }
             return;
        }

        onSubmit(finalItems);
    };

    const totalJPY = group.items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = quantities[item.id] || 0;
        return sum + (price * qty);
    }, 0);

    const shippingFeeJPY = Number(group.shippingFee || 0);
    const totalTWD = Math.round((totalJPY + shippingFeeJPY) * group.exchangeRate);

    return (
        <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded-lg border-2 border-yellow-400 text-sm font-bold text-slate-800">
                <p className="flex items-center gap-2">
                    <Zap size={16} className="text-red-600" />
                    英雄資訊：
                </p>
                <ul className="mt-1 ml-1 list-disc list-inside text-xs font-medium text-slate-600 space-y-0.5">
                    <li>匯率基準：{group.exchangeRate}</li>
                    <li>單筆固定運費：¥ {shippingFeeJPY.toLocaleString()}</li>
                    <li>收單日期：{group.deadline}</li>
                </ul>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                <h4 className="font-black italic text-lg text-slate-900 border-b border-slate-300 pb-3 mb-3">任務裝備清單</h4>
                
                <div className="space-y-4"> 
                    {group.items.map(item => {
                        const currentQty = quantities[item.id] || 0;
                        const isMaxed = item.limit && currentQty >= item.limit;

                        return (
                            <div key={item.id} className="flex items-center justify-between border-b-2 border-slate-100 pb-4 last:border-0 bg-white p-3 rounded-lg shadow-sm">
                                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-900 shrink-0 overflow-hidden flex items-center justify-center shadow-md">
                                        {item.image ? (
                                            <img src={item.image} alt={item.spec} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    
                                    <div className="min-w-0 pt-1">
                                        <div className="font-black italic text-slate-900 truncate">{item.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                                            {item.spec && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">{item.spec}</span>}
                                            <span className="text-red-600 font-black flex items-center gap-0.5">
                                                ¥{item.price}
                                            </span>
                                            {item.limit && <span className="text-xs text-slate-500 font-medium"> (上限: {item.limit})</span>}
                                            {isMaxed && <span className="text-red-600 font-black text-xs"> (MAX!)</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1 pl-2 shrink-0">
                                    <button 
                                        type="button"
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-900 flex items-center justify-center border-2 border-slate-900 transition-colors shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-0.5 active:translate-x-0.5"
                                        onClick={() => handleQtyChange(item.id, currentQty - 1)}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    
                                    <input 
                                        type="number" 
                                        className="w-10 text-center font-black italic text-lg border-none focus:ring-2 focus:ring-yellow-400 p-0 bg-transparent text-slate-900" 
                                        value={currentQty}
                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                        min="0"
                                        max={item.limit || 999}
                                    />
                                    
                                    <button 
                                        type="button"
                                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center border-2 border-slate-900 transition-colors shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-0.5 active:translate-x-0.5 ${isMaxed ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                        onClick={() => handleQtyChange(item.id, currentQty + 1)}
                                        disabled={isMaxed}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-slate-800 text-white p-4 rounded-lg border-2 border-yellow-400 shadow-md">
                <h4 className="text-xl font-black italic text-yellow-400 mb-2">英雄結算 (Summary)</h4>
                
                <p className="flex justify-between font-bold text-white border-b border-slate-600 pb-1 text-base">
                    <span>商品總日幣 (Goods JPY)</span>
                    <span className="font-mono text-xl text-red-400">¥ {totalJPY.toLocaleString()}</span>
                </p>
                
                {shippingFeeJPY > 0 && (
                    <p className="flex justify-between text-sm pt-1 text-slate-300">
                        <span>單筆運費 (Shipping JPY)</span>
                        <span className="font-mono">¥ {shippingFeeJPY.toLocaleString()}</span>
                    </p>
                )}

                <p className="flex justify-between pt-2 border-t border-slate-600 mt-2 font-black text-xl italic">
                    <span>最終台幣總額 (NT$)</span>
                    <span className="font-mono text-2xl text-yellow-400">NT$ {totalTWD.toLocaleString()}</span>
                </p>
            </div>

            <div className="pt-4 sticky bottom-0 bg-white/90 backdrop-blur-sm pb-2 border-t-2 border-yellow-400 mt-4">
                <button 
                    type="button"
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-black italic text-xl hover:bg-red-700 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-1 active:shadow-none active:translate-x-1 border-2 border-slate-900" 
                    onClick={handleSubmit}
                >
                    <CheckCircle size={20} className="inline mr-2" /> 
                    {totalJPY === 0 && currentOrder ? '確認取消訂單' : (currentOrder ? '確認修改訂單' : '提交訂單 (PLUS ULTRA!)')}
                </button>
            </div>
        </div>
    );
}