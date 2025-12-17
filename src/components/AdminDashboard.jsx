import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, updateDoc, addDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { 
    ArrowLeft, FileSpreadsheet, ListChecks, Megaphone, FileText, 
    Save, Plus, Trash2, Users, ShoppingBag, Ticket, Database, Edit3, X, CheckCircle, Clock
} from 'lucide-react';

import { db } from '../firebase'; 

// 引入子元件
import ComplexExcelImport from "./ComplexExcelImport";
import AdminGroupManager from "./AdminGroupManager";
import RichTextEditor from "./RichTextEditor";
import JSAdminManager from './JF26JSPreOrderAdmin';
import GroupForm from "./GroupForm";
import Modal from "./Modal";
import SecondPaymentForm from "./SecondPaymentForm";

const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('groups'); 
  const [bulletin, setBulletin] = useState("");
  const [tempBulletin, setTempBulletin] = useState("");
  const [miscCharges, setMiscCharges] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [miscForm, setMiscForm] = useState({ title: '', amount: '', targetUserId: '', note: '', paymentStatus: '未付款' });
  const [secondPayGroupId, setSecondPayGroupId] = useState(null);

  // JCS 專屬狀態
  const [jcsOrders, setJcsOrders] = useState(Array.from({ length: 10 }, (_, i) => ({ id: `order_${i+1}`, index: i+1 })));
  const [jcsSettings, setJcsSettings] = useState({ totalDomesticShipping: 0 });
  const [editingJcsOrder, setEditingJcsOrder] = useState(null);

  const isAdmin = currentUser?.name === "葉葉" || currentUser?.id === "yeye";
  const selectedSPGroup = groups.find(g => g.id === secondPayGroupId);

  useEffect(() => {
      if (!isAdmin) return;

      const unsubBulletin = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), (docSnap) => {
          if (docSnap.exists()) {
              setBulletin(docSnap.data().content);
              setTempBulletin(docSnap.data().content);
          }
      });
      const unsubMisc = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "miscCharges"), (snap) => setMiscCharges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubUsers = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "users"), (snap) => setUsersData(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubGroups = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      // JCS 監聽
      const unsubJcsOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
          const dataMap = {};
          snap.docs.forEach(d => { dataMap[d.id] = d.data(); });
          setJcsOrders(prev => prev.map(o => ({ ...o, ...(dataMap[o.id] || { items: [] }) })));
      });
      const unsubJcsSettings = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), (docSnap) => {
          if (docSnap.exists()) setJcsSettings(docSnap.data());
      });

      return () => { 
        unsubBulletin(); unsubMisc(); unsubUsers(); unsubGroups(); unsubOrders(); 
        unsubJcsOrders(); unsubJcsSettings();
      };
  }, [isAdmin]);

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100">
              <div className="bg-white p-10 rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#ef4444] text-center">
                  <h2 className="text-3xl font-black text-red-500 mb-4 italic">ACCESS DENIED</h2>
                  <p className="font-bold text-slate-600">此為英雄禁區，請速速離開！</p>
                  <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-slate-900 text-white font-bold rounded">回首頁</button>
              </div>
          </div>
      );
  }

  // --- JCS 處理函式 ---
  const handleSaveJcsSettings = async () => {
    try {
        await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), jcsSettings);
        alert("JCS 境內運費更新成功！");
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
            if (!importData[orderId.trim()]) importData[orderId.trim()] = { items: [] };
            importData[orderId.trim()].items.push({
                name: name.trim(),
                qty: parseInt(qty) || 1,
                price: parseInt(price) || 0,
                status: (status || 'PENDING').trim().toUpperCase()
            });
        });

        const batch = writeBatch(db);
        Object.entries(importData).forEach(([docId, data]) => {
            const docRef = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", docId);
            batch.set(docRef, data, { merge: true });
        });
        await batch.commit();
        alert("JCS 資料快速導入成功！");
    } catch (e) { alert("導入失敗：" + e.message); }
  };

  const getStatusColor = (status) => {
    if (status === 'WON') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'LOST') return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
    return 'bg-white text-slate-900 border-slate-200';
  };

  // --- 其他原有的邏輯處理函式 ---
  const handleCreateGroup = async (data) => {
      try {
          await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), { 
              ...data, 
              createdAt: new Date().toISOString(), 
              updatedAt: new Date().toISOString(), 
              status: '揪團中', 
              createdBy: '葉葉', 
              exchangeRate: data.exchangeRate || 0.21, 
              shippingFee: 0, 
              secondPayment: {}, 
              paymentStatus: '未收款' 
          });
          setIsModalOpen(false);
          alert("團務發布成功！");
      } catch (e) { alert("發布失敗"); }
  };

  const handleSaveBulletin = async () => {
      try {
          await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), { content: tempBulletin }, { merge: true });
          setBulletin(tempBulletin);
          alert("公告已更新！");
      } catch (e) { alert("更新失敗"); }
  };

  const handleAddMisc = async () => {
      if (!miscForm.title || !miscForm.amount || !miscForm.targetUserId) {
          alert("請完整填寫必填欄位"); return;
      }
      try {
          const targetUser = usersData.find(u => u.id === miscForm.targetUserId);
          await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "miscCharges"), {
              ...miscForm,
              amount: Number(miscForm.amount),
              targetUserName: targetUser ? targetUser.name : 'Unknown',
              createdAt: new Date().toISOString()
          });
          setMiscForm({ title: '', amount: '', targetUserId: '', note: '', paymentStatus: '未付款' });
          alert("雜項費用已新增");
      } catch(e) { console.error(e); }
  };

  const handleUpdateMiscStatus = async (id, newStatus) => {
      try { await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "miscCharges", id), { paymentStatus: newStatus }); } catch (e) { console.error(e); }
  };

  const handleDeleteMisc = async (id) => {
      if(!confirm("確定要刪除嗎？")) return;
      try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "miscCharges", id)); } catch(e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-slate-800">
      <header className="bg-slate-900 text-white shadow-md z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <ArrowLeft size={20} /><span className="hidden sm:inline">回首頁</span>
              </button>
              <h1 className="text-xl font-black italic tracking-wider border-l border-gray-700 pl-4 text-yellow-400">HERO ADMIN</h1>
            </div>

            <nav className="flex flex-wrap justify-center gap-2 bg-slate-800 p-1 rounded-lg">
              {[
                  { id: 'groups', label: '團務管理', icon: ListChecks },
                  { id: 'misc', label: '雜項費用', icon: FileText },
                  { id: 'js_orders', label: 'JF26對帳', icon: ShoppingBag },
                  { id: 'jcs_admin', label: 'JCS管理', icon: Ticket }, // 🟢 新增 Tab
                  { id: 'import', label: 'Excel匯入', icon: FileSpreadsheet },
                  { id: 'bulletin', label: '公告編輯', icon: Megaphone },
                  { id: 'users', label: '成員管理', icon: Users },
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-black transition-all ${activeTab === tab.id ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    <tab.icon size={14} />{tab.label}
                  </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
            {activeTab === 'import' && <ComplexExcelImport />}

            {activeTab === 'groups' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black italic text-slate-800">團務進度管理</h2>
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="px-6 py-2 bg-slate-900 text-white rounded font-black hover:bg-slate-700 flex items-center gap-2 shadow-[4px_4px_0px_0px_#FACC15] transition-all italic"
                        >
                            <Plus size={18} /> 發起新團務
                        </button>
                    </div>
                    <AdminGroupManager onOpenSecondPay={(id) => setSecondPayGroupId(id)} />
                </div>
            )}

            {activeTab === 'js_orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <JSAdminManager currentUser={currentUser} />
                </div>
            )}

            {/* 🟢 JCS 管理區塊 */}
{activeTab === 'jcs_admin' && (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] space-y-6">
            <div className="flex justify-between items-center border-b-2 pb-4">
                <h2 className="text-2xl font-black italic text-slate-800 flex items-center gap-2">
                    <Ticket className="text-purple-600"/> JCS 抽選管理面板
                </h2>
                <button 
                    onClick={handleJcsQuickImport}
                    className="px-4 py-2 bg-slate-900 text-yellow-400 rounded-xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#ccc]"
                >
                    <Database size={18}/> 快速導入 Excel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左側：境內運費設定 */}
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase">JCS 日本境內總運費 (JPY)</label>
                    <div className="flex gap-2">
                        <input 
                            type="number"
                            className="flex-1 font-mono font-bold border-2 border-slate-200 rounded-lg py-2 px-3 focus:border-purple-500 outline-none"
                            value={jcsSettings.totalDomesticShipping}
                            onChange={(e) => setJcsSettings({ ...jcsSettings, totalDomesticShipping: Number(e.target.value) })}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">* 前台將根據「中選件數」自動平分此金額並算入成員帳單</p>
                </div>

                {/* 右側：匯率設定 (🟢 新增) */}
                <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                    <label className="block text-xs font-black text-yellow-700 mb-2 uppercase">JCS 計算匯率</label>
                    <div className="flex gap-2">
                        <input 
                            type="number"
                            step="0.001"
                            className="flex-1 font-mono font-bold border-2 border-yellow-200 rounded-lg py-2 px-3 focus:border-yellow-500 outline-none bg-white text-yellow-800"
                            value={jcsSettings.exchangeRate || 0.24}
                            onChange={(e) => setJcsSettings({ ...jcsSettings, exchangeRate: parseFloat(e.target.value) })}
                        />
                    </div>
                    <p className="text-[10px] text-yellow-600 mt-2 italic">* 此匯率僅適用於 JCS 抽選訂單</p>
                </div>
            </div>

            {/* 底部儲存按鈕 (🟢 統一儲存運費與匯率) */}
            <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                <button 
                    onClick={handleSaveJcsSettings}
                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_#4c1d95] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#4c1d95] active:translate-y-0 active:shadow-none transition-all flex items-center gap-2"
                >
                    <Save size={18}/> 儲存全域設定
                </button>
            </div>
        </div>

                    {/* 🟢 JCS 訂單卡片 (管理員模式) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jcsOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8]">
                                <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                    <h4 className="font-black italic text-lg flex items-center gap-2"><Ticket size={20} className="text-purple-400"/> ORDER #{order.index}</h4>
                                    <button onClick={() => setEditingJcsOrder(order)} className="text-xs bg-slate-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-600 transition-colors">
                                        <Edit3 size={12}/> 分配/編輯
                                    </button>
                                </div>
                                <div className="p-4 min-h-[120px]">
                                    {(!order.items || order.items.length === 0) ? (
                                        <div className="text-slate-300 font-bold text-center py-6">無資料</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className={`p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-bold text-sm">{item.name}</div>
                                                            <div className="text-[10px] opacity-75">¥{item.price} x {item.qty}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-black">¥{item.price * item.qty}</div>
                                                            {item.assignedTo && <div className="text-[10px] font-black bg-white/50 px-1 rounded">歸屬: {item.assignedTo}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white p-10 rounded-2xl border-4 border-slate-900 text-center font-bold text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    成員管理開發中...
                </div>
            )}

            {activeTab === 'bulletin' && (
                <div className="bg-white p-6 rounded-lg shadow border-4 border-slate-900">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b-2">
                        <h2 className="text-xl font-black flex items-center gap-2 italic"><Megaphone className="text-yellow-500"/> 系統公告管理</h2>
                        <button onClick={handleSaveBulletin} className="px-4 py-2 rounded bg-slate-900 text-yellow-400 font-black hover:bg-slate-800 flex items-center gap-2 shadow-[3px_3px_0px_0px_#ccc]"><Save size={18}/> 儲存發布</button>
                    </div>
                    <RichTextEditor initialContent={tempBulletin} onChange={setTempBulletin} />
                </div>
            )}

            {activeTab === 'misc' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border-4 border-slate-900">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-700 italic"><Plus className="text-green-600"/> 新增雜項費用</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-1">對象</label>
                                <select className="w-full border-2 border-slate-200 p-2 rounded font-bold" value={miscForm.targetUserId} onChange={e => setMiscForm({...miscForm, targetUserId: e.target.value})}>
                                    <option value="">-- 選擇使用者 --</option>
                                    {usersData.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-1">明細內容</label>
                                <input type="text" className="w-full border-2 border-slate-200 p-2 rounded font-bold" placeholder="包材費/運費" value={miscForm.title} onChange={e => setMiscForm({...miscForm, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-1">金額 (TWD)</label>
                                <input type="number" className="w-full border-2 border-slate-200 p-2 rounded font-bold" placeholder="0" value={miscForm.amount} onChange={e => setMiscForm({...miscForm, amount: e.target.value})} />
                            </div>
                            <button onClick={handleAddMisc} className="bg-slate-900 text-yellow-400 p-2.5 rounded font-black hover:bg-slate-800 transition-colors">新增紀錄</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow border-4 border-slate-900 overflow-hidden">
                        <table className="w-full text-sm text-left font-bold">
                            <thead className="bg-slate-900 text-white border-b">
                                <tr>
                                    <th className="px-4 py-3 italic">DATE</th>
                                    <th className="px-4 py-3">HERO</th>
                                    <th className="px-4 py-3">TITLE</th>
                                    <th className="px-4 py-3 text-right">AMOUNT</th>
                                    <th className="px-4 py-3 text-center">STATUS</th>
                                    <th className="px-4 py-3 text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {miscCharges.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(m => (
                                    <tr key={m.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-blue-700">{m.targetUserName}</td>
                                        <td className="px-4 py-3">{m.title}</td>
                                        <td className="px-4 py-3 text-right font-mono">${m.amount}</td>
                                        <td className="px-4 py-3 text-center">
                                            <select className={`text-[10px] font-black border-2 rounded px-1.5 py-0.5 ${m.paymentStatus === '已付款' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`} value={m.paymentStatus || '未付款'} onChange={(e) => handleUpdateMiscStatus(m.id, e.target.value)}>
                                                <option value="未付款">未付款</option>
                                                <option value="已付款">已付款</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleDeleteMisc(m.id)} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="發起新團務">
          <GroupForm onSubmit={handleCreateGroup} onCancel={() => setIsModalOpen(false)} submitLabel="發佈團購" />
      </Modal>

      <Modal isOpen={!!secondPayGroupId} onClose={() => setSecondPayGroupId(null)} title="管理國際運二補">
        {selectedSPGroup && (
            <SecondPaymentForm 
                group={selectedSPGroup} 
                orders={orders.filter(o => o.groupId === selectedSPGroup.id)} 
                currentUser={currentUser} 
                onUpdate={async (data) => {
                    await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", selectedSPGroup.id), { secondPayment: data });
                    alert("二補資訊已儲存並同步至前台！");
                    setSecondPayGroupId(null);
                }} 
                isReadOnly={false} 
            />
        )}
      </Modal>

      {/* 🟢 JCS 編輯 Modal (後台專用) */}
      <Modal isOpen={!!editingJcsOrder} onClose={() => setEditingJcsOrder(null)} title={`管理 JCS 訂單 #${editingJcsOrder?.index}`}>
        {editingJcsOrder && (
            <JCSOrderForm 
                initialData={editingJcsOrder}
                onSubmit={async (data) => {
                    await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", editingJcsOrder.id), data);
                    setEditingJcsOrder(null);
                }}
                onCancel={() => setEditingJcsOrder(null)}
            />
        )}
      </Modal>
    </div>
  );
}

