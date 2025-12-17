// src/components/AdminDashboard.jsx (修正版)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { 
    ArrowLeft, FileSpreadsheet, ListChecks, Megaphone, FileText, 
    Save, Plus, Trash2, Users, ShoppingBag, Calculator 
} from 'lucide-react';

import { db } from '../firebase'; 

// 引入子元件
import ComplexExcelImport from "./ComplexExcelImport";
import AdminGroupManager from "./AdminGroupManager";
import RichTextEditor from "./RichTextEditor";
import JSAdminManager from './JF26JSPreOrderAdmin';
import GroupForm from "./GroupForm";
import Modal from "./Modal";
import SecondPaymentForm from "./SecondPaymentForm"; // 🟢 確保引入二補表單

export default function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();
  
  // 1. 所有 Hook (useState/useEffect) 必須放在組件最頂層
  const [activeTab, setActiveTab] = useState('groups'); 
  const [bulletin, setBulletin] = useState("");
  const [tempBulletin, setTempBulletin] = useState("");
  const [miscCharges, setMiscCharges] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [groups, setGroups] = useState([]); // 🟢 補上 groups 狀態
  const [orders, setOrders] = useState([]); // 🟢 補上 orders 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [miscForm, setMiscForm] = useState({ title: '', amount: '', targetUserId: '', note: '', paymentStatus: '未付款' });
  const [secondPayGroupId, setSecondPayGroupId] = useState(null);

  const isAdmin = currentUser?.name === "葉葉" || currentUser?.id === "yeye";
  const selectedSPGroup = groups.find(g => g.id === secondPayGroupId);

  // 2. 監聽資料庫
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

      return () => { 
        unsubBulletin(); unsubMisc(); unsubUsers(); unsubGroups(); unsubOrders(); 
      };
  }, [isAdmin]);

  // 3. 安全檢查：放在 Hook 之後
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

  // --- 邏輯處理函式 ---
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
                    {/* 🟢 修改：將二補設定功能交給 AdminGroupManager 內部處理，或統一在這裡開啟 */}
                    <AdminGroupManager onOpenSecondPay={(id) => setSecondPayGroupId(id)} />
                </div>
            )}

            {activeTab === 'js_orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-6 px-4">
                        <h2 className="text-2xl font-black text-slate-800 italic">JF26 JS ONLINE 後台控制台</h2>
                        <p className="text-slate-500 font-bold text-sm">在這裡調整匯率、運費，並更新每個人的購買狀態。</p>
                    </div>
                    <JSAdminManager currentUser={currentUser} />
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

      {/* 🔴 Modal 區塊 */}
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
    </div>
  );
}