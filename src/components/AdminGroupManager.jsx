// src/AdminGroupManager.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Trash2, Plus, Save, ArrowLeft, Package, Edit3, X, User, ShoppingCart, Calculator, Truck, ListFilter, Tag, CreditCard, Clock, Calendar } from 'lucide-react';

const GROUP_TYPES = ["預購", "現貨", "個人委託"];

const STATUS_STEPS = [
    "下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"
];

const PAYMENT_STATUS_OPTIONS = [
    "未收款", "商品收款中", "商品已收款", "二補收款中", "二補已收款", "商品+二補收款中", "商品+二補已收款"
];

const AdminGroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]); 
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOrders, setGroupOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setGroups(groupSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

  const handleSelectGroup = async (group) => {
      setSelectedGroup(group);
      setGroupOrders([]); 
      try {
          const ordersRef = collection(db, ...ORDERS_PATH);
          const q = query(ordersRef, where("groupId", "==", group.id));
          const snap = await getDocs(q);
          const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setGroupOrders(orders);
      } catch (error) {
          console.error("讀取訂單失敗", error);
      }
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      // (A) 儲存團務基本資料
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

      // (B) 儲存訂單資料
      const ordersRef = collection(db, ...ORDERS_PATH);
      const orderPromises = groupOrders.map(async (order) => {
          const totalJpy = order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
          const totalTwd = Math.ceil(totalJpy * (selectedGroup.exchangeRate || 0));

          const orderPayload = {
              groupId: selectedGroup.id, 
              userId: order.userId,
              userName: order.userName,
              items: order.items, 
              totalJpy,
              totalTwd,
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

      // 🟢 關鍵修正：這裡要手動更新左側列表 (groups state)
      // 這樣你切換到別團再切回來，資料才會是剛剛存好的最新版
      setGroups(prevGroups => prevGroups.map(g => 
        g.id === selectedGroup.id ? { ...g, ...groupData } : g
      ));

      alert("✅ 儲存成功！");
      // 不需要重新 handleSelectGroup，因為現在畫面上的就是最新的

    } catch (error) {
      console.error("儲存失敗", error);
      alert("❌ 儲存失敗：" + error.message);
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
  const handleAddItem = () => {
    const newItem = { id: Date.now(), name: "", spec: "", price: "", image: "" };
    setSelectedGroup({ ...selectedGroup, items: [...(selectedGroup.items || []), newItem] });
  };
  const handleDeleteItem = (index) => {
    const newItems = selectedGroup.items.filter((_, i) => i !== index);
    setSelectedGroup({ ...selectedGroup, items: newItems });
  };

  const handleAddOrder = () => {
    const newOrder = { id: `temp-${Date.now()}`, isNew: true, userId: "", userName: "", items: [] };
    setGroupOrders([...groupOrders, newOrder]);
  };
  const handleDeleteOrder = async (orderIndex) => {
    if(!window.confirm("確定刪除此單？")) return;
    const targetOrder = groupOrders[orderIndex];
    if (!targetOrder.isNew) await deleteDoc(doc(db, ...ORDERS_PATH, targetOrder.id));
    const newOrders = groupOrders.filter((_, i) => i !== orderIndex);
    setGroupOrders(newOrders);
  };
  const handleOrderUserChange = (orderIndex, userId) => {
      const targetUser = users.find(u => u.id === userId);
      const newOrders = [...groupOrders];
      newOrders[orderIndex].userId = userId;
      newOrders[orderIndex].userName = targetUser ? targetUser.name : "未知用戶";
      setGroupOrders(newOrders);
  };
  const handleOrderAddItem = (orderIndex) => {
      const newOrders = [...groupOrders];
      newOrders[orderIndex].items.push({ itemId: "", name: "", quantity: 1, price: 0, spec: "" });
      setGroupOrders(newOrders);
  };
  const handleOrderItemChange = (orderIndex, itemIndex, field, value) => {
      const newOrders = [...groupOrders];
      const targetOrderItem = newOrders[orderIndex].items[itemIndex];
      if (field === 'itemId') {
          const product = selectedGroup.items.find(i => String(i.id) === String(value));
          if (product) {
              targetOrderItem.itemId = product.id;
              targetOrderItem.name = product.name; 
              targetOrderItem.price = product.price;
              targetOrderItem.spec = product.spec || "";
          }
      } else {
          targetOrderItem[field] = value;
      }
      setGroupOrders(newOrders);
  };
  const handleOrderRemoveItem = (orderIndex, itemIndex) => {
      const newOrders = [...groupOrders];
      newOrders[orderIndex].items = newOrders[orderIndex].items.filter((_, i) => i !== itemIndex);
      setGroupOrders(newOrders);
  };
  const calculateOrderTotal = (order) => {
      return order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-700">團務列表</h2>
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-blue-600 flex items-center"><ArrowLeft size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map(group => (
            <div key={group.id} onClick={() => handleSelectGroup(group)} className={`p-4 border-b cursor-pointer hover:bg-blue-50 ${selectedGroup?.id === group.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}>
              <h3 className="font-bold text-gray-800 truncate">{group.title}</h3>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className={`px-2 py-0.5 rounded-full ${group.type === '現貨' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {group.type || '預購'}
                </span>
                <span className="font-bold text-gray-600 ml-1">{group.trackingStatus}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-blue-800"><Edit3 size={20}/> {selectedGroup.title}</h2>
              <div className="flex gap-2">
                <button onClick={() => handleDeleteGroup(selectedGroup.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-2"><Trash2 size={18}/> 刪除</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 shadow"><Save size={18}/> {saving ? "儲存中..." : "儲存變更"}</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="max-w-6xl mx-auto space-y-6">
                
                {/* 1. 基本資訊 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">基本資訊</h3>
                    <div className="grid grid-cols-4 gap-4">
                        
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">團務名稱</label>
                            <input type="text" value={selectedGroup.title} onChange={e => setSelectedGroup({...selectedGroup, title: e.target.value})} className="w-full border p-2 rounded" placeholder="團務名稱"/>
                        </div>
                        
                        {/* 訂單類型 */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Tag size={14}/> 訂單類型</label>
                            <select value={selectedGroup.type || "預購"} onChange={e => setSelectedGroup({...selectedGroup, type: e.target.value})} className="w-full border p-2 rounded bg-white">
                                {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* 物流狀態 */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><ListFilter size={14}/> 物流狀態</label>
                            <select value={selectedGroup.trackingStatus || "下單中"} onChange={e => setSelectedGroup({...selectedGroup, trackingStatus: e.target.value})} className="w-full border p-2 rounded bg-white">
                                {STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* 匯率 */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">匯率</label>
                            <input type="number" value={selectedGroup.exchangeRate} onChange={e => setSelectedGroup({...selectedGroup, exchangeRate: Number(e.target.value)})} className="w-full border p-2 rounded" placeholder="0.21"/>
                        </div>
                        
                        {/* 境內運 */}
                        <div>
                            <label className="block text-xs font-bold text-blue-600 mb-1 flex items-center gap-1"><Truck size={14}/> 境內運 (日幣)</label>
                            <input type="number" value={selectedGroup.domesticShippingFee || 0} onChange={e => setSelectedGroup({...selectedGroup, domesticShippingFee: Number(e.target.value)})} className="w-full border p-2 rounded bg-blue-50 border-blue-200" placeholder="0"/>
                        </div>

                        {/* 收款狀態 */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><CreditCard size={14}/> 收款狀態</label>
                            <select value={selectedGroup.paymentStatus || "未收款"} onChange={e => setSelectedGroup({...selectedGroup, paymentStatus: e.target.value})} className="w-full border p-2 rounded bg-white">
                                {PAYMENT_STATUS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* 截止/希望購買時間 */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock size={14}/> 截止/希望購買時間</label>
                            <input 
                                type="datetime-local" 
                                value={selectedGroup.deadline || ""} 
                                onChange={e => setSelectedGroup({...selectedGroup, deadline: e.target.value})} 
                                className="w-full border p-2 rounded"
                            />
                        </div>

                        {/* 預計發售日 */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Calendar size={14}/> 預計發售日</label>
                            <input 
                                type="text" 
                                value={selectedGroup.releaseDate || ""} 
                                onChange={e => setSelectedGroup({...selectedGroup, releaseDate: e.target.value})} 
                                className="w-full border p-2 rounded" 
                                placeholder="例如：2025年5月下旬"
                            />
                        </div>

                        {/* 表單連結 */}
                        <div className="col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">表單連結</label>
                            <input type="text" value={selectedGroup.infoUrl} onChange={e => setSelectedGroup({...selectedGroup, infoUrl: e.target.value})} className="w-full border p-2 rounded text-blue-600" placeholder="https://..."/>
                        </div>
                    </div>
                </div>

                {/* 2. 商品明細 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Package size={20}/> 商品清單 (輸入日幣)</h3>
                        <button onClick={handleAddItem} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold hover:bg-green-200 flex items-center gap-1"><Plus size={16}/> 加商品</button>
                    </div>
                    <div className="space-y-2">
                        {selectedGroup.items && selectedGroup.items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                                <input type="text" placeholder="商品名稱" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="flex-1 p-1 border rounded text-sm"/>
                                <input type="text" placeholder="規格" value={item.spec} onChange={e => handleItemChange(index, 'spec', e.target.value)} className="w-24 p-1 border rounded text-sm"/>
                                <div className="relative w-24">
                                    <span className="absolute left-2 top-1.5 text-gray-400 text-xs">¥</span>
                                    <input type="number" placeholder="日幣" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-full pl-5 p-1 border rounded text-sm"/>
                                </div>
                                <button onClick={() => handleDeleteItem(index)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. 成員訂單 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2"><User size={20}/> 成員喊單 (自動算台幣)</h3>
                        <button onClick={handleAddOrder} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200 flex items-center gap-1"><Plus size={16}/> 新增訂單</button>
                    </div>
                    <div className="space-y-4">
                        {groupOrders.map((order, oIndex) => {
                            const { totalJpy, totalTwd } = calculateOrderTotal(order);
                            return (
                                <div key={order.id} className="border rounded-lg p-4 bg-gray-50 relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <label className="font-bold text-gray-600">會員：</label>
                                            <select value={order.userId} onChange={(e) => handleOrderUserChange(oIndex, e.target.value)} className="p-1 border rounded bg-white">
                                                <option value="">-- 請選擇 --</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div className="text-sm font-bold text-gray-500">
                                                商品總額: <span className="text-red-600">¥{totalJpy}</span>
                                            </div>
                                            <button onClick={() => handleDeleteOrder(oIndex)} className="text-xs text-red-400 hover:text-red-600 underline">刪除</button>
                                        </div>
                                    </div>
                                    <div className="pl-4 border-l-2 border-gray-300 space-y-2">
                                        {order.items && order.items.map((item, iIndex) => (
                                            <div key={iIndex} className="flex gap-2 items-center">
                                                <select 
                                                    value={item.itemId} 
                                                    onChange={(e) => handleOrderItemChange(oIndex, iIndex, 'itemId', e.target.value)}
                                                    className="flex-1 p-1 border rounded text-sm"
                                                >
                                                    <option value="">-- 選擇商品 --</option>
                                                    {selectedGroup.items && selectedGroup.items.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>
                                                    ))}
                                                </select>
                                                <input type="number" value={item.quantity} onChange={(e) => handleOrderItemChange(oIndex, iIndex, 'quantity', e.target.value)} className="w-16 p-1 border rounded text-sm text-center"/>
                                                <span className="text-sm text-gray-500">個</span>
                                                <button onClick={() => handleOrderRemoveItem(oIndex, iIndex)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleOrderAddItem(oIndex)} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12}/> 加入商品</button>
                                    </div>
                                </div>
                            );
                        })}
                        {groupOrders.length === 0 && <p className="text-center text-gray-400 py-4">此團目前沒有任何訂單</p>}
                    </div>
                </div>

              </div>
            </div>
          </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={64} className="mb-4 opacity-20"/>
                <p>請選擇左側團務來管理</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminGroupManager;