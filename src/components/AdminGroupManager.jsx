// src/components/AdminGroupManager.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { 
    Trash2, Plus, Save, ArrowLeft, Package, Edit3, X, User, 
    ShoppingCart, Calculator, Truck, ListFilter, Tag, CreditCard, 
    Clock, Calendar, ChevronRight, ChevronDown, Folder,
    Info // 🟢 補上缺失的圖示
} from 'lucide-react';

const AdminGroupManager = ({ onOpenSecondPay }) => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]); 
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOrders, setGroupOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({}); 
  const navigate = useNavigate();

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
    } catch (error) {
      console.error("讀取失敗", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { initData(); }, []);

  const groupedGroups = useMemo(() => {
    const groupsMap = {};
    groups.forEach(group => {
      const cat = group.sheetCategory || "未分類";
      if (!groupsMap[cat]) groupsMap[cat] = [];
      groupsMap[cat].push(group);
    });
    return Object.keys(groupsMap).sort().reduce((obj, key) => {
        obj[key] = groupsMap[key];
        return obj;
    }, {});
  }, [groups]);

  const toggleFolder = (cat) => {
    setExpandedFolders(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSelectGroup = async (group) => {
      setSelectedGroup(group);
      setGroupOrders([]); 
      try {
          const ordersRef = collection(db, ...ORDERS_PATH);
          const q = query(ordersRef, where("groupId", "==", group.id));
          const snap = await getDocs(q);
          setGroupOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
          console.error("讀取訂單失敗", error);
      }
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const groupDocRef = doc(db, ...GROUPS_PATH, selectedGroup.id);
      const { id, ...groupData } = selectedGroup;
      groupData.updatedAt = new Date().toISOString();
      
      if (groupData.trackingStatus === '已結案') {
          groupData.isArchived = true;
          groupData.status = '已結案'; 
      } else if (groupData.trackingStatus === '二補計算') {
          groupData.status = '二補計算';
      } else {
          groupData.isArchived = false;
          groupData.status = '已成團'; 
      }

      await updateDoc(groupDocRef, groupData);

      const ordersRef = collection(db, ...ORDERS_PATH);
      const orderPromises = groupOrders.map(async (order) => {
          const totalJpy = order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
          const totalTwd = Math.ceil(totalJpy * (selectedGroup.exchangeRate || 0));

          const orderPayload = {
              groupId: selectedGroup.id, 
              userId: order.userId,
              userName: order.userName,
              items: order.items, 
              totalJpy, totalTwd,
              updatedAt: new Date().toISOString()
          };

          if (order.isNew) {
              const { isNew, id, ...cleanPayload } = orderPayload; 
              cleanPayload.createdAt = new Date().toISOString();
              return addDoc(ordersRef, cleanPayload);
          } else {
              const orderDocRef = doc(db, ...ORDERS_PATH, order.id);
              return updateDoc(orderDocRef, orderPayload);
          }
      });

      await Promise.all(orderPromises);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, ...groupData } : g));
      alert("✅ 儲存成功！");
    } catch (error) {
      alert("❌ 儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("⚠️ 確定要刪除整個團務嗎？")) return;
    try {
      await deleteDoc(doc(db, ...GROUPS_PATH, groupId));
      setSelectedGroup(null);
      initData();
    } catch (error) {
      alert("刪除失敗");
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...selectedGroup.items];
    newItems[index][field] = value;
    setSelectedGroup({ ...selectedGroup, items: newItems });
  };
  const handleAddItem = () => setSelectedGroup({ ...selectedGroup, items: [...(selectedGroup.items || []), { id: Date.now(), name: "", spec: "", price: "", image: "" }] });
  const handleDeleteItem = (index) => setSelectedGroup({ ...selectedGroup, items: selectedGroup.items.filter((_, i) => i !== index) });
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
  const handleOrderAddItem = (idx) => {
      const no = [...groupOrders]; no[idx].items.push({ itemId: "", name: "", quantity: 1, price: 0, spec: "" });
      setGroupOrders(no);
  };
  const handleOrderItemChange = (oidx, iidx, field, value) => {
      const no = [...groupOrders];
      if (field === 'itemId') {
          const p = selectedGroup.items.find(i => String(i.id) === String(value));
          if (p) {
              no[oidx].items[iidx] = { ...no[oidx].items[iidx], itemId: p.id, name: p.name, price: p.price, spec: p.spec || "" };
          }
      } else { no[oidx].items[iidx][field] = value; }
      setGroupOrders(no);
  };
  const handleOrderRemoveItem = (oidx, iidx) => {
      const no = [...groupOrders];
      no[oidx].items = no[oidx].items.filter((_, i) => i !== iidx);
      setGroupOrders(no);
  };
  const calculateOrderTotal = (order) => {
      return order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest italic">Syncing Base...</div>;

  return (
    <div className="flex h-[calc(100vh-160px)] bg-gray-100 overflow-hidden text-sm rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a]">
      
      {/* 🟢 左側：樹狀清單區域 */}
      <div className="w-1/3 md:w-1/4 bg-white border-r-4 border-slate-900 flex flex-col">
        <div className="p-4 border-b-4 border-slate-900 bg-slate-900 flex justify-between items-center text-white">
          <h2 className="font-black italic tracking-tighter uppercase flex items-center gap-2">
              <Folder size={18} className="text-yellow-400"/> Mission List
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
          {Object.entries(groupedGroups).map(([category, items]) => (
            <div key={category} className="mb-1">
                <button 
                    onClick={() => toggleFolder(category)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-white text-left font-black text-slate-700 transition-colors uppercase tracking-tight"
                >
                    {expandedFolders[category] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    <Folder size={16} className={`transition-colors ${expandedFolders[category] ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`}/>
                    <span className="truncate flex-1 text-[10px]">{category}</span>
                    <span className="text-[10px] bg-slate-900 text-white px-1.5 rounded font-mono">{items.length}</span>
                </button>
                
                {expandedFolders[category] && (
                    <div className="space-y-0.5 mt-0.5">
                        {items.map(group => (
                            <div 
                                key={group.id} 
                                onClick={() => handleSelectGroup(group)}
                                className={`group ml-4 pl-4 pr-2 py-2.5 cursor-pointer border-l-4 transition-all flex justify-between items-center rounded-r-lg ${selectedGroup?.id === group.id ? 'bg-blue-600 border-yellow-400 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:bg-slate-200/50 hover:border-slate-400'}`}
                            >
                                <div className="truncate flex-1">
                                    <div className="truncate font-bold leading-tight">{group.title}</div>
                                    <div className={`text-[9px] font-black uppercase mt-0.5 ${selectedGroup?.id === group.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {group.trackingStatus}
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        onOpenSecondPay(group.id);
                                    }}
                                    className={`p-1.5 rounded transition-all transform hover:scale-110 active:scale-95 ${selectedGroup?.id === group.id ? 'text-yellow-400 hover:bg-blue-700' : 'text-slate-400 hover:bg-white hover:text-blue-600 shadow-sm border border-transparent hover:border-slate-200'}`}
                                    title="設定國際運二補"
                                >
                                    <Calculator size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 右側：編輯內容區 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {selectedGroup ? (
          <>
            <div className="p-4 bg-white border-b-4 border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-10">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 italic uppercase tracking-tighter">
                    <Edit3 size={20} className="text-blue-600"/> {selectedGroup.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 uppercase tracking-widest">
                        Folder: {selectedGroup.sheetCategory || "Unclassified"}
                    </span>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => handleDeleteGroup(selectedGroup.id)} className="flex-1 md:flex-none px-4 py-2 text-red-600 hover:bg-red-50 border-2 border-transparent hover:border-red-200 rounded font-black text-xs uppercase transition-all">Delete</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none px-6 py-2 bg-slate-900 text-yellow-400 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] font-black text-xs uppercase tracking-widest active:translate-y-0.5 active:shadow-none transition-all">
                    {saving ? "Saving..." : "Save Mission"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. 基本資訊 */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm">
                    <h3 className="text-sm font-black mb-4 text-slate-900 border-b-2 border-slate-100 pb-2 flex items-center gap-2 uppercase italic tracking-tighter">
                        <Info size={16} className="text-blue-600"/> Basic Intel
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Mission Title</label>
                            <input type="text" value={selectedGroup.title} onChange={e => setSelectedGroup({...selectedGroup, title: e.target.value})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold focus:border-slate-900 outline-none transition-colors" />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">Folder Name (Sorting)</label>
                            <input 
                                list="category-list"
                                type="text" 
                                value={selectedGroup.sheetCategory || ""} 
                                onChange={e => setSelectedGroup({...selectedGroup, sheetCategory: e.target.value})} 
                                className="w-full border-2 border-blue-200 p-2 rounded-lg font-bold bg-blue-50/50 focus:border-blue-600 outline-none transition-colors" 
                                placeholder="e.g. 2025.12 Jump Festa"
                            />
                            <datalist id="category-list">
                                {Object.keys(groupedGroups).map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Group Type</label>
                            <select value={selectedGroup.type || "預購"} onChange={e => setSelectedGroup({...selectedGroup, type: e.target.value})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold bg-white">
                                {["預購", "現貨", "個人委託"].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Tracking Status</label>
                            <select value={selectedGroup.trackingStatus || "下單中"} onChange={e => setSelectedGroup({...selectedGroup, trackingStatus: e.target.value})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold bg-white">
                                {["下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Exchange Rate</label>
                            <input type="number" step="0.001" value={selectedGroup.exchangeRate} onChange={e => setSelectedGroup({...selectedGroup, exchangeRate: Number(e.target.value)})} className="w-full border-2 border-slate-200 p-2 rounded-lg font-mono font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">Domestic Ship (¥)</label>
                            <input type="number" value={selectedGroup.shippingFee || 0} onChange={e => setSelectedGroup({...selectedGroup, shippingFee: Number(e.target.value)})} className="w-full border-2 border-blue-100 p-2 rounded-lg font-mono font-bold bg-blue-50/30" />
                        </div>
                    </div>
                </div>

                {/* 2. 商品明細 */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase italic tracking-tighter">
                            <Package size={16} className="text-blue-600"/> Items List
                        </h3>
                        <button onClick={handleAddItem} className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">+ Add Item</button>
                    </div>
                    <div className="space-y-2">
                        {selectedGroup.items?.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                                <input type="text" placeholder="Name" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="flex-1 p-1.5 border-2 border-transparent bg-transparent focus:bg-white focus:border-slate-200 rounded text-sm font-bold"/>
                                <input type="text" placeholder="Spec" value={item.spec} onChange={e => handleItemChange(index, 'spec', e.target.value)} className="w-24 p-1.5 border-2 border-transparent bg-transparent focus:bg-white focus:border-slate-200 rounded text-sm font-bold"/>
                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400">¥</span>
                                    <input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-16 text-sm font-black text-blue-600 outline-none text-right"/>
                                </div>
                                <button onClick={() => handleDeleteItem(index)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. 成員喊單 */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><User size={120}/></div>
                    <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase italic tracking-tighter relative z-10">
                            <User size={16} className="text-blue-600"/> Hero Orders
                        </h3>
                        <button onClick={handleAddOrder} className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm relative z-10">+ New Order</button>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {groupOrders.map((order, oidx) => {
                            const totalJpy = calculateOrderTotal(order);
                            const totalTwd = Math.ceil(totalJpy * (selectedGroup.exchangeRate || 0));
                            return (
                                <div key={order.id} className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <select value={order.userId} onChange={(e) => handleOrderUserChange(oidx, e.target.value)} className="p-1.5 border-2 border-slate-200 rounded-lg font-black text-blue-600 bg-white text-sm outline-none focus:border-blue-400">
                                            <option value="">-- Select Member --</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Est. Subtotal</span>
                                            <div className="font-black text-red-600 italic text-lg">NT$ {totalTwd.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="pl-4 border-l-4 border-slate-200 space-y-2">
                                        {order.items?.map((item, iidx) => (
                                            <div key={iidx} className="flex gap-2 items-center">
                                                <select 
                                                    value={item.itemId} 
                                                    onChange={(e) => handleOrderItemChange(oidx, iidx, 'itemId', e.target.value)}
                                                    className="flex-1 p-1.5 border border-slate-200 rounded bg-white text-xs font-bold"
                                                >
                                                    <option value="">-- Choose Item --</option>
                                                    {selectedGroup.items?.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}
                                                </select>
                                                <div className="flex items-center gap-1 bg-slate-200 px-2 rounded">
                                                    <span className="text-[10px] font-bold text-slate-500">x</span>
                                                    <input type="number" value={item.quantity} onChange={(e) => handleOrderItemChange(oidx, iidx, 'quantity', e.target.value)} className="w-10 p-1 bg-transparent text-center font-black text-slate-700 outline-none text-xs"/>
                                                </div>
                                                <button onClick={() => handleOrderRemoveItem(oidx, iidx)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleOrderAddItem(oidx)} className="text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors uppercase tracking-widest flex items-center gap-1 mt-2">
                                            <Plus size={12}/> Append Item
                                        </button>
                                    </div>
                                    <div className="text-right mt-3 pt-2 border-t border-slate-200">
                                        <button onClick={() => handleDeleteOrder(oidx)} className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors uppercase italic tracking-tighter">Remove Order Record</button>
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