// 🟢 JCS 編輯表單 (包含分配下拉選單) - 移至 AdminDashboard 內部
function JCSOrderForm({ initialData, onSubmit, onCancel }) {
    const [items, setItems] = useState(initialData.items || []);
    const handleUpdate = (idx, field, val) => {
        const n = [...items]; n[idx][field] = val; setItems(n);
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ items }); }} className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4 p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border-2 border-slate-200 relative space-y-2">
                        <button type="button" onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><X size={16}/></button>
                        <input className="w-full text-sm font-bold border border-slate-300 rounded p-1" value={item.name} onChange={e=>handleUpdate(idx,'name',e.target.value)} placeholder="品項名稱" required />
                        <div className="flex gap-2">
                            <input type="number" className="w-20 text-sm border border-slate-300 rounded p-1" value={item.qty} onChange={e=>handleUpdate(idx,'qty',e.target.value)} placeholder="數量" />
                            <input type="number" className="flex-1 text-sm border border-slate-300 rounded p-1" value={item.price} onChange={e=>handleUpdate(idx,'price',e.target.value)} placeholder="單價" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">分配給:</span>
                            <select className="flex-1 text-xs font-bold border rounded p-1 bg-white" value={item.assignedTo || ""} onChange={e=>handleUpdate(idx, 'assignedTo', e.target.value)}>
                                <option value="">未分配</option>
                                {Object.values(USER_MAPPING).map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            {['PENDING', 'WON', 'LOST'].map(s => (
                                <button key={s} type="button" onClick={()=>handleUpdate(idx,'status',s)} className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${item.status===s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>
                                    {s==='WON'?'中選':s==='LOST'?'落選':'等待'}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button type="button" onClick={()=>setItems([...items, {name:'', qty:1, price:0, status:'PENDING', assignedTo:''}])} className="w-full py-2 bg-slate-100 border-2 border-dashed border-slate-300 rounded font-bold text-slate-500 hover:bg-slate-200 transition-colors">+ 新增品項</button>
            <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded font-bold text-slate-500 border border-slate-300">取消</button>
                <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800">儲存變更</button>
            </div>
        </form>
    );
}