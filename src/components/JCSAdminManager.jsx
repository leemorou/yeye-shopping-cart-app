import React, { useState, useEffect } from 'react';
import { 
    Ticket, Database, Edit3, Save, X, Plus, 
    CheckCircle, Clock, Trash2 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, writeBatch } from "firebase/firestore";
import Modal from "./Modal";

const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function JCSAdminManager() {
    const [jcsOrders, setJcsOrders] = useState(Array.from({ length: 10 }, (_, i) => ({ id: `order_${i+1}`, index: i+1 })));
    const [jcsSettings, setJcsSettings] = useState({ totalDomesticShipping: 0, exchangeRate: 0.24 });
    const [editingJcsOrder, setEditingJcsOrder] = useState(null);

    useEffect(() => {
        // 監聽訂單
        const unsubJcsOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const dataMap = {};
            snap.docs.forEach(d => { dataMap[d.id] = d.data(); });
            setJcsOrders(prev => prev.map(o => ({ ...o, ...(dataMap[o.id] || { items: [] }) })));
        });
        // 監聽設定
        const unsubJcsSettings = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), (docSnap) => {
            if (docSnap.exists()) setJcsSettings(docSnap.data());
        });
        return () => { unsubJcsOrders(); unsubJcsSettings(); };
    }, []);

    const handleSaveJcsSettings = async () => {
        try {
            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), jcsSettings);
            alert("JCS 全域設定更新成功！");
        } catch (e) { alert("儲存失敗"); }
    };

    const handleJcsQuickImport = async () => {
        const rawPaste = prompt("請直接貼上 JCS Excel 資料 (ID > 名稱 > 數量 > 單價 > 狀態)：");
        if (!rawPaste) return;
        try {
            const rows = rawPaste.split('\n').filter(row => row.trim() !== '');
            const importData = {};
            rows.forEach(row => {
                const [orderId, name, qty, price, status] = row.split('\t');
                if (!orderId || !name) return;
                const id = orderId.trim();
                if (!importData[id]) importData[id] = { items: [] };
                importData[id].items.push({
                    name: name.trim(),
                    qty: parseInt(qty) || 1,
                    price: parseInt(price) || 0,
                    status: (status || 'PENDING').trim().toUpperCase(),
                    assignedTo: ""
                });
            });
            const batch = writeBatch(db);
            Object.entries(importData).forEach(([docId, data]) => {
                const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", docId);
                batch.set(docRef, data, { merge: true });
            });
            await batch.commit();
            alert("JCS 資料導入成功！");
        } catch (e) { alert("導入失敗：" + e.message); }
    };

    const getStatusColor = (status) => {
        if (status === 'WON') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'LOST') return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
        return 'bg-white text-slate-900 border-slate-200';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] space-y-6">
                <div className="flex justify-between items-center border-b-2 pb-4">
                    <h2 className="text-2xl font-black italic text-slate-800 flex items-center gap-2">
                        <Ticket className="text-purple-600"/> JCS 抽選管理
                    </h2>
                    <button onClick={handleJcsQuickImport} className="px-4 py-2 bg-slate-900 text-yellow-400 rounded-xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#ccc]">
                        <Database size={18}/> 快速導入 Excel
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase">JCS 日本境內總運費 (JPY)</label>
                        <input type="number" className="w-full font-mono font-bold border-2 border-slate-200 rounded-lg py-2 px-3 focus:border-purple-500 outline-none" value={jcsSettings.totalDomesticShipping} onChange={(e) => setJcsSettings({ ...jcsSettings, totalDomesticShipping: Number(e.target.value) })} />
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                        <label className="block text-xs font-black text-yellow-700 mb-2 uppercase">JCS 計算匯率</label>
                        <input type="number" step="0.001" className="w-full font-mono font-bold border-2 border-yellow-200 rounded-lg py-2 px-3 focus:border-yellow-500 outline-none bg-white text-yellow-800" value={jcsSettings.exchangeRate || 0.24} onChange={(e) => setJcsSettings({ ...jcsSettings, exchangeRate: parseFloat(e.target.value) })} />
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                    <button onClick={handleSaveJcsSettings} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_#4c1d95] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#4c1d95] transition-all flex items-center gap-2">
                        <Save size={18}/> 儲存全域設定
                    </button>
                </div>
            </div>

            <JCSAssignmentArea 
                orders={jcsOrders} 
                onSave={async (orderId, updatedItems) => {
                    await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", orderId), 
                    { items: updatedItems }, { merge: true });
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jcsOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8]">
                        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                            <h4 className="font-black italic text-lg flex items-center gap-2">ORDER #{order.index}</h4>
                            <button onClick={() => setEditingJcsOrder(order)} className="text-xs bg-slate-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-600 transition-colors">
                                <Edit3 size={12}/> 編輯
                            </button>
                        </div>
                        <div className="p-4 min-h-[120px] space-y-2">
                            {order.items?.length > 0 ? order.items.map((item, idx) => (
                                <div key={idx} className={`p-2 rounded border-2 text-xs font-bold ${getStatusColor(item.status)}`}>
                                    <div className="flex justify-between">
                                        <span className="truncate w-32">{item.name}</span>
                                        <span>¥{item.price * item.qty}</span>
                                    </div>
                                    {/* 修改顯示：顯示分配狀況 */}
                                    {item.assignments?.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex flex-wrap gap-1">
                                            {item.assignments.map((as, i) => (
                                                <span key={i} className="bg-white/50 px-1 rounded text-[9px]">
                                                    {as.user}: {as.qty}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : <div className="text-slate-300 text-center py-6">無資料</div>}
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={!!editingJcsOrder} onClose={() => setEditingJcsOrder(null)} title={`管理 JCS 訂單 #${editingJcsOrder?.index}`}>
                {editingJcsOrder && <JCSOrderForm initialData={editingJcsOrder} onSubmit={async (data) => {
                    await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", editingJcsOrder.id), data);
                    setEditingJcsOrder(null);
                }} onCancel={() => setEditingJcsOrder(null)} />}
            </Modal>
        </div>
    );
}

function JCSAssignmentArea({ orders, onSave }) {
    // 取得所有中選品項及其來源訂單資訊
    const wonItems = orders.flatMap(order => 
        (order.items || [])
            .map((item, originalIdx) => ({ ...item, orderId: order.id, orderIndex: order.index, originalIdx }))
            .filter(item => item.status === 'WON')
    );

    const handleAddAssignment = (orderId, itemIdx, currentAssignments = []) => {
        const newAssignments = [...currentAssignments, { user: "", qty: 1 }];
        updateItemInOrder(orderId, itemIdx, newAssignments);
    };

    const handleUpdateAssignment = (orderId, itemIdx, assignIdx, field, val, currentAssignments) => {
        const newAssignments = [...currentAssignments];
        newAssignments[assignIdx][field] = val;
        updateItemInOrder(orderId, itemIdx, newAssignments);
    };

    const updateItemInOrder = (orderId, itemIdx, newAssignments) => {
        const order = orders.find(o => o.id === orderId);
        const newItems = [...order.items];
        newItems[itemIdx] = { ...newItems[itemIdx], assignments: newAssignments };
        onSave(orderId, newItems);
    };

    if (wonItems.length === 0) return null;

    return (
        <div className="bg-purple-50 border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_#0f172a]">
            <div className="bg-purple-600 text-white px-6 py-3 flex items-center gap-2">
                <CheckCircle size={20}/>
                <h3 className="font-black italic">JCS 貨物分配中心 (僅顯示中選品項)</h3>
            </div>
            
            <div className="p-4 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs uppercase font-black text-purple-700 border-b-2 border-purple-200">
                            <th className="py-2 px-2">來源</th>
                            <th className="py-2 px-2">品項 (總數)</th>
                            <th className="py-2 px-2">分配明細 (成員 / 數量)</th>
                            <th className="py-2 px-2">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                        {wonItems.map((item, i) => {
                            const assignedTotal = item.assignments?.reduce((sum, a) => sum + (Number(a.qty) || 0), 0) || 0;
                            const isOver = assignedTotal > item.qty;

                            return (
                                <tr key={`${item.orderId}-${item.originalIdx}`} className="bg-white/50 hover:bg-white transition-colors text-sm">
                                    <td className="py-3 px-2 font-mono font-bold text-slate-400">#{item.orderIndex}</td>
                                    <td className="py-3 px-2">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-[10px] text-slate-500">
                                            總數: <span className="font-black">{item.qty}</span> | 
                                            已分: <span className={isOver ? 'text-red-500' : 'text-green-600'}>{assignedTotal}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex flex-wrap gap-2">
                                            {item.assignments?.map((as, aIdx) => (
                                                <div key={aIdx} className="flex items-center gap-1 bg-white border border-slate-300 rounded p-1 shadow-sm">
                                                    <select 
                                                        className="text-xs font-bold border-none p-0 bg-transparent outline-none"
                                                        value={as.user}
                                                        onChange={(e) => handleUpdateAssignment(item.orderId, item.originalIdx, aIdx, 'user', e.target.value, item.assignments)}
                                                    >
                                                        <option value="">選人</option>
                                                        {Object.values(USER_MAPPING).map(name => <option key={name} value={name}>{name}</option>)}
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        className="w-10 text-xs font-bold border-l pl-1 outline-none"
                                                        value={as.qty}
                                                        onChange={(e) => handleUpdateAssignment(item.orderId, item.originalIdx, aIdx, 'qty', parseInt(e.target.value), item.assignments)}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const filtered = item.assignments.filter((_, idx) => idx !== aIdx);
                                                            updateItemInOrder(item.orderId, item.originalIdx, filtered);
                                                        }}
                                                        className="text-slate-300 hover:text-red-500"
                                                    >
                                                        <X size={12}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <button 
                                            onClick={() => handleAddAssignment(item.orderId, item.originalIdx, item.assignments)}
                                            className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded font-black hover:bg-purple-700 transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={12}/> 分配
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function JCSOrderForm({ initialData, onSubmit, onCancel }) {
    const [items, setItems] = useState(initialData.items || []);
    const handleUpdate = (idx, field, val) => { const n = [...items]; n[idx][field] = val; setItems(n); };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ items }); }} className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-3 p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border-2 border-slate-200 relative space-y-2">
                        <button type="button" onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><X size={16}/></button>
                        <input className="w-full text-sm font-bold border rounded p-1" value={item.name} onChange={e=>handleUpdate(idx,'name',e.target.value)} placeholder="品項名稱" required />
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400">QTY:</span>
                                <input type="number" className="w-full text-sm border rounded p-1 font-mono" value={item.qty} onChange={e=>handleUpdate(idx,'qty',parseInt(e.target.value))} />
                            </div>
                            <div className="flex-1 flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400">JPY:</span>
                                <input type="number" className="w-full text-sm border rounded p-1 font-mono" value={item.price} onChange={e=>handleUpdate(idx,'price',parseInt(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {['PENDING', 'WON', 'LOST'].map(s => (
                                <button key={s} type="button" onClick={()=>handleUpdate(idx,'status',s)} className={`flex-1 py-1 rounded text-[10px] font-black border ${item.status===s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-200'}`}>
                                    {s==='WON'?'中選':s==='LOST'?'落選':'等待'}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button type="button" onClick={()=>setItems([...items, {name:'', qty:1, price:0, status:'PENDING', assignments:[]}])} className="w-full py-2 bg-slate-100 border-2 border-dashed border-slate-300 rounded font-bold text-slate-500 hover:bg-slate-200">+ 新增品項</button>
            <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded font-bold text-slate-500 border">取消</button>
                <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded font-bold">儲存變更</button>
            </div>
        </form>
    );
}