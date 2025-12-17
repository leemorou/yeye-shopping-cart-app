// src/components/AdminGroupManager.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
// 引入必要的圖示
import { 
    Trash2, Plus, Save, ArrowLeft, Package, Edit3, X, User, 
    ShoppingCart, Calculator, Truck, ListFilter, Tag, CreditCard, 
    Clock, Calendar, ChevronRight, ChevronDown, Folder 
} from 'lucide-react';

const GROUP_TYPES = ["預購", "現貨", "個人委託"];
const STATUS_STEPS = ["下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"];
const PAYMENT_STATUS_OPTIONS = ["未收款", "商品收款中", "商品已收款", "二補收款中", "二補已收款", "商品+二補收款中", "商品+二補已收款"];

const AdminGroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]); 
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOrders, setGroupOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({}); // 🟢 控制資料夾展開/收合
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

      // 🟢 預設打開第一個分類
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

  // 🟢 核心邏輯：將扁平資料轉換為樹狀分組
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

  // --- 表單控制邏輯 (維持你原本的邏輯) ---
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

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-sm">
      
      {/* 🟢 左側：樹狀清單區域 */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col shadow-inner">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-700 tracking-tighter uppercase">團務樹狀總表</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.entries(groupedGroups).map(([category, items]) => (
            <div key={category} className="rounded overflow-hidden">
                {/* 📂 分類大標題 */}
                <button 
                    onClick={() => toggleFolder(category)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 text-left font-bold text-slate-600 border-b border-slate-50"
                >
                    {expandedFolders[category] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    <Folder size={16} className="text-yellow-500 fill-yellow-500"/>
                    <span className="truncate flex-1">{category}</span>
                    <span className="text-[10px] bg-slate-200 px-1.5 rounded-full">{items.length}</span>
                </button>
                
                {/* 📜 團務子項目 */}
                {expandedFolders[category] && (
                    <div className="bg-slate-50/50">
                        {items.map(group => (
                            <div 
                                key={group.id} 
                                onClick={() => handleSelectGroup(group)}
                                className={`pl-8 pr-4 py-2.5 cursor-pointer border-l-2 transition-all hover:bg-blue-50/50 ${selectedGroup?.id === group.id ? 'bg-blue-50 border-l-blue-600 font-bold text-blue-700' : 'border-l-transparent text-slate-500'}`}
                            >
                                <div className="truncate">{group.title}</div>
                                <div className="text-[10px] opacity-60 flex justify-between mt-1">
                                    <span>{group.trackingStatus}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 右側：編輯內容區 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-blue-800"><Edit3 size={20}/> {selectedGroup.title}</h2>
                <p className="text-xs text-slate-400">目前分類：{selectedGroup.sheetCategory || "未分類"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDeleteGroup(selectedGroup.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-2 font-bold"><Trash2 size={18}/> 刪除</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 shadow-lg font-bold">{saving ? "儲存中..." : "儲存所有變更"}</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* 1. 基本資訊與分類控制 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">基本資訊與分類</h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">團務名稱</label>
                            <input type="text" value={selectedGroup.title} onChange={e => setSelectedGroup({...selectedGroup, title: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        
                        {/* 🟢 分類控制：決定該團屬於哪個標題資料夾 */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-blue-600 mb-1">標題分類 (變更後會移動資料夾)</label>
                            <input 
                                list="category-list"
                                type="text" 
                                value={selectedGroup.sheetCategory || ""} 
                                onChange={e => setSelectedGroup({...selectedGroup, sheetCategory: e.target.value})} 
                                className="w-full border p-2 rounded bg-blue-50 border-blue-200" 
                                placeholder="例如：團務累計總表 2025.11"
                            />
                            <datalist id="category-list">
                                {Object.keys(groupedGroups).map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1"><Tag size={14}/> 訂單類型</label>
                            <select value={selectedGroup.type || "預購"} onChange={e => setSelectedGroup({...selectedGroup, type: e.target.value})} className="w-full border p-2 rounded">
                                {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1"><ListFilter size={14}/> 物流狀態</label>
                            <select value={selectedGroup.trackingStatus || "下單中"} onChange={e => setSelectedGroup({...selectedGroup, trackingStatus: e.target.value})} className="w-full border p-2 rounded">
                                {STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">匯率</label>
                            <input type="number" value={selectedGroup.exchangeRate} onChange={e => setSelectedGroup({...selectedGroup, exchangeRate: Number(e.target.value)})} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-blue-600 mb-1"><Truck size={14}/> 境內運 (日幣)</label>
                            <input type="number" value={selectedGroup.domesticShippingFee || 0} onChange={e => setSelectedGroup({...selectedGroup, domesticShippingFee: Number(e.target.value)})} className="w-full border p-2 rounded bg-blue-50" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1"><CreditCard size={14}/> 收款狀態</label>
                            <select value={selectedGroup.paymentStatus || "未收款"} onChange={e => setSelectedGroup({...selectedGroup, paymentStatus: e.target.value})} className="w-full border p-2 rounded">
                                {PAYMENT_STATUS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1"><Clock size={14}/> 截止日期</label>
                            <input type="datetime-local" value={selectedGroup.deadline || ""} onChange={e => setSelectedGroup({...selectedGroup, deadline: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1"><Calendar size={14}/> 發售月份</label>
                            <input type="text" value={selectedGroup.releaseDate || ""} onChange={e => setSelectedGroup({...selectedGroup, releaseDate: e.target.value})} className="w-full border p-2 rounded" placeholder="2025.11"/>
                        </div>
                    </div>
                </div>

                {/* 2. 商品明細 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Package size={20}/> 商品清單</h3>
                        <button onClick={handleAddItem} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold hover:bg-green-200">+ 新增商品</button>
                    </div>
                    <div className="space-y-2">
                        {selectedGroup.items?.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                                <input type="text" placeholder="名稱" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="flex-1 p-1 border rounded text-sm"/>
                                <input type="text" placeholder="規格" value={item.spec} onChange={e => handleItemChange(index, 'spec', e.target.value)} className="w-24 p-1 border rounded text-sm"/>
                                <input type="number" placeholder="日幣" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-24 p-1 border rounded text-sm font-bold text-blue-600"/>
                                <button onClick={() => handleDeleteItem(index)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. 成員喊單 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2"><User size={20}/> 成員喊單登記</h3>
                        <button onClick={handleAddOrder} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200">+ 新增訂單</button>
                    </div>
                    <div className="space-y-4">
                        {groupOrders.map((order, oidx) => {
                            const totalJpy = calculateOrderTotal(order);
                            const totalTwd = Math.ceil(totalJpy * (selectedGroup.exchangeRate || 0));
                            return (
                                <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-center mb-3">
                                        <select value={order.userId} onChange={(e) => handleOrderUserChange(oidx, e.target.value)} className="p-1 border rounded font-bold text-blue-600">
                                            <option value="">-- 請選擇會員 --</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                        <div className="text-right font-black text-red-600 italic">NT$ {totalTwd}</div>
                                    </div>
                                    <div className="pl-4 border-l-2 border-slate-300 space-y-2">
                                        {order.items?.map((item, iidx) => (
                                            <div key={iidx} className="flex gap-2 items-center">
                                                <select 
                                                    value={item.itemId} 
                                                    onChange={(e) => handleOrderItemChange(oidx, iidx, 'itemId', e.target.value)}
                                                    className="flex-1 p-1 border rounded text-xs"
                                                >
                                                    <option value="">-- 選擇商品 --</option>
                                                    {selectedGroup.items?.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}
                                                </select>
                                                <input type="number" value={item.quantity} onChange={(e) => handleOrderItemChange(oidx, iidx, 'quantity', e.target.value)} className="w-12 p-1 border rounded text-center font-bold"/>
                                                <button onClick={() => handleOrderRemoveItem(oidx, iidx)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleOrderAddItem(oidx)} className="text-[10px] text-blue-500 underline mt-1">+ 追加品項</button>
                                    </div>
                                    <div className="text-right mt-2"><button onClick={() => handleDeleteOrder(oidx)} className="text-[10px] text-red-300 hover:text-red-600 underline">刪除此單</button></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <ShoppingCart size={80} className="mb-4 opacity-20"/>
            <p className="text-lg font-black italic tracking-widest uppercase">Select a mission from the list</p>
            <p className="text-xs font-bold opacity-60">請從左側點擊資料夾，開始管理您的英雄任務</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGroupManager;