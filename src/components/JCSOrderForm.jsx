// src/components/JCSOrderForm.jsx
import React, { useState, useEffect } from 'react';
import { 
    Clock3, ExternalLink, Ticket, Edit3, 
    Package, CheckCircle, XCircle, Clock, Plus, X 
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import Modal from "./Modal"; 

// 用戶 ID 與顯示名稱對照表
const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function JCSLotteryTab({ currentUser, isAdmin }) {
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({ exchangeRate: 0.24 }); 
    const [editingOrder, setEditingOrder] = useState(null);

    // 取得當前使用者的暱稱 (用於比對 assignments 裡的 user)
    const myNickName = USER_MAPPING[currentUser?.id] || currentUser?.name || "";

    useEffect(() => {
        // 1. 監聽訂單資料
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrders(list.sort((a, b) => (a.index || 0) - (b.index || 0)));
        });

        // 2. 監聽匯率設定
        const unsubSettings = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), (d) => {
            if (d.exists()) setSettings(d.data());
        });

        return () => { unsubOrders(); unsubSettings(); };
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
            default: return 'bg-white text-slate-900 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Banner 區域 */}
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden mb-10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JUMP CHARACTERS STORE 抽選</h3>
                        <div className="space-y-1 font-bold text-white">
                             <p className="flex items-center gap-2"><Clock3 size={18} className="text-yellow-400"/> 抽選期間：12/17 ~ 12/21</p>
                             <a href="https://jumpcs.shueisha.co.jp/shop/default.aspx" target="_blank" rel="noreferrer" className="flex items-center gap-2 underline hover:text-yellow-300"><ExternalLink size={18} /> 抽選網站</a>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 transform rotate-2">
                        匯率參考：{settings.exchangeRate}
                    </div>
                </div>
            </div>

            {/* 訂單卡片列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => {
                    let displayItems = [];
                    let orderTotalYen = 0;

                    if (isAdmin) {
                        displayItems = order.items || [];
                        orderTotalYen = displayItems
                            .filter(i => i.status === 'WON')
                            .reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
                    } else {
                        // 普通用戶邏輯：從 assignments 中篩選出自己的分配
                        (order.items || []).forEach(item => {
                            const myAs = item.assignments?.find(a => a.user === myNickName);
                            if (myAs) {
                                displayItems.push({
                                    ...item,
                                    userQty: myAs.qty,
                                    userTotal: Number(item.price) * Number(myAs.qty)
                                });
                                if (item.status === 'WON') {
                                    orderTotalYen += (Number(item.price) * Number(myAs.qty));
                                }
                            }
                        });
                    }

                    // 如果不是管理員且該訂單沒分配給自己，則不顯示
                    if (!isAdmin && displayItems.length === 0) return null;

                    return (
                        <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8] hover:translate-y-[-2px] transition-all">
                             <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                 <h4 className="font-black italic text-lg flex items-center gap-2">
                                     <Ticket className="text-purple-400" size={20}/> ORDER #{order.id.replace('order_', '')}
                                 </h4>
                                 {isAdmin && (
                                     <button onClick={() => setEditingOrder(order)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-500">
                                         <Edit3 size={12}/>
                                     </button>
                                 )}
                             </div>

                             <div className="p-4 space-y-3 min-h-[150px]">
                                 {displayItems.map((item, idx) => (
                                     <div key={idx} className={`p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                         <div className="flex justify-between items-start">
                                             <div className="flex-1">
                                                 <div className="font-bold text-sm">{item.name}</div>
                                                 <div className="text-[10px] font-mono text-slate-500 mt-1">
                                                     ¥{item.price} x {isAdmin ? item.qty : item.userQty}
                                                     {isAdmin && item.assignments?.length > 0 && (
                                                         <span className="ml-2 text-purple-600 font-bold">
                                                            ({item.assignments.map(a => `${a.user}${a.qty}`).join(',')})
                                                         </span>
                                                     )}
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 <div className="font-mono font-black text-sm">
                                                     ¥{((isAdmin ? item.qty : item.userQty) * item.price).toLocaleString()}
                                                 </div>
                                                 <div className="text-[9px] font-bold text-slate-400">
                                                     ≈ NT$ {Math.ceil((isAdmin ? item.qty : item.userQty) * item.price * settings.exchangeRate)}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 ))}

                                 {/* 結算區塊 */}
                                 <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-200 flex justify-between items-end">
                                     <div className="text-[10px] font-black text-slate-400 uppercase">
                                         {isAdmin ? "Full Order (WON)" : "My Subtotal (WON)"}
                                     </div>
                                     <div className="text-right">
                                         <div className="text-xl font-black text-slate-900 font-mono">
                                             ¥{orderTotalYen.toLocaleString()}
                                         </div>
                                         <div className="text-xs font-black text-purple-600">
                                             TWD ${Math.ceil(orderTotalYen * settings.exchangeRate).toLocaleString()}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    );
                })}
            </div>

            {/* 編輯 Modal */}
            <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`編輯訂單 #${editingOrder?.id}`}>
                {editingOrder && (
                    <JCSOrderForm 
                        initialData={editingOrder}
                        onSubmit={async (data) => {
                            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", editingOrder.id), data);
                            setEditingOrder(null);
                        }}
                        onCancel={() => setEditingOrder(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

// 內部表單組件
function JCSOrderForm({ initialData, onSubmit, onCancel }) {
    const [items, setItems] = useState(initialData.items || []);

    const handleUpdateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx][field] = value;
        setItems(newItems);
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ items }); }} className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-3 p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border-2 border-slate-200 relative space-y-2">
                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="absolute top-1 right-1 text-slate-300 hover:text-red-500"><X size={16}/></button>
                        <input className="w-full text-xs font-bold border rounded p-1" value={item.name} onChange={e => handleUpdateItem(idx, 'name', e.target.value)} placeholder="品項名稱" required />
                        <div className="flex gap-2">
                            <input type="number" className="w-16 text-xs border rounded p-1" value={item.qty} onChange={e => handleUpdateItem(idx, 'qty', parseInt(e.target.value))} placeholder="數量" />
                            <input type="number" className="flex-1 text-xs border rounded p-1" value={item.price} onChange={e => handleUpdateItem(idx, 'price', parseInt(e.target.value))} placeholder="日幣" />
                            <select className="flex-1 text-[10px] border rounded bg-white font-bold" value={item.status} onChange={e => handleUpdateItem(idx, 'status', e.target.value)}>
                                <option value="PENDING">等待</option>
                                <option value="WON">中選</option>
                                <option value="LOST">落選</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => setItems([...items, { name: '', qty: 1, price: 0, status: 'PENDING', assignments: [] }])} className="w-full py-2 bg-slate-100 border-2 border-dashed rounded text-xs font-bold">+ 新增品項</button>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold border rounded">取消</button>
                <button type="submit" className="px-6 py-2 text-xs font-bold bg-slate-900 text-white rounded shadow-md">儲存</button>
            </div>
        </form>
    );
}