import React, { useState, useEffect } from 'react';
import { 
    Clock3, ExternalLink, Ticket, Edit3, 
    Package, CheckCircle, XCircle, Clock, Plus, X 
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import Modal from "./Modal"; 

export default function JCSLotteryTab({ currentUser, isAdmin }) {
    const [orders, setOrders] = useState(Array.from({ length: 10 }, (_, i) => ({ id: `order_${i+1}`, index: i+1 })));
    const [editingOrder, setEditingOrder] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const dataMap = {};
            snap.docs.forEach(d => { dataMap[d.id] = d.data(); });
            setOrders(prev => prev.map(o => ({
                ...o,
                ...(dataMap[o.id] || { items: [] })
            })));
        });
        return () => unsub();
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
            default: return 'bg-white text-slate-900 border-slate-200';
        }
    };

    return (
        <div>
             <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden mb-10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JUMP CHARACTERS STORE 抽選</h3>
                        <div className="space-y-1 font-bold text-white">
                             <p className="flex items-center gap-2"><Clock3 size={18} className="text-yellow-400"/> 抽選期間：12/17 11:00 ~ 12/21 16:00</p>
                             <a href="https://jumpcs.shueisha.co.jp/shop/default.aspx" target="_blank" rel="noreferrer" className="flex items-center gap-2 underline hover:text-yellow-300"><ExternalLink size={18} /> 抽選網站</a>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 transform rotate-2">
                        抽選結果(23號公布)
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => {
                    const hasItems = order.items && order.items.length > 0;
                    const totalYen = hasItems ? order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0) : 0;
                    
                    return (
                        <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6b21a8] transition-all">
                             <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                 <h4 className="font-black italic text-lg flex items-center gap-2">
                                     <Ticket className="text-purple-400" size={20}/> ORDER #{order.index}
                                 </h4>
                                 {isAdmin && (
                                     <button onClick={() => setEditingOrder(order)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-500 flex items-center gap-1">
                                         <Edit3 size={12}/> 編輯
                                     </button>
                                 )}
                             </div>

                             <div className="p-4 min-h-[150px]">
                                 {!hasItems ? (
                                     <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold gap-2 py-8">
                                         <Package size={32}/>
                                         <span>等待登記</span>
                                     </div>
                                 ) : (
                                     <div className="space-y-3">
                                         {order.items.map((item, idx) => (
                                             <div key={idx} className={`flex items-center justify-between p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                                 <div className="flex-1">
                                                     <div className="font-bold text-sm">{item.name}</div>
                                                     <div className="text-xs opacity-80">¥{item.price} x {item.qty}</div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <div className="font-mono font-black">¥{item.price * item.qty}</div>
                                                     {item.status === 'WON' && <CheckCircle className="text-green-600" size={18}/>}
                                                     {item.status === 'LOST' && <XCircle className="text-slate-400" size={18}/>}
                                                     {(!item.status || item.status === 'PENDING') && <Clock size={18} className="text-slate-400"/>}
                                                 </div>
                                             </div>
                                         ))}
                                         <div className="border-t-2 border-slate-100 mt-2 pt-2 flex justify-between items-center font-black text-slate-900">
                                             <span>TOTAL</span>
                                             <span className="text-lg">¥{totalYen.toLocaleString()}</span>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`編輯訂單 #${editingOrder?.index}`}>
                {editingOrder && (
                    <JCSOrderForm 
                        initialData={editingOrder}
                        onSubmit={async (data) => {
                            try {
                                await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", editingOrder.id), data);
                                setEditingOrder(null);
                            } catch(e) { console.error(e); alert("儲存失敗"); }
                        }}
                        onCancel={() => setEditingOrder(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

function JCSOrderForm({ initialData, onSubmit, onCancel }) {
    const [items, setItems] = useState(initialData.items || []);

    const handleAddItem = () => {
        setItems([...items, { name: '', qty: 1, price: 0, status: 'PENDING' }]);
    };

    const handleUpdateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx][field] = value;
        setItems(newItems);
    };

    const handleRemoveItem = (idx) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ items }); }} className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4 p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border-2 border-slate-200 relative">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><X size={16}/></button>
                        <div className="space-y-2 pr-6">
                            <input 
                                className="w-full text-sm font-bold border border-slate-300 rounded p-1" 
                                placeholder="品項名稱"
                                value={item.name}
                                onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                                required
                            />
                            <div className="flex gap-2">
                                <input 
                                    type="number" className="w-20 text-sm border border-slate-300 rounded p-1" placeholder="數量"
                                    value={item.qty} onChange={e => handleUpdateItem(idx, 'qty', e.target.value)}
                                />
                                <input 
                                    type="number" className="flex-1 text-sm border border-slate-300 rounded p-1" placeholder="單價(¥)"
                                    value={item.price} onChange={e => handleUpdateItem(idx, 'price', e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 text-xs font-bold">
                                {['PENDING', 'WON', 'LOST'].map(status => (
                                    <button 
                                        type="button"
                                        key={status}
                                        onClick={() => handleUpdateItem(idx, 'status', status)}
                                        className={`flex-1 py-1 rounded border ${
                                            item.status === status 
                                            ? (status === 'WON' ? 'bg-green-500 text-white border-green-600' : status === 'LOST' ? 'bg-slate-500 text-white border-slate-600' : 'bg-yellow-400 text-black border-yellow-500')
                                            : 'bg-white text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        {status === 'WON' ? '中選' : status === 'LOST' ? '落選' : '等待'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button type="button" onClick={handleAddItem} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded border-2 border-dashed border-slate-300 hover:bg-slate-200 hover:border-slate-400 flex items-center justify-center gap-2">
                <Plus size={16}/> 新增品項
            </button>

            <div className="flex justify-end gap-2 pt-4 border-t-2 border-slate-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded border font-bold">取消</button>
                <button type="submit" className="px-6 py-2 rounded bg-slate-900 text-white font-bold">儲存變更</button>
            </div>
        </form>
    );
}