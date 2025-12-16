import React, { useState, useEffect } from 'react';
import { 
    Search, Plus, Edit3, Trash2, Tag, 
    ShoppingCart, Truck, ExternalLink, MapPin, 
    List, ArrowUp, ArrowDown, CheckCircle, AlertCircle 
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Modal from "./Modal"; // 記得確認路徑

const IP_LIMIT = 10;

export default function VendorsTab({ currentUser, isAdmin }) {
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // 讓這個 Component 自己管理自己的 Modal 狀態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [viewingIpsVendor, setViewingIpsVendor] = useState(null);
    
    const [readStatusTick, setReadStatusTick] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVendors(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        });
        return () => unsub();
    }, []);

    const filteredVendors = vendors.filter(v => 
        (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (Array.isArray(v.products) 
            ? v.products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
            : (v.products || v.ips || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這張卡片嗎？")) return;
        try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", id)); } 
        catch (e) { console.error("刪除失敗", e); alert("刪除失敗"); }
    };

    const handleMoveVendor = async (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= vendors.length) return;
        const itemA = vendors[index];
        const itemB = vendors[targetIndex];
        const orderA = itemA.order || Date.now();
        const orderB = itemB.order || (Date.now() + 1);
        try {
            const batch = writeBatch(db);
            const refA = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", itemA.id);
            const refB = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", itemB.id);
            batch.update(refA, { order: orderB });
            batch.update(refB, { order: orderA });
            await batch.commit();
        } catch (e) { console.error("排序失敗", e); }
    };

    const checkIsNew = (vendor) => {
        const type = 'jf26';
        const timeKey = vendor.updatedAt || vendor.createdAt; 
        if (!timeKey) return false;

        const itemKey = `${type}_${vendor.id}`;
        const localKey = `read_${currentUser.id}_${type}_${vendor.id}`;

        let lastRead = currentUser?.readHistory?.[itemKey];
        if (!lastRead) {
            lastRead = localStorage.getItem(localKey);
        }

        if (!lastRead) return true;
        return new Date(timeKey) > new Date(lastRead);
    };

    const markAsRead = async (vendor) => {
        const type = 'jf26';
        const now = new Date().toISOString();
        const itemKey = `${type}_${vendor.id}`;
        const localKey = `read_${currentUser.id}_${type}_${vendor.id}`;

        localStorage.setItem(localKey, now);
        setReadStatusTick(t => t + 1);

        if (currentUser && currentUser.id) {
            try {
                const userRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id);
                await setDoc(userRef, {
                    readHistory: { [itemKey]: now }
                }, { merge: true });
            } catch (e) { console.error("同步失敗", e); }
        }
    };

    const getTagStyle = (tag) => {
        switch(tag) {
            case "事前受注": return "bg-yellow-400 text-slate-900 border-slate-900";
            case "事後通販": return "bg-blue-500 text-white border-slate-900";
            case "場販限定": return "bg-red-600 text-white border-slate-900";
            default: return "bg-white text-slate-800 border-slate-900";
        }
    };

    return (
        <div>
            {/* 搜尋 & 新增 */}
            <div className="mb-10 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full h-12 rounded-xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] transition-all focus-within:ring-4 focus-within:ring-yellow-400/50 overflow-hidden flex items-center">
                    <div className="pl-4 pr-2 flex items-center justify-center text-slate-900">
                        <Search size={24} strokeWidth={3} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="搜尋攤商名稱 或 IP..." 
                        className="w-full h-full bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium text-lg" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} 
                        className="w-full md:w-auto px-6 h-12 bg-slate-900 text-yellow-400 rounded-xl border-4 border-slate-900 font-black shadow-[4px_4px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#FACC15] flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                        <Plus size={24} strokeWidth={3} /> 新增攤商
                    </button>
                )}
            </div>

            {/* 卡片列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor, index) => {
                    const productList = Array.isArray(vendor.products) ? vendor.products : [];
                    const showEllipsis = productList.length > IP_LIMIT;
                    const displayedProducts = showEllipsis ? productList.slice(0, IP_LIMIT) : productList;
                    const isNew = checkIsNew(vendor);

                    return (
                         <div key={vendor.id} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[8px_8px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#FACC15] transition-all duration-200 flex flex-col relative group">
                            
                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-900 z-10"></div>
                            
                            {isNew && (
                                <div className="absolute -top-4 -left-3 bg-red-600 text-white text-xs font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000] transform -rotate-6 z-20 border-2 border-slate-900">
                                    NEW!
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4 pr-4 border-b-2 border-slate-100 pb-2">
                                <h3 className="font-black text-2xl text-slate-900 leading-tight italic">{vendor.name}</h3>
                                {isAdmin && (
                                    <div className="flex flex-col gap-1 ml-2 shrink-0">
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }} className="p-1.5 bg-white text-slate-900 rounded border-2 border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]" title="編輯"><Edit3 size={14} strokeWidth={2.5} /></button>
                                            <button onClick={() => handleDelete(vendor.id)} className="p-1.5 bg-red-500 text-white rounded border-2 border-slate-900 hover:bg-red-600 shadow-[2px_2px_0px_0px_#000]" title="刪除"><Trash2 size={14} strokeWidth={2.5} /></button>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleMoveVendor(index, -1)} disabled={index === 0} className="p-1.5 bg-slate-200 text-slate-900 rounded border-2 border-slate-900 hover:bg-slate-300 disabled:opacity-50" title="上移"><ArrowUp size={14} strokeWidth={2.5} /></button>
                                            <button onClick={() => handleMoveVendor(index, 1)} disabled={index === vendors.length - 1} className="p-1.5 bg-slate-200 text-slate-900 rounded border-2 border-slate-900 hover:bg-slate-300 disabled:opacity-50" title="下移"><ArrowDown size={14} strokeWidth={2.5} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {vendor.tags && vendor.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {vendor.tags.map(tag => (
                                        <span key={tag} className={`text-[11px] font-black px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${getTagStyle(tag)}`}>{tag}</span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-4 flex-1">
                                <div>
                                    <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1 uppercase tracking-wider"><Tag size={12}/> 參與作品 (IPs)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {displayedProducts.map((ip, idx) => (
                                            <span key={idx} className="bg-yellow-50 text-slate-900 text-xs font-bold px-2 py-1 border-2 border-slate-200 transition-transform hover:scale-105 hover:border-slate-900 hover:bg-yellow-200">{ip}</span>
                                        ))}
                                        {showEllipsis && (
                                            <button onClick={() => { 
                                                setViewingIpsVendor(vendor); 
                                                markAsRead(vendor);
                                            }} className="bg-slate-800 text-white text-xs font-bold px-2 py-1 border-2 border-slate-900 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1">
                                                <List size={12}/> MORE...
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 bg-slate-50 p-3 rounded border-2 border-slate-200 relative">
                                    {vendor.preOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-1 border border-slate-900 mr-2">事前</span>
                                            <span className="font-bold text-slate-700">{vendor.preOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.postOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-blue-500 text-white px-1 border border-slate-900 mr-2">事後</span>
                                            <span className="font-bold text-slate-700">{vendor.postOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.tags?.includes("場販限定") && (
                                        <div className="text-sm flex items-center gap-2 text-red-600 font-black">
                                            <MapPin size={14} /> 僅限 JUMP FESTA 現場
                                        </div>
                                    )}
                                </div>
                                {vendor.notes && (
                                    <div className="flex items-start gap-2 bg-red-50 p-2 rounded border-2 border-red-100">
                                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold text-red-600 leading-relaxed">{vendor.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3 pt-4 border-t-2 border-slate-100">
                                <div className="flex gap-2">
                                    {vendor.preOrder?.url && (
                                        <a href={vendor.preOrder.url} onClick={() => markAsRead(vendor)} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-yellow-400 text-slate-900 text-center font-black rounded border-2 border-slate-900 hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none">
                                        <ShoppingCart size={14} strokeWidth={3} /> 事前受注
                                        </a>
                                    )}
                                   {vendor.postOrder?.url && (
                                        <a href={vendor.postOrder.url} onClick={() => markAsRead(vendor)} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-blue-500 text-white text-center font-black rounded border-2 border-slate-900 hover:bg-blue-400 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none">
                                        <Truck size={14} strokeWidth={3} /> 事後通販
                                        </a>
                                    )}
                                </div>
                                    {vendor.mainUrl && (
                                        <a href={vendor.mainUrl} onClick={() => markAsRead(vendor)} target="_blank" rel="noreferrer" className="block w-full py-2 bg-slate-100 text-slate-700 text-center font-black rounded border-2 border-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm">
                                            <ExternalLink size={16} /> 攤商/活動官網
                                        </a>
                                    )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingVendor(null); }} title={editingVendor ? "EDIT VENDOR" : "NEW VENDOR"}>
                <VendorForm 
                    initialData={editingVendor} 
                    onSubmit={async (data) => {
                        try {
                            if (editingVendor) {
                                await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", editingVendor.id), { ...data, updatedAt: new Date().toISOString() });
                                alert("更新成功！");
                            } else {
                                await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), { ...data, order: Date.now(), updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
                                alert("新增成功！");
                            }
                            setIsModalOpen(false);
                        } catch(e) { console.error("儲存失敗", e); alert("儲存失敗"); }
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
            
            {/* IP Viewer (Read Only Modal) */}
            {viewingIpsVendor && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border-4 border-slate-900 overflow-hidden">
                        <div className="bg-slate-900 px-4 py-3 border-b-4 border-yellow-400 flex justify-between items-center">
                            <h3 className="font-black text-lg text-white flex items-center gap-2 truncate italic">
                                <Tag size={20} className="text-yellow-400"/> {viewingIpsVendor.name}
                            </h3>
                            <button onClick={() => setViewingIpsVendor(null)} className="text-slate-400 hover:text-white transition-colors">x</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50">
                             <div className="flex flex-wrap gap-2">
                                {(Array.isArray(viewingIpsVendor.products) ? viewingIpsVendor.products : []).map((ip, idx) => (
                                    <span key={idx} className="bg-white text-slate-900 text-sm font-bold px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#ccc]">{ip}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function VendorForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        mainUrl: initialData?.mainUrl || '',
        preOrder: { period: initialData?.preOrder?.period || '', url: initialData?.preOrder?.url || '' },
        postOrder: { period: initialData?.postOrder?.period || '', url: initialData?.postOrder?.url || '' },
        tags: initialData?.tags || [], 
        products: initialData?.products || [],
        notes: initialData?.notes || ''
    });

    const handleTagChange = (tag) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
            return { ...prev, tags: newTags };
        });
    };

    const handleProductsChange = (e) => {
        const val = e.target.value;
        const arr = val.split(/[,，、]/).map(s => s.trim()).filter(s => s);
        setFormData({ ...formData, products: arr });
    };

    const inputClass = "w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0 focus:shadow-[4px_4px_0px_0px_#FACC15] transition-all";
    const labelClass = "block text-xs font-black text-slate-700 mb-1 uppercase tracking-wide";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div>
                <label className={labelClass}>攤商名稱</label>
                <input className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
                <label className={labelClass}>官方網址 (Main URL)</label>
                <input className={inputClass} value={formData.mainUrl} onChange={e => setFormData({...formData, mainUrl: e.target.value})} placeholder="https://..." />
            </div>
            <div>
                <label className={labelClass}>販售類型</label>
                <div className="flex gap-3">
                    {["事前受注", "事後通販", "場販限定"].map(tag => (
                        <label key={tag} className={`flex-1 cursor-pointer border-2 rounded px-2 py-2 text-center text-xs font-black transition-all ${formData.tags.includes(tag) ? 'bg-slate-900 text-yellow-400 border-slate-900 shadow-[2px_2px_0px_0px_#FACC15] transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                            <input type="checkbox" className="hidden" checked={formData.tags.includes(tag)} onChange={() => handleTagChange(tag)} />
                            {formData.tags.includes(tag) && <CheckCircle size={10} className="inline mr-1" />}
                            {tag}
                        </label>
                    ))}
                </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded border-2 border-yellow-200 space-y-2">
                <p className={labelClass + " text-yellow-700 border-b border-yellow-200 pb-1"}>事前受注設定</p>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">期間</label>
                    <input className={inputClass} value={formData.preOrder.period} onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, period: e.target.value}})} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">連結</label>
                    <input className={inputClass} value={formData.preOrder.url} onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, url: e.target.value}})} />
                </div>
            </div>
            <div className="bg-blue-50 p-3 rounded border-2 border-blue-200 space-y-2">
                <p className={labelClass + " text-blue-700 border-b border-blue-200 pb-1"}>事後通販設定</p>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">期間</label>
                    <input className={inputClass} value={formData.postOrder.period} onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, period: e.target.value}})} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">連結</label>
                    <input className={inputClass} value={formData.postOrder.url} onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, url: e.target.value}})} />
                </div>
            </div>
            <div>
                <label className={labelClass}>參與 IP (作品)</label>
                <textarea className={inputClass + " h-20"} defaultValue={formData.products.join(', ')} onChange={handleProductsChange} placeholder="請用逗號分隔..." />
            </div>
            <div>
                <label className={labelClass}>備註</label>
                <input className={inputClass} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t-2 border-slate-200 mt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded border-2 border-slate-300 font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">取消</button>
                <button type="submit" className="px-6 py-2 rounded bg-slate-900 text-yellow-400 font-black border-2 border-slate-900 hover:bg-slate-800 shadow-[4px_4px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all">儲存 (SAVE)</button>
            </div>
        </form>
    );
}