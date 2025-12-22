// src/components/Dashboard.jsx
import { useState, useEffect, useMemo } from "react"; 
import { Link } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { 
    Heart, CheckCircle, Plus, 
    ExternalLink, Trash2, Archive,
    Zap, Shield, Megaphone, Search, Plane, Info, Tag,
    FileText, CreditCard, Filter 
} from 'lucide-react'; 

import WishForm from "./WishForm";
import PersonalRequestForm from "./PersonalRequestForm";
import OrderForm from "./OrderForm";
import OrderSummary from "./OrderSummary";
import SecondPaymentForm from "./SecondPaymentForm"; 
import ChangePasswordForm from "./ChangePasswordForm";
import ChangeAvatarForm from "./ChangeAvatarForm";
import ChangeNameForm from "./ChangeNameForm";
import Modal from "./Modal";
import ImageSlider from "./ImageSlider";

import Header from "./Header";
import BillWidget from "./BillWidget";

import { db } from "../firebase"; 

const STATUS_STEPS = ["下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"];
const MONTHLY_FEE = 90; 

export default function Dashboard({ appUser, usersData, handleLogout }) {
    const [wishes, setWishes] = useState([]);
    const [groups, setGroups] = useState([]);
    const [orders, setOrders] = useState([]);
    const [miscCharges, setMiscCharges] = useState([]);
    
    const [modalType, setModalType] = useState(null); 
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [editingWish, setEditingWish] = useState(null);

    const [activeTab, setActiveTab] = useState('wishing');

    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');

    const [bulletin, setBulletin] = useState("<div>Loading...</div>");

    const ITEMS_PER_PAGE = 15;
    const [currentPage, setCurrentPage] = useState(1);
    
    // eslint-disable-next-line no-unused-vars
    const [readStatusTick, setReadStatusTick] = useState(0);

    const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

    useEffect(() => {
        const unsubWishes = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "wishes"), (snap) => setWishes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubGroups = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubMisc = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "miscCharges"), (snap) => setMiscCharges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubBulletin = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), (docSnap) => {
            if (docSnap.exists()) setBulletin(docSnap.data().content);
        });

        return () => { unsubWishes(); unsubGroups(); unsubOrders(); unsubMisc(); unsubBulletin(); };
    }, []);

    useEffect(() => { setCurrentPage(1); }, [activeTab, filterStart, filterEnd, filterPaymentStatus]);

    // --- 邏輯功能 ---
    const checkIsNew = (item, type) => {
        const timeKey = item.updatedAt || item.createdAt;
        if (!timeKey) return false;
        const itemKey = `${type}_${item.id}`; 
        let lastRead = appUser?.readHistory?.[itemKey];
        if (!lastRead) {
            const localKey = `read_${appUser?.id}_${type}_${item.id}`;
            lastRead = localStorage.getItem(localKey);
        }
        if (!lastRead) return true; 
        return new Date(timeKey) > new Date(lastRead); 
    };

    const markAsRead = async (item, type) => {
        const now = new Date().toISOString();
        const itemKey = `${type}_${item.id}`;
        const localKey = `read_${appUser?.id}_${type}_${item.id}`;
        localStorage.setItem(localKey, now);
        setReadStatusTick(t => t + 1); 
        if (appUser && appUser.id) {
            try {
                const userRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id);
                await setDoc(userRef, { readHistory: { [itemKey]: now } }, { merge: true });
            } catch (e) { console.error("雲端已讀同步失敗", e); }
        }
    };

    const handleChangePassword = async (newPwd) => {
        if (!appUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { password: newPwd });
        alert("密碼修改成功！"); setModalType(null);
    };

    const handleChangeName = async (newName) => {
        if (!appUser) return;
        try {
            await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { name: newName });
            alert("暱稱修改成功！"); setModalType(null);
        } catch (e) { alert("修改失敗"); }
    };

    const handleChangeAvatar = async (newAvatarUrl) => {
        if (!appUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { avatar: newAvatarUrl });
        alert("頭像更新成功！"); setModalType(null);
    };

    const handleWishSubmit = async (data) => {
        try {
            if (editingWish) {
                await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "wishes", editingWish.id), { ...data, updatedAt: new Date().toISOString() });
            } else {
                await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "wishes"), { ...data, authorName: appUser.name, authorId: appUser.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), plusOnes: [] });
            }
            setModalType(null); setEditingWish(null);
        } catch (e) { alert("操作失敗"); }
    };

    const handleDeleteWish = async (wish) => {
        if (!confirm(`確定要刪除願望「${wish.title}」嗎？`)) return;
        try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "wishes", wish.id)); } catch (e) { console.error(e); }
    };

    const handlePlusOne = async (wish) => {
        if (!appUser) return;
        markAsRead(wish, 'wish');
        const currentPlusOnes = wish.plusOnes || [];
        const isPlussed = currentPlusOnes.includes(appUser.name);
        const newPlusOnes = isPlussed ? currentPlusOnes.filter(n => n !== appUser.name) : [...currentPlusOnes, appUser.name];
        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "wishes", wish.id), { plusOnes: newPlusOnes });
    };

    const handleCreatePersonalRequest = async (data) => {
        const groupData = {
            title: `[個人委託] ${data.ipName}`, type: '個人委託', infoUrl: data.sourceUrl, status: '揪團中', createdBy: appUser.name, createdById: appUser.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), exchangeRate: 0.21, shippingFee: 0, deadline: '個人委託',
            items: data.items.map(i => ({ id: i.id, name: i.name, price: i.price, limit: i.quantity, image: '', spec: '' })), note: data.note, requestType: data.type, secondPayment: {}, 
            paymentStatus: '未收款'
        };
        try {
            const docRef = await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), groupData);
            const orderItems = data.items.map(i => ({ itemId: i.id, name: i.name, price: i.price, quantity: i.quantity, image: '' }));
            await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), { groupId: docRef.id, userId: appUser.id, userName: appUser.name, items: orderItems, updatedAt: new Date().toISOString() });
            setModalType(null); alert("委託單已發布！並已自動為您建立訂單。");
        } catch (e) { alert("發布失敗"); }
    };

    const handleSubmitOrder = async (items, groupId) => {
        const existingOrder = orders.find(o => o.groupId === groupId && o.userId === appUser.id);
        if (items.length === 0) {
            if (existingOrder) {
                try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "orders", existingOrder.id)); alert("訂單已成功取消！"); } catch (e) { alert("取消訂單失敗"); }
            }
            setModalType('viewOrders'); return;
        }
        const orderData = { groupId, userId: appUser.id, userName: appUser.name, items, updatedAt: new Date().toISOString() };
        if (existingOrder) await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "orders", existingOrder.id), orderData);
        else await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), orderData);
        setModalType('viewOrders');
    };

    // --- 計算邏輯 ---
    const totalTWD = useMemo(() => {
        if (!orders || !groups || orders.length === 0 || !appUser) return 0;

        const groupTotal = orders.reduce((acc, order) => {
            if (order.userId !== appUser.id) return acc;
            const g = groups.find(grp => grp.id === order.groupId);
            if (!g) return acc;
            
            const groupOrders = orders.filter(o => o.groupId === g.id);
            let totalQtyInGroup = 0;
            groupOrders.forEach(o => o.items.forEach(item => totalQtyInGroup += (Number(item.quantity) || 0)));

            if (['已成團', '二補計算', '已結案'].includes(g.status)) {
                const rate = Number(g.exchangeRate || 0);
                const fullShippingFee = Number(g.shippingFee || 0);
                const shippingFeePerItem = totalQtyInGroup > 0 ? fullShippingFee / totalQtyInGroup : 0;

                const currentOrderQty = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity)||0), 0);
                const currentOrderProductJPY = (order.items || []).reduce((sum, i) => sum + ((Number(i.price)||0) * (Number(i.quantity)||0)), 0);
                
                const currentOrderShippingJPY = shippingFeePerItem * currentOrderQty;
                const itemTotalTWD = Math.round((currentOrderProductJPY + currentOrderShippingJPY) * rate);

                let secondPayTWD = 0;
                if (g.secondPayment) {
                    const RATE_PER_KG = 250;
                    const weights = g.secondPayment.weights || {};
                    const boxWeight = parseFloat(g.secondPayment.boxWeight || 0);
                    const minChargeDiff = parseFloat(g.secondPayment.minChargeDiff || 0);
                    const boxCostPerItem = totalQtyInGroup > 0 ? (boxWeight * RATE_PER_KG) / totalQtyInGroup : 0;
                    const groupUserIds = new Set(groupOrders.map(o => o.userId));
                    const minChargePerPerson = groupUserIds.size > 0 ? minChargeDiff / groupUserIds.size : 0;

                    order.items.forEach(i => {
                        const w = parseFloat(weights[i.itemId] || 0);
                        secondPayTWD += ((w * RATE_PER_KG) + boxCostPerItem) * i.quantity;
                    });
                    secondPayTWD += minChargePerPerson;
                }
                
                const status = g.paymentStatus || '未收款'; 
                if (status === '商品收款中') return acc + itemTotalTWD;
                if (status === '二補收款中') return acc + Math.round(secondPayTWD);
                if (status === '商品+二補收款中') return acc + itemTotalTWD + Math.round(secondPayTWD);
            }
            return acc;
        }, 0); 

        const miscTotal = miscCharges
            .filter(m => m.targetUserId === appUser.id && (m.paymentStatus || '未付款') === '未付款')
            .reduce((sum, m) => sum + Number(m.amount || 0), 0);

        return groupTotal + miscTotal;
    }, [orders, groups, appUser, miscCharges]);

    const { memberFeeSplit, isMember } = useMemo(() => {
        if (!appUser || !usersData.length) return { memberFeeSplit: 0, isMember: false };
        const memberCount = usersData.filter(u => u.isMember).length;
        const fee = memberCount > 0 ? Math.ceil(MONTHLY_FEE / memberCount) : 0;
        return { memberFeeSplit: fee, isMember: appUser.isMember };
    }, [appUser, usersData]);

    const processGroups = (statusList) => {
        let filtered = groups.filter(g => statusList.includes(g.status));
        
        if (filterStart || filterEnd) {
            filtered = filtered.filter(g => {
                if (!g.deadline || g.deadline === '個人委託') return false; 
                const deadlineTime = new Date(g.deadline).getTime();
                const start = filterStart ? new Date(filterStart).getTime() : 0;
                const end = filterEnd ? new Date(filterEnd).getTime() + 86400000 : Infinity;
                return deadlineTime >= start && deadlineTime < end;
            });
        }

        // 🟢 修改後的篩選邏輯：當選擇「已收款」時，包含多種結清狀態
        if (filterPaymentStatus) {
            if (filterPaymentStatus === '已收款') {
                filtered = filtered.filter(g => 
                    g.paymentStatus === '已收款' || 
                    g.paymentStatus === '商品金額 已收款' || 
                    g.paymentStatus === '商品金額+二補 已收款'
                );
            } else {
                filtered = filtered.filter(g => (g.paymentStatus || '未收款') === filterPaymentStatus);
            }
        }

        return filtered.sort((a, b) => (a.releaseDate || '9999-12-31').localeCompare(b.releaseDate || '9999-12-31'));
    };

    const targetList = activeTab === 'active' ? processGroups(['揪團中']) 
                     : activeTab === 'completed' ? processGroups(['已成團']) 
                     : activeTab === 'shipping' ? processGroups(['二補計算']) 
                     : activeTab === 'closed' ? processGroups(['已結案']) 
                     : []; 

    const totalPages = Math.ceil(targetList.length / ITEMS_PER_PAGE);
    const paginatedList = targetList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 selection:bg-yellow-400 selection:text-black">
            <Header user={appUser} onLogout={handleLogout} onOpenModal={(type) => setModalType(type)}>
                <BillWidget isMember={isMember} fee={memberFeeSplit} amount={totalTWD} />
            </Header>

            <section className="max-w-5xl mx-auto mt-6 px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 bg-white rounded-lg shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 overflow-hidden flex flex-col">
                        <div className="bg-yellow-400 border-b-2 border-slate-900 p-3 flex items-center gap-2 text-slate-900 font-black italic transform -skew-x-6">
                            <Megaphone size={24} className="fill-slate-900" /><h2>ACADEMY NEWS</h2>
                        </div>
                        <div className="p-6 flex-1 prose prose-slate prose-sm max-w-none text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: bulletin }} />
                    </div>
                    <div className="md:col-span-1">
                        <Link to="/jf26" className="block w-full h-full group hover:-translate-y-1 transition-all">
                            <div className="h-full bg-white p-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#FACC15] overflow-hidden relative flex flex-col">
                                <div className="bg-slate-900 text-yellow-400 font-black text-center text-sm py-1 mb-1 italic">JF26 專區</div>
                                <img src="https://www.jumpfesta.com/assets/images/top_jumpfesta_pc@2x.webp" alt="JF26" className="w-full h-full object-cover rounded-lg border-2 border-slate-100" />
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-white shadow-sm rotate-12">HOT!</div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            <nav className="max-w-5xl mx-auto mt-8 px-4">
                <div className="bg-white p-1 rounded-lg shadow-sm border-2 border-slate-200 flex justify-around gap-1">
                    {[
                        { id: 'wishing', label: '許願池', icon: Heart },
                        { id: 'active', label: '揪團中', icon: Zap }, 
                        { id: 'completed', label: '已成團', icon: CheckCircle },
                        { id: 'shipping', label: '國際二補', icon: Plane },
                        { id: 'misc', label: '雜項費用', icon: FileText },
                        { id: 'closed', label: '已結案', icon: Archive }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded font-black transition-all border-2 ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-md transform -translate-y-1' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                            <tab.icon size={20} className={activeTab === tab.id ? "animate-pulse" : ""} />
                            <span className="text-[11px] sm:text-sm whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {activeTab === 'wishing' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="mb-6 bg-white p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-start gap-4">
                            <div className="bg-red-100 p-2 rounded-lg border-2 border-red-600 shrink-0">
                                <Heart size={20} className="text-red-600 fill-red-600" />
                            </div>
                            <div>
                                <h4 className="font-black text-xs uppercase tracking-tighter text-slate-400 mb-1 italic">Wish Pool Briefing</h4>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                    歡迎來到英雄許願池！大家可以在這裡留下想要開團的商品，英雄集氣（+1）越高，開團機率就越高喔！
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end mb-6">
                            <button onClick={() => { setEditingWish(null); setModalType('wish'); }} className="px-6 py-2 bg-red-600 text-white border-2 border-red-800 rounded font-black hover:bg-red-700 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(153,27,27,1)] italic"><Plus size={20} /> MAKE A WISH</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishes.map(wish => (
                                <div key={wish.id} className="bg-white rounded-lg p-4 border-2 border-slate-200 hover:border-slate-900 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all flex flex-col relative" onClick={() => markAsRead(wish, 'wish')}>
                                    {checkIsNew(wish, 'wish') && <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md -rotate-12 z-10 border-2 border-white animate-bounce">NEW!</div>}
                                    <div className="mb-3 aspect-video bg-slate-100 rounded overflow-hidden"><ImageSlider images={wish.images} /></div>
                                    <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2">{wish.title}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">BY: {wish.authorName}</span>
                                        {wish.url && <a href={wish.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1"><ExternalLink size={10}/> Link</a>}
                                    </div>
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-3 bg-slate-50 p-2 rounded">{wish.note || "無補充說明"}</p>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-end mt-auto">
                                        <div className="text-xs font-bold text-red-600">{wish.plusOnes?.length > 0 && <span className="flex items-center gap-1"><Heart size={10} className="fill-red-600"/> {wish.plusOnes.length} 英雄集氣</span>}</div>
                                        <div className="flex gap-2">
                                            {appUser?.id === wish.authorId && <button onClick={(e) => { e.stopPropagation(); handleDeleteWish(wish); }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>}
                                            <button onClick={(e) => { e.stopPropagation(); handlePlusOne(wish); }} className={`px-3 py-1.5 rounded-full text-sm font-black border-2 transition-all ${wish.plusOnes?.includes(appUser?.name) ? 'bg-red-100 border-red-500 text-red-600' : 'bg-white text-slate-400 hover:border-slate-400'}`}>+1</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'misc' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white rounded-lg shadow-sm border-2 border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto"> 
                            <table className="w-full text-sm text-left font-bold min-w-[500px]"> 
                                <thead className="bg-slate-100 text-slate-700 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">日期</th>
                                        <th className="px-4 py-3 whitespace-nowrap">明細</th>
                                        <th className="px-4 py-3 whitespace-nowrap">備註</th>
                                        <th className="px-4 py-3 text-right whitespace-nowrap">金額</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">狀態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {miscCharges.filter(m => m.targetUserId === appUser?.id || appUser?.name === '葉葉').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(m => (
                                        <tr key={m.id} className={`border-b ${(m.paymentStatus || '未付款') === '已付款' ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">{m.title}</td>
                                            <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[120px]">{m.note || '-'}</td>
                                            <td className={`px-4 py-3 text-right ${(m.paymentStatus || '未付款') === '已付款' ? 'text-slate-400 line-through' : ''}`}>${m.amount}</td>
                                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-[10px] ${(m.paymentStatus || '未付款') === '已付款' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.paymentStatus || '未付款'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div> 
                </div>
                )}

                {['active', 'completed', 'shipping', 'closed'].includes(activeTab) && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {activeTab === 'active' && (
                            <div className="mb-6 bg-white p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#7c3aed] flex items-start gap-4">
                                <div className="bg-purple-100 p-2 rounded-lg border-2 border-purple-600 shrink-0">
                                    <Shield size={20} className="text-purple-600 fill-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-xs uppercase tracking-tighter text-slate-400 mb-1 italic">Personal Request Protocol</h4>
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                        【個人委託說明】請提供正確的商品網址與明細，確認後系統會自動為您建立專屬訂單。
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="mb-6 bg-slate-200 p-3 rounded-lg flex flex-col lg:flex-row items-center gap-4 border-2 border-slate-300">
                            <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                                <Search size={18} />
                                <span className="text-sm">任務搜尋</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 flex-1 w-full font-bold">
                                <input type="date" className="border-2 border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[120px]" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
                                <span className="text-slate-400">~</span>
                                <input type="date" className="border-2 border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[120px]" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
                                
                                <div className="flex items-center gap-1 bg-white border-2 border-slate-300 rounded px-2 py-1 flex-1 min-w-[160px]">
                                    <Filter size={14} className="text-slate-400" />
                                    <select 
                                        className="text-xs w-full bg-transparent outline-none cursor-pointer font-black"
                                        value={filterPaymentStatus}
                                        onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                    >
                                        <option value="">所有收款狀態</option>
                                        <option value="未收款">未收款</option>
                                        <option value="商品收款中">商品收款中</option>
                                        <option value="二補收款中">二補收款中</option>
                                        <option value="商品+二補收款中">商品+二補收款中</option>
                                        {/* 🟢 這裡的選項代表包含所有結清狀態 */}
                                        <option value="已收款">已結清 / 已收款</option>
                                    </select>
                                </div>

                                {(filterStart || filterEnd || filterPaymentStatus) && (
                                    <button 
                                        onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterPaymentStatus(''); }} 
                                        className="text-[10px] bg-slate-400 text-white px-3 py-2 rounded hover:bg-slate-500 transition-colors uppercase font-black"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeTab === 'active' && appUser?.name !== '葉葉' && (
                            <div className="flex justify-end mb-6"><button onClick={() => setModalType('createPersonalRequest')} className="px-6 py-2 bg-purple-600 text-white rounded border-2 border-purple-800 font-black hover:bg-purple-700 flex items-center gap-2 shadow-[4px_4px_0px_0px_#4c1d95] italic"><Zap size={18} /> 發布個人委託</button></div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedList.map(group => {
                                const hasOrdered = !!orders.find(o => o.groupId === group.id && o.userId === appUser?.id);
                                return (
                                    <div key={group.id} className={`bg-white rounded-lg p-5 border-2 border-slate-900 flex flex-col relative ${activeTab === 'closed' ? 'opacity-75 grayscale-[0.5]' : ''}`} onClick={() => activeTab === 'active' && markAsRead(group, 'group')}>
                                        {activeTab === 'active' && checkIsNew(group, 'group') && <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md -rotate-12 z-10 border-2 border-white animate-bounce">NEW!</div>}
                                        <div className="flex flex-col gap-1 mb-2">
                                            <div className="flex flex-wrap gap-1">
                                                <span className={`px-2 py-0.5 text-[10px] font-black rounded border ${group.type === '現貨' ? 'bg-green-600 text-white border-green-800' : group.type === '個人委託' ? 'bg-purple-600 text-white border-purple-800' : 'bg-yellow-400 text-slate-900 border-slate-900'}`}>{group.type === '現貨' ? '⚡ 現貨' : group.type === '個人委託' ? '📜 個人委託' : '⏳ 預購'}</span>
                                                {group.paymentStatus && group.paymentStatus !== '未收款' && (
                                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded border flex items-center gap-1
                                                        ${(group.paymentStatus === '已收款' || group.paymentStatus === '商品金額 已收款' || group.paymentStatus === '商品金額+二補 已收款') 
                                                            ? 'bg-slate-100 text-slate-500 border-slate-300' // 已收款：灰色，無動畫
                                                            : 'bg-emerald-500 text-white border-emerald-700 shadow-[2px_2px_0px_0px_rgba(5,150,105,1)] animate-pulse' // 收款中：綠色，有動畫
                                                        }`}
                                                    >
                                                        <CreditCard size={10} /> {group.paymentStatus}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-black text-base">{group.title}</h3>
                                        </div>
                                        <div className="mb-4 aspect-video bg-slate-100 rounded overflow-hidden"><ImageSlider images={group.images || []} /></div>
                                        <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1 font-bold">
                                            <p className="flex justify-between border-b border-slate-100 pb-1"><span>收單時間</span><span className="text-red-600">{group.deadline}</span></p>
                                            {group.releaseDate && <p className="flex justify-between border-b border-slate-100 pb-1"><span>預計發售</span><span className="text-blue-600">{group.releaseDate}</span></p>}
                                            {group.infoUrl && <p className="flex justify-between border-b border-slate-100 pb-1"><span>官方資訊</span><a href={group.infoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline">Link</a></p>}
                                            {hasOrdered && activeTab === 'active' && <div className="mt-2 bg-green-100 text-green-700 border border-green-300 px-2 py-1 rounded text-center text-xs font-black">已參戰 (ORDERED)</div>}
                                        </div>
                                        
                                        {group.status !== '揪團中' && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold">{STATUS_STEPS.map(step => <span key={step} className={group.trackingStatus === step ? 'text-blue-600' : ''}>{step}</span>)}</div>
                                                <div className="h-3 bg-slate-200 rounded-full flex border border-slate-300 overflow-hidden">{STATUS_STEPS.map((step, i) => <div key={step} className={`flex-1 border-r border-white last:border-0 ${i <= STATUS_STEPS.indexOf(group.trackingStatus || '下單中') ? 'bg-blue-600' : ''}`} />)}</div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-auto">
                                            {activeTab === 'active' && <button className={`flex-1 px-4 py-2 rounded font-black text-white border-2 transition-all ${hasOrdered ? 'bg-green-600 border-green-800' : 'bg-red-600 border-red-800'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('joinGroup'); }}>{hasOrdered ? "修改訂單" : "跟團"}</button>}
                                            <button className={`px-3 py-2 rounded font-bold border-2 flex-1 ${activeTab === 'active' ? 'bg-white border-slate-300 text-slate-600' : 'bg-slate-100 border-slate-300 text-slate-700'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('viewOrders'); }}>查看明細</button>
                                            {['shipping', 'closed'].includes(activeTab) && (
                                                <button className="px-3 py-2 rounded font-bold border-2 bg-yellow-400 border-slate-900 text-slate-900 flex-1" onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('secondPayment'); }}>二補明細</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded font-black border-2 border-slate-900 bg-white">PREV</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded border-2 border-slate-900 font-black ${currentPage === p ? 'bg-slate-900 text-yellow-400' : 'bg-white'}`}>{p}</button>)}
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded font-black border-2 border-slate-900 bg-white">NEXT</button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals */}
            <Modal isOpen={modalType === 'wish'} onClose={() => { setModalType(null); setEditingWish(null); }} title={editingWish ? "修改願望" : "我要許願"}><WishForm onSubmit={handleWishSubmit} onCancel={() => { setModalType(null); setEditingWish(null); }} initialData={editingWish} /></Modal>
            <Modal isOpen={modalType === 'createPersonalRequest'} onClose={() => setModalType(null)} title="發布個人委託"><PersonalRequestForm onSubmit={handleCreatePersonalRequest} onCancel={() => setModalType(null)} /></Modal>
            <Modal isOpen={modalType === 'secondPayment'} onClose={() => setModalType(null)} title="國際運二補試算">
                {selectedGroup && <SecondPaymentForm group={selectedGroup} orders={orders.filter(o => o.groupId === selectedGroup?.id)} currentUser={appUser} onUpdate={null} isReadOnly={true} />}
            </Modal>
            <Modal isOpen={modalType === 'changeName'} onClose={() => setModalType(null)} title="修改暱稱"><ChangeNameForm currentUser={appUser} onSubmit={handleChangeName} onCancel={() => setModalType(null)} /></Modal>
            <Modal isOpen={modalType === 'changePwd'} onClose={() => setModalType(null)} title="修改密碼"><ChangePasswordForm onSubmit={handleChangePassword} /></Modal>
            <Modal isOpen={modalType === 'changeAvatar'} onClose={() => setModalType(null)} title="更改頭像"><ChangeAvatarForm currentUser={appUser} onSubmit={handleChangeAvatar} /></Modal>
            <Modal isOpen={modalType === 'joinGroup'} onClose={() => setModalType(null)} title={`跟團：${selectedGroup?.title}`}>{selectedGroup && <OrderForm group={selectedGroup} currentOrder={orders.find(o => o.groupId === selectedGroup?.id && o.userId === appUser?.id)} onSubmit={(items) => handleSubmitOrder(items, selectedGroup.id)} />}</Modal>
            
            <Modal isOpen={modalType === 'viewOrders'} onClose={() => setModalType(null)} title={`訂單明細：${selectedGroup?.title}`}>
                {selectedGroup && (
                    <>
                        <div className={`mb-4 p-3 rounded-lg border-2 font-black text-center text-sm
                            ${(selectedGroup.paymentStatus === '未收款' || !selectedGroup.paymentStatus) ? 'bg-slate-50 border-slate-200 text-slate-400' : 
                            (selectedGroup.paymentStatus === '已收款' || selectedGroup.paymentStatus === '商品金額 已收款' || selectedGroup.paymentStatus === '商品金額+二補 已收款') ? 'bg-blue-50 border-blue-200 text-blue-600' : 
                            'bg-emerald-50 border-emerald-500 text-emerald-700 italic'}
                        `}>
                            {(selectedGroup.paymentStatus === '未收款' || !selectedGroup.paymentStatus) ? '🛡️ 英雄任務準備中 (尚未開始收款)' : 
                             (selectedGroup.paymentStatus === '已收款' || selectedGroup.paymentStatus === '商品金額 已收款' || selectedGroup.paymentStatus === '商品金額+二補 已收款') ? '✅ 本次任務經費已結清' : 
                             `📢 英雄注意：${selectedGroup.paymentStatus}！請確認您的個人帳單`}
                        </div>
                        <OrderSummary group={selectedGroup} orders={orders.filter(o => o.groupId === selectedGroup?.id)} currentUser={appUser} onEdit={selectedGroup?.status === '揪團中' ? () => setModalType('joinGroup') : null} />
                    </>
                )}
            </Modal>
        </div>
    );
}