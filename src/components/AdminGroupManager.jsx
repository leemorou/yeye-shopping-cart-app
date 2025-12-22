// src/components/AdminGroupManager.jsx
import * as XLSX from 'xlsx';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { 
    Trash2, Plus, Save, ArrowLeft, Package, Edit3, X, User, 
    ShoppingCart, Calculator, Truck, ListFilter, Tag, CreditCard, 
    Clock, Calendar, ChevronRight, ChevronDown, Folder,
    Info, FileUp, CheckCircle2 
} from 'lucide-react';

const AdminGroupManager = ({ onOpenSecondPay }) => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]); 
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOrders, setGroupOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({}); 

  const GROUPS_PATH = ["artifacts", "default-app-id", "public", "data", "groups"];
  const USERS_PATH = ["artifacts", "default-app-id", "public", "data", "users"];
  const ORDERS_PATH = ["artifacts", "default-app-id", "public", "data", "orders"];

  const initData = async () => {
    setLoading(true);
    try {
      const groupRef = collection(db, ...GROUPS_PATH);
      const groupQ = query(groupRef, orderBy("createdAt", "desc")); 
      const groupSnap = await getDocs(groupQ);
      const groupData = groupSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupData);

      if (groupData.length > 0) {
        const firstCat = groupData[0].sheetCategory || "未分類";
        setExpandedFolders({ [firstCat]: true });
      }

      const userRef = collection(db, ...USERS_PATH);
      const userSnap = await getDocs(userRef);
      setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error("讀取失敗", error); } finally { setLoading(false); }
  };

  useEffect(() => { initData(); }, []);

  // --- 輔助功能 ---
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`✅ 已複製 ${label} 的英雄 ID`); 
  };

  const handleDownloadTemplate = () => {
    try {
        const wsItemsData = [["商品名稱 (必填)", "規格 (選填)", "日幣單價 (必填)"], ["範例立牌", "A款", 1200]];
        const wsItems = XLSX.utils.aoa_to_sheet(wsItemsData);
        const wsOrdersData = [
            ["用戶 ID (請勿修改)", "成員姓名 (僅供參考)", "商品名稱", "規格", "數量"], 
            ...users.map(u => [u.id, u.name, "", "", 1]) 
        ];
        const wsOrders = XLSX.utils.aoa_to_sheet(wsOrdersData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsItems, "商品清單");
        XLSX.utils.book_append_sheet(wb, wsOrders, "成員訂單");
        XLSX.writeFile(wb, `Template_${selectedGroup.title}.xlsx`);
    } catch (error) { alert("❌ 生成範本失敗"); }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsItems = wb.Sheets["商品清單"];
            const rawItems = XLSX.utils.sheet_to_json(wsItems);
            const newItems = rawItems.map((item, idx) => ({
                id: `item-${Date.now()}-${idx}`,
                name: String(item["商品名稱 (必填)"] || ""),
                spec: String(item["規格 (選填)"] || ""),
                price: Number(item["日幣單價 (必填)"] || 0),
            }));

            const wsOrders = wb.Sheets["成員訂單"];
            const rawOrders = XLSX.utils.sheet_to_json(wsOrders);
            const orderMap = {};
            rawOrders.forEach(row => {
                const excelId = row["用戶 ID (請勿修改)"];
                const sysUser = users.find(u => u.id === String(excelId));
                if (sysUser && row["商品名稱"]) {
                    if (!orderMap[sysUser.id]) {
                        orderMap[sysUser.id] = { id: `temp-${Date.now()}-${sysUser.id}`, isNew: true, userId: sysUser.id, userName: sysUser.name, items: [] };
                    }
                    const prod = newItems.find(i => i.name === String(row["商品名稱"]) && i.spec === String(row["規格"] || ""));
                    if (prod) {
                        orderMap[sysUser.id].items.push({ itemId: prod.id, name: prod.name, spec: prod.spec, price: prod.price, quantity: Number(row["數量"] || 1) });
                    }
                }
            });
            setSelectedGroup(prev => ({ ...prev, items: newItems }));
            setGroupOrders(Object.values(orderMap));
            alert("✅ 導入成功！");
        } catch (err) { alert("❌ 導入失敗"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const groupDocRef = doc(db, ...GROUPS_PATH, selectedGroup.id);
      const { id, ...groupData } = selectedGroup;
      groupData.updatedAt = new Date().toISOString();
      groupData.status = groupData.trackingStatus === '已結案' ? '已結案' : (groupData.trackingStatus === '二補計算' ? '二補計算' : '已成團');
      groupData.isArchived = groupData.status === '已結案';
      await updateDoc(groupDocRef, groupData);

      const ordersRef = collection(db, ...ORDERS_PATH);
      const orderPromises = groupOrders.map(async (order) => {
          const totalJpy = order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
          const totalTwd = Math.ceil(totalJpy * (selectedGroup.exchangeRate || 0));
          const orderPayload = { groupId: selectedGroup.id, userId: order.userId, userName: order.userName, items: order.items, totalJpy, totalTwd, updatedAt: new Date().toISOString() };
          if (order.isNew) {
              const { isNew, id: tempId, ...cleanPayload } = orderPayload;
              cleanPayload.createdAt = new Date().toISOString();
              return addDoc(ordersRef, cleanPayload);
          } else {
              return updateDoc(doc(db, ...ORDERS_PATH, order.id), orderPayload);
          }
      });
      await Promise.all(orderPromises);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, ...groupData } : g));
      alert("✅ 儲存成功！");
    } catch (error) { alert("❌ 儲存失敗"); } finally { setSaving(false); }
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group); setGroupOrders([]); 
    try {
        const ordersRef = collection(db, ...ORDERS_PATH);
        const q = query(ordersRef, where("groupId", "==", group.id));
        const snap = await getDocs(q);
        setGroupOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error("讀取訂單失敗", error); }
  };

  // --- UI 組件函式 ---
  const calculateOrderTotal = (order) => order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
  const handleItemChange = (idx, field, val) => { const ni = [...selectedGroup.items]; ni[idx][field] = val; setSelectedGroup({...selectedGroup, items: ni}); };
  const handleAddItem = () => setSelectedGroup({...selectedGroup, items: [...(selectedGroup.items || []), { id: Date.now(), name: "", spec: "", price: "" }]});
  const handleDeleteItem = (idx) => setSelectedGroup({...selectedGroup, items: selectedGroup.items.filter((_, i) => i !== idx)});
  const handleAddOrder = () => setGroupOrders([...groupOrders, { id: `temp-${Date.now()}`, isNew: true, userId: "", userName: "", items: [] }]);
  const handleDeleteOrder = async (idx) => {
    if(!window.confirm("確定刪除？")) return;
    if (!groupOrders[idx].isNew) await deleteDoc(doc(db, ...ORDERS_PATH, groupOrders[idx].id));
    setGroupOrders(groupOrders.filter((_, i) => i !== idx));
  };
  const handleOrderUserChange = (idx, userId) => {
    const u = users.find(u => u.id === userId);
    const no = [...groupOrders]; no[idx].userId = userId; no[idx].userName = u ? u.name : "未知";
    setGroupOrders(no);
  };
  const handleOrderAddItem = (idx) => { const no = [...groupOrders]; no[idx].items.push({ itemId: "", name: "", quantity: 1, price: 0, spec: "" }); setGroupOrders(no); };
  const handleOrderItemChange = (oidx, iidx, field, value) => {
    const no = [...groupOrders];
    if (field === 'itemId') {
        const p = selectedGroup.items.find(i => String(i.id) === String(value));
        if (p) { no[oidx].items[iidx] = { ...no[oidx].items[iidx], itemId: p.id, name: p.name, price: p.price, spec: p.spec || "" }; }
    } else { no[oidx].items[iidx][field] = value; }
    setGroupOrders(no);
  };
  const handleOrderRemoveItem = (oidx, iidx) => { const no = [...groupOrders]; no[oidx].items = no[oidx].items.filter((_, i) => i !== iidx); setGroupOrders(no); };
  const handleDeleteGroup = async (id) => { if (window.confirm("確定刪除？")) { await deleteDoc(doc(db, ...GROUPS_PATH, id)); setSelectedGroup(null); initData(); } };
  const toggleFolder = (cat) => { setExpandedFolders(p => ({ ...p, [cat]: !p[cat] })); };

  const groupedGroups = useMemo(() => {
    const map = {};
    groups.forEach(g => { const cat = g.sheetCategory || "未分類"; if (!map[cat]) map[cat] = []; map[cat].push(g); });
    return Object.keys(map).sort().reduce((obj, key) => { obj[key] = map[key]; return obj; }, {});
  }, [groups]);

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse italic">Syncing Base...</div>;

  return (
    <div className="flex h-[calc(100vh-160px)] bg-gray-100 overflow-hidden text-sm rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a]">
      
      {/* 左側 Mission List */}
      <div className="w-1/3 md:w-1/4 bg-white border-r-4 border-slate-900 flex flex-col shrink-0">
          <div className="p-4 border-b-4 border-slate-900 bg-slate-900 text-white font-black uppercase flex items-center gap-2"><Folder size={18} className="text-yellow-400"/> Mission List</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
            {Object.entries(groupedGroups).map(([cat, items]) => (
                <div key={cat} className="mb-1">
                    <button onClick={() => toggleFolder(cat)} className="w-full flex items-center gap-2 p-2 text-left font-black text-slate-700 transition-colors uppercase tracking-tight">
                        {expandedFolders[cat] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        <Folder size={16} className={expandedFolders[cat] ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}/>
                        <span className="truncate flex-1 text-[10px]">{cat}</span>
                    </button>
                    {expandedFolders[cat] && items.map(g => (
                        <div key={g.id} onClick={() => handleSelectGroup(g)} className={`group ml-4 pl-4 pr-2 py-2.5 cursor-pointer border-l-4 transition-all flex justify-between items-center rounded-r-lg ${selectedGroup?.id === g.id ? 'bg-blue-600 border-yellow-400 text-white shadow-md' : 'border-slate-200 hover:bg-slate-100'}`}>
                            <div className="truncate flex-1">
                                <div className="truncate font-bold leading-tight">{g.title}</div>
                                <div className={`text-[9px] font-black uppercase ${selectedGroup?.id === g.id ? 'text-blue-100' : 'text-slate-400'}`}>{g.trackingStatus}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onOpenSecondPay(g.id); }} className={`p-1.5 rounded transition-all ${selectedGroup?.id === g.id ? 'text-yellow-400' : 'text-slate-400'}`}><Calculator size={16} /></button>
                        </div>
                    ))}
                </div>
            ))}
          </div>
      </div>

      {/* 右側編輯內容 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {selectedGroup ? (
          <>
            <div className="p-4 bg-white border-b-4 border-slate-900 flex flex-col gap-4 z-10">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 text-slate-900 italic uppercase break-all leading-tight">
                        <Edit3 size={24} className="text-blue-600 shrink-0"/> {selectedGroup.title}
                    </h2>
                    <span className="text-[10px] w-fit font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200 uppercase tracking-widest">Folder: {selectedGroup.sheetCategory || "Unclassified"}</span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t-2 border-slate-50">
                    <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-2 border-2 border-emerald-600 border-dashed font-black text-[10px] uppercase transition-all"><Calendar size={14} /> Download Template</button>
                    <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                    <label htmlFor="excel-upload" className="cursor-pointer flex-1 md:flex-none px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 border-2 border-blue-600 border-dashed font-black text-[10px] uppercase transition-all"><FileUp size={14} /> Import Excel</label>
                    <div className="h-8 w-[2px] bg-slate-100 mx-1 hidden md:block"></div>
                    <button onClick={() => handleDeleteGroup(selectedGroup.id)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] font-black text-[10px] uppercase transition-all active:translate-y-0.5 active:shadow-none"><Trash2 size={14} /> Delete Mission</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-slate-900 text-yellow-400 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] font-black text-[10px] uppercase tracking-widest active:translate-y-0.5 active:shadow-none transition-all">{saving ? "Saving..." : <><Save size={14} /> Save Mission</>}</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. Basic Intel (包含修正後的已收款選項) */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm">
                    <h3 className="text-sm font-black mb-4 text-slate-900 border-b-2 border-slate-100 pb-2 flex items-center gap-2 uppercase italic"><Info size={16} className="text-blue-600"/> Basic Intel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Mission Title</label>
                            <input type="text" value={selectedGroup.title} onChange={e => setSelectedGroup({...selectedGroup, title: e.target.value})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold outline-none focus:border-slate-900" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">Folder Name</label>
                            <input list="category-list" type="text" value={selectedGroup.sheetCategory || ""} onChange={e => setSelectedGroup({...selectedGroup, sheetCategory: e.target.value})} className="w-full border-2 border-blue-200 p-2 rounded-lg font-bold bg-blue-50/50 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Tracking Status</label>
                            <select value={selectedGroup.trackingStatus || "下單中"} onChange={e => setSelectedGroup({...selectedGroup, trackingStatus: e.target.value})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold bg-white">
                                {["下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* 🟢 加入「已收款」選項 */}
                        <div>
                            <label className="block text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">Payment Status</label>
                            <select 
                                value={selectedGroup.paymentStatus || "未收款"} 
                                onChange={e => setSelectedGroup({...selectedGroup, paymentStatus: e.target.value})} 
                                className={`w-full border-2 p-2 rounded-lg font-black bg-white transition-colors ${selectedGroup.paymentStatus === '已收款' ? 'bg-emerald-600 border-slate-900 text-white shadow-[2px_2px_0px_0px_#000]' : (selectedGroup.paymentStatus && selectedGroup.paymentStatus !== '未收款' ? 'border-emerald-500 text-emerald-600' : 'border-slate-200')}`}
                            >
                                {["未收款", "商品收款中", "二補收款中", "商品+二補收款中", "已收款"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Rate</label><input type="number" step="0.001" value={selectedGroup.exchangeRate} onChange={e => setSelectedGroup({...selectedGroup, exchangeRate: Number(e.target.value)})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-mono font-bold" /></div>
                        <div><label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">Shipping (¥)</label><input type="number" value={selectedGroup.shippingFee || 0} onChange={e => setSelectedGroup({...selectedGroup, shippingFee: Number(e.target.value)})} className="w-full border-2 border-blue-100 p-2 rounded-lg font-mono font-bold bg-blue-50/30" /></div>
                    </div>
                </div>

                {/* 2. Items List */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase italic"><Package size={16} className="text-blue-600"/> Items List</h3>
                        <button onClick={handleAddItem} className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase hover:bg-slate-700">+ Add Item</button>
                    </div>
                    <div className="space-y-2">
                        {selectedGroup.items?.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                                <input type="text" placeholder="Name" value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} className="flex-1 p-1.5 border-2 border-transparent bg-transparent focus:bg-white rounded text-sm font-bold"/>
                                <input type="text" placeholder="Spec" value={item.spec} onChange={e => handleItemChange(idx, 'spec', e.target.value)} className="w-24 p-1.5 border-2 border-transparent bg-transparent focus:bg-white rounded text-sm font-bold"/>
                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><span className="text-[10px] font-bold text-slate-400">¥</span><input type="number" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} className="w-16 text-sm font-black text-blue-600 outline-none text-right"/></div>
                                <button onClick={() => handleDeleteItem(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Hero Orders */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase italic relative z-10"><User size={16} className="text-blue-600"/> Hero Orders</h3>
                        <button onClick={handleAddOrder} className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase shadow-sm relative z-10">+ New Order</button>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {groupOrders.map((order, oidx) => {
                            const totalTwd = Math.ceil(calculateOrderTotal(order) * (selectedGroup.exchangeRate || 0));
                            return (
                                <div key={order.id} className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <select value={order.userId} onChange={(e) => handleOrderUserChange(oidx, e.target.value)} className="p-1.5 border-2 border-slate-200 rounded-lg font-black text-blue-600 bg-white text-xs outline-none focus:border-blue-400">
                                                <option value="">-- Select Member --</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                            {order.userId && (
                                                <button onClick={() => copyToClipboard(order.userId, order.userName)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all transform hover:scale-110"><Tag size={14} /></button>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Subtotal</span>
                                            <div className="font-black text-red-600 italic text-lg">NT$ {totalTwd.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="pl-4 border-l-4 border-slate-200 space-y-2">
                                        {order.items?.map((item, iidx) => (
                                            <div key={iidx} className="flex gap-2 items-center">
                                                <select value={item.itemId} onChange={(e) => handleOrderItemChange(oidx, iidx, 'itemId', e.target.value)} className="flex-1 p-1.5 border border-slate-200 rounded bg-white text-xs font-bold">
                                                    <option value="">-- Choose Item --</option>
                                                    {selectedGroup.items?.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}
                                                </select>
                                                <div className="flex items-center gap-1 bg-slate-200 px-2 rounded">
                                                    <span className="text-[10px] font-bold text-slate-500">x</span>
                                                    <input type="number" value={item.quantity} onChange={(e) => handleOrderItemChange(oidx, iidx, 'quantity', e.target.value)} className="w-10 p-1 bg-transparent text-center font-black text-slate-700 outline-none text-xs"/>
                                                </div>
                                                <button onClick={() => handleOrderRemoveItem(oidx, iidx)} className="text-slate-300 hover:text-red-500"><X size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleOrderAddItem(oidx)} className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase flex items-center gap-1 mt-2"><Plus size={12}/> Append Item</button>
                                    </div>
                                    <div className="text-right mt-3 pt-2 border-t border-slate-200">
                                        <button onClick={() => handleDeleteOrder(oidx)} className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors uppercase italic">Remove Order Record</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-200 bg-slate-50/30 uppercase tracking-[0.2em]">
            <ShoppingCart size={100} strokeWidth={1} className="mb-4 opacity-20 text-slate-400"/>
            <p className="text-xl font-black italic text-slate-300">Select Mission</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGroupManager;