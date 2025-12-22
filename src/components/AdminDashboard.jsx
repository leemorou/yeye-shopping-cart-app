// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { 
    ArrowLeft, FileSpreadsheet, ListChecks, Megaphone, FileText, 
    Plus, Trash2, Users, ShoppingBag, Ticket, Save, ShoppingCart
} from 'lucide-react';
import { db } from '../firebase'; 

// 引入子元件
import ComplexExcelImport from "./ComplexExcelImport";
import AdminGroupManager from "./AdminGroupManager";
import RichTextEditor from "./RichTextEditor";
import JSAdminManager from './JF26JSPreOrderAdmin';
import AdminJSPostTab from './AdminJSPostTab';
import JCSAdminManager from './JCSAdminManager'; // 🟢 新引入
import Modal from "./Modal";
import GroupForm from "./GroupForm";
import SecondPaymentForm from "./SecondPaymentForm";

export default function AdminDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('groups'); 
    const [jfSubTab, setJfSubTab] = useState('pre_order'); // 🟢 JF26 子分頁狀態
    
    // 狀態管理
    const [tempBulletin, setTempBulletin] = useState("");
    const [miscCharges, setMiscCharges] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [groups, setGroups] = useState([]);
    const [orders, setOrders] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [miscForm, setMiscForm] = useState({ title: '', amount: '', targetUserId: '', paymentStatus: '未付款' });
    const [secondPayGroupId, setSecondPayGroupId] = useState(null);

    const isAdmin = currentUser?.name === "葉葉" || currentUser?.id === "yeye";
    const selectedSPGroup = groups.find(g => g.id === secondPayGroupId);

    useEffect(() => {
        if (!isAdmin) return;
        // 公告
        const unsubBulletin = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), (snap) => {
            if (snap.exists()) setTempBulletin(snap.data().content);
        });
        // 各項資料監聽
        const unsubMisc = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "miscCharges"), (snap) => setMiscCharges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubUsers = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "users"), (snap) => setUsersData(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubGroups = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubBulletin(); unsubMisc(); unsubUsers(); unsubGroups(); unsubOrders(); };
    }, [isAdmin]);

    if (!isAdmin) return null; // 權限攔截邏輯已在父層或 router 處理佳

    // 功能函式
    const handleSaveBulletin = async () => {
        try {
            await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), { content: tempBulletin });
            alert("公告已發布！");
        } catch (e) { alert("發布失敗"); }
    };

    const handleAddMisc = async () => {
        if (!miscForm.title || !miscForm.amount || !miscForm.targetUserId) return alert("請完整填寫");
        const target = usersData.find(u => u.id === miscForm.targetUserId);
        await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "miscCharges"), {
            ...miscForm, amount: Number(miscForm.amount), targetUserName: target?.name || 'Unknown', createdAt: new Date().toISOString()
        });
        setMiscForm({ title: '', amount: '', targetUserId: '', paymentStatus: '未付款' });
    };

    // --- 內部組件：JF26 總管理包裝 ---
    const JF26CombinedManager = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* 🟢 移除 border-b-4，改用 gap 與 居中佈局 */}
        <div className="flex flex-wrap justify-start gap-4 mb-4">
            {[
                { id: 'pre_order', label: 'JS 先行 (現場)', icon: ShoppingBag },
                { id: 'post_order', label: 'JS 事後 (通販)', icon: ShoppingCart },
                { id: 'jcs_lottery', label: 'JCS 抽選分配', icon: Ticket },
            ].map(sub => (
                <button
                    key={sub.id}
                    onClick={() => setJfSubTab(sub.id)}
                    // 🟢 使用全圓角 (rounded-xl) 與 獨立邊框 (border-4)
                    className={`flex items-center gap-3 px-6 py-3 font-black italic text-base transition-all duration-200 rounded-xl border-4 ${
                        jfSubTab === sub.id 
                        ? 'bg-slate-900 text-yellow-400 border-slate-900 shadow-[6px_6px_0px_0px_#FACC15]' 
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'
                    }`}>
                    <sub.icon size={18} />
                    {sub.label}
                </button>
            ))}
        </div>

        {/* 內容區塊加上一個淡入的效果容器 */}
        <div className="bg-white/50 p-1 rounded-2xl">
            {jfSubTab === 'pre_order' && <JSAdminManager currentUser={currentUser} />}
            {jfSubTab === 'post_order' && <AdminJSPostTab />}
            {jfSubTab === 'jcs_lottery' && <JCSAdminManager />}
        </div>
    </div>
);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            <header className="bg-slate-900 text-white shadow-md z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            <ArrowLeft size={20} /><span className="hidden sm:inline">回首頁</span>
                        </button>
                        <h1 className="text-xl font-black italic border-l border-gray-700 pl-4 text-yellow-400 tracking-tighter">HERO OPS CENTER</h1>
                    </div>
                    <nav className="flex flex-wrap justify-center gap-2 bg-slate-800 p-1.5 rounded-xl">
                    {[
                        { id: 'groups', label: '團務管理', icon: ListChecks },
                        { id: 'misc', label: '雜項費用', icon: FileText },
                        { id: 'jf26_all', label: 'JF26 總管理', icon: ShoppingBag },
                        { id: 'import', label: 'Excel 匯入', icon: FileSpreadsheet },
                        { id: 'bulletin', label: '公告編輯', icon: Megaphone },
                        { id: 'users', label: '成員管理', icon: Users },
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all ${
                                activeTab === tab.id 
                                ? 'bg-yellow-400 text-slate-900 shadow-lg scale-105' 
                                : 'text-gray-400 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            <tab.icon size={16} /> {/* 圖示也稍微放大 */}
                            {tab.label}
                        </button>
                    ))}
                </nav>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'groups' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic">團務進度管理</h2><button onClick={() => setIsModalOpen(true)} className="px-6 py-2 bg-slate-900 text-white rounded font-black hover:bg-slate-700 shadow-[4px_4px_0px_0px_#FACC15] transition-all italic flex items-center gap-2"><Plus size={18}/>發起新團</button></div>
                            <AdminGroupManager onOpenSecondPay={setSecondPayGroupId} />
                        </div>
                    )}
                    {activeTab === 'jf26_all' && <JF26CombinedManager />}
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
                    
                    {activeTab === 'bulletin' && (
                        <div className="bg-white p-6 rounded-xl border-4 border-slate-900">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b-2">
                                <h2 className="text-xl font-black italic">系統公告管理</h2>
                                <button onClick={handleSaveBulletin} className="px-4 py-2 rounded bg-slate-900 text-yellow-400 font-black flex items-center gap-2 shadow-[3px_3px_0px_0px_#ccc]"><Save size={18}/>儲存發布</button>
                            </div>
                            <RichTextEditor initialContent={tempBulletin} onChange={setTempBulletin} />
                        </div>
                    )}
                    {activeTab === 'import' && <ComplexExcelImport />}
                    {activeTab === 'users' && <div className="p-20 text-center font-black text-slate-300">成員管理開發中...</div>}
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="發起新團務">
                <GroupForm onSubmit={async (data) => {
                    await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), { ...data, createdAt: new Date().toISOString(), status: '揪團中', createdBy: '葉葉' });
                    setIsModalOpen(false);
                }} onCancel={() => setIsModalOpen(false)} submitLabel="發佈團購" />
            </Modal>

            <Modal isOpen={!!secondPayGroupId} onClose={() => setSecondPayGroupId(null)} title="管理國際運二補">
                {selectedSPGroup && (
                    <SecondPaymentForm group={selectedSPGroup} orders={orders.filter(o => o.groupId === selectedSPGroup.id)} currentUser={currentUser} onUpdate={async (data) => {
                        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", selectedSPGroup.id), { secondPayment: data });
                        setSecondPayGroupId(null);
                    }} />
                )}
            </Modal>
        </div>
    );
}