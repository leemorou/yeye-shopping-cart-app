// src/components/Dashboard.jsx
import { useState, useEffect, useMemo } from "react"; 
import { Link } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { 
    Heart, CheckCircle, Plus, 
    ExternalLink, Calendar, Trash2, Archive,
    Zap, Shield, Star, Megaphone, Search, Plane, Info, Tag,
    FileText 
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

// 定義狀態常數 (僅用於顯示)
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

    useEffect(() => { setCurrentPage(1); }, [activeTab, filterStart, filterEnd]);

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
                await setDoc(userRef, {
                    readHistory: { [itemKey]: now }
                }, { merge: true });
            } catch (e) { console.error("雲端已讀同步失敗", e); }
        }
    };

    const handleChangePassword = async (newPwd) => {
        if (!appUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { password: newPwd });
        alert("密碼修改成功！");
        setModalType(null);
    };

    const handleChangeName = async (newName) => {
        if (!appUser) return;
        try {
            await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { name: newName });
            alert("暱稱修改成功！");
            setModalType(null);
        } catch (e) { console.error("修改暱稱失敗", e); alert("修改失敗"); }
    };

    const handleChangeAvatar = async (newAvatarUrl) => {
        if (!appUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id), { avatar: newAvatarUrl });
        alert("頭像更新成功！");
        setModalType(null);
    };

    const handleWishSubmit = async (data) => {
        try {
            if (editingWish) {
                await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "wishes", editingWish.id), { ...data, updatedAt: new Date().toISOString() });
            } else {
                await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "wishes"), { ...data, authorName: appUser.name, authorId: appUser.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), plusOnes: [] });
            }
            setModalType(null); setEditingWish(null);
        } catch (e) { console.error(e); alert("操作失敗"); }
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
        } catch (e) { console.error("發布失敗", e); alert("發布失敗"); }
    };

    const handleSubmitOrder = async (items, groupId) => {
        const existingOrder = orders.find(o => o.groupId === groupId && o.userId === appUser.id);
        if (items.length === 0) {
            if (existingOrder) {
                try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "orders", existingOrder.id)); alert("訂單已成功取消！"); } catch (e) { console.error("刪除訂單失敗", e); alert("取消訂單失敗"); }
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
            
            const groupTotalQuantities = {};
            orders.forEach(o => {
                 if (o.groupId === g.id) {
                     if (!groupTotalQuantities[g.id]) groupTotalQuantities[g.id] = 0;
                     o.items.forEach(item => {
                         groupTotalQuantities[g.id] += (Number(item.quantity) || 0);
                     });
                 }
            });

            if (['已成團', '二補計算'].includes(g.status)) {
                const rate = Number(g.exchangeRate || 0);
                const fullShippingFee = Number(g.shippingFee || 0);
                
                const totalQtyInGroup = groupTotalQuantities[g.id] || 1; 
                const shippingFeePerItem = fullShippingFee / totalQtyInGroup;

                const currentOrderQty = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity)||0), 0);
                const currentOrderProductJPY = (order.items || []).reduce((sum, i) => sum + ((Number(i.price)||0) * (Number(i.quantity)||0)), 0);
                
                const currentOrderShippingJPY = shippingFeePerItem * currentOrderQty;
                
                const jpyFinalTotal = currentOrderProductJPY + currentOrderShippingJPY;
                const itemTotalTWD = Math.round(jpyFinalTotal * rate);

                let secondPayTWD = 0;
                if (g.secondPayment) {
                    const RATE_PER_KG = 250;
                    const weights = g.secondPayment.weights || {};
                    const boxWeight = parseFloat(g.secondPayment.boxWeight || 0);
                    const minChargeDiff = parseFloat(g.secondPayment.minChargeDiff || 0);

                    const boxCost = boxWeight * RATE_PER_KG;
                    const boxCostPerItem = totalQtyInGroup > 0 ? boxCost / totalQtyInGroup : 0;
                    
                    const groupUserIds = new Set(orders.filter(o => o.groupId === g.id).map(o => o.userId));
                    const uniqueUserCount = groupUserIds.size;
                    const minChargePerPerson = uniqueUserCount > 0 ? minChargeDiff / uniqueUserCount : 0;

                    order.items.forEach(i => {
                        const w = parseFloat(weights[i.itemId] || 0);
                        const itemShipping = (w * RATE_PER_KG) + boxCostPerItem;
                        secondPayTWD += itemShipping * i.quantity;
                    });
                    
                    secondPayTWD += minChargePerPerson;
                }
                
                const status = g.paymentStatus || '未收款'; 
                
                if (status === '未收款') return acc;
                else if (status === '商品收款中') return acc + itemTotalTWD;
                else if (status === '商品已收款') return acc;
                else if (status === '二補收款中') return acc + Math.round(secondPayTWD);
                else if (status === '二補已收款') return acc;
                else if (status === '商品+二補收款中') return acc + itemTotalTWD + Math.round(secondPayTWD);
                else if (status === '商品+二補已收款') return acc;
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
        return filtered.sort((a, b) => {
            const dateA = a.releaseDate || '9999-12-31';
            const dateB = b.releaseDate || '9999-12-31';
            return dateA.localeCompare(dateB);
        });
    };

    const activeGroups = processGroups(['揪團中']);
    const completedGroups = processGroups(['已成團']);
    const shippingGroups = processGroups(['二補計算']);
    const closedGroups = processGroups(['已結案']);

    const targetList = activeTab === 'active' ? activeGroups 
                      : activeTab === 'completed' ? completedGroups 
                      : activeTab === 'shipping' ? shippingGroups 
                      : activeTab === 'closed' ? closedGroups 
                      : []; 

    const totalPages = Math.ceil(targetList.length / ITEMS_PER_PAGE);
    const paginatedList = targetList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const Pagination = () => {
        if (totalPages <= 1) return null; 
        return (
            <div className="flex justify-center items-center gap-2 mt-8 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded font-black border-2 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">PREV</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded flex items-center justify-center font-black border-2 border-slate-900 transition-all ${currentPage === page ? 'bg-slate-900 text-yellow-400 transform -translate-y-1 shadow-[2px_2px_0px_0px_#FACC15]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded font-black border-2 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">NEXT</button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 selection:bg-yellow-400 selection:text-black">
            
            <Header user={appUser} onLogout={handleLogout} onOpenModal={(type) => setModalType(type)}>
                <BillWidget isMember={isMember} fee={memberFeeSplit} amount={totalTWD} />
            </Header>

            <section className="max-w-5xl mx-auto mt-6 px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 公告欄 (純顯示) */}
                    <div className="md:col-span-3 bg-white rounded-lg p-0 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 relative overflow-hidden flex flex-col">
                        <div className="bg-yellow-400 border-b-2 border-slate-900 p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg italic transform -skew-x-6"><Megaphone size={24} className="fill-slate-900" /><h2>ACADEMY NEWS</h2></div>
                        </div>
                        <div className="p-6 flex-1">
                            <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: bulletin }} />
                        </div>
                    </div>

                    {/* JF26 專區 */}
                    <div className="md:col-span-1">
                        <Link to="/jf26" className="block w-full h-full relative group transition-all duration-300 hover:-translate-y-1 focus:outline-none">
                            <div className="h-full bg-white p-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#FACC15] transition-all overflow-hidden relative flex flex-col">
                                <div className="bg-slate-900 text-yellow-400 font-black text-center text-sm py-1 mb-1 italic">JF26 專區</div>
                                <div className="flex-1 overflow-hidden rounded-lg border-2 border-slate-100 relative">
                                    <img src="https://www.jumpfesta.com/assets/images/top_jumpfesta_pc@2x.webp" alt="JF26" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-white shadow-sm transform rotate-12">HOT!</div>
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
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 sm:px-4 rounded font-black transition-all border-2 ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-md transform -translate-y-1' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                            <tab.icon size={20} className={activeTab === tab.id ? "animate-pulse" : ""} />
                            <span className="text-[11px] sm:text-sm whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {activeTab === 'wishing' && (
                    <div>
                        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm text-blue-900 text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <Info className="shrink-0 mt-0.5 text-blue-600" size={18} />
                            <p className="leading-relaxed">想找人一起上車嗎？點擊按鈕留下你的願望，號召大家一起+1！</p>
                        </div>
                        <div className="flex justify-end mb-6">
                            <button onClick={() => { setEditingWish(null); setModalType('wish'); }} className="px-6 py-2 bg-red-600 text-white border-2 border-red-800 rounded font-black hover:bg-red-700 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(153,27,27,1)] active:translate-y-0.5 active:shadow-none transition-all italic"><Plus size={20} /> MAKE A WISH</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishes.map(wish => {
                                const isNew = checkIsNew(wish, 'wish');
                                return (
                                    <div key={wish.id} className="bg-white rounded-lg p-4 shadow-sm border-2 border-slate-200 hover:border-slate-900 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all flex flex-col h-full relative group" onClick={() => markAsRead(wish, 'wish')}>
                                        {isNew && <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-50 border-2 border-white pointer-events-none animate-bounce">NEW!</div>}
                                        <div className="mb-3 w-full aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden"><ImageSlider images={wish.images} /></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2">{wish.title}</h3>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs px-2 py-1 rounded font-bold">BY: {wish.authorName}</span>
                                                {wish.url && <a href={wish.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 font-bold text-xs hover:underline truncate max-w-[120px] flex items-center gap-1"><ExternalLink size={10}/> Link</a>}
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">{wish.note || "無補充說明"}</p>
                                        </div>
                                        <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-end mt-auto">
                                            <div className="text-xs font-bold text-slate-400">{wish.plusOnes?.length > 0 && <span className="text-red-600 flex items-center gap-1"><Heart size={10} className="fill-red-600"/> {wish.plusOnes.length} 英雄集氣</span>}</div>
                                            <div className="flex gap-2">
                                                {appUser?.id === wish.authorId && <button onClick={(e) => { e.stopPropagation(); handleDeleteWish(wish); }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>}
                                                <button onClick={(e) => { e.stopPropagation(); handlePlusOne(wish); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-black border-2 transition-all ${wish.plusOnes?.includes(appUser?.name) ? 'bg-red-100 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'}`}>+1</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'misc' && (
                    <div>
                         <div className="mb-6 bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r shadow-sm text-gray-900 text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <FileText className="shrink-0 mt-0.5 text-gray-600" size={18} />
                            <p className="leading-relaxed">這裡記錄了您個人的非制式雜項費用（例如：個人交易...等）。</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border-2 border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-700 font-black border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">日期</th>
                                        <th className="px-4 py-3">明細</th>
                                        <th className="px-4 py-3">備註</th>
                                        <th className="px-4 py-3 text-right">金額 (TWD)</th>
                                        <th className="px-4 py-3 text-center">狀態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {miscCharges
                                        .filter(m => m.targetUserId === appUser?.id || appUser?.name === '葉葉')
                                        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .map(m => (
                                        <tr key={m.id} className={`border-b border-slate-100 transition-colors ${(m.paymentStatus || '未付款') === '已付款' ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-bold text-slate-800">{m.title}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={m.note}>{m.note || '-'}</td>
                                            <td className={`px-4 py-3 text-right font-black ${(m.paymentStatus || '未付款') === '已付款' ? 'text-slate-400 line-through decoration-2' : 'text-slate-900'}`}>${m.amount}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${(m.paymentStatus || '未付款') === '已付款' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {m.paymentStatus || '未付款'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {miscCharges.filter(m => m.targetUserId === appUser?.id).length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">目前沒有雜項費用紀錄</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {(activeTab === 'active' || activeTab === 'completed' || activeTab === 'closed' || activeTab === 'shipping') && (
                    <div>
                        {activeTab === 'active' && (
                            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-sm text-yellow-900 text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <Megaphone className="shrink-0 mt-0.5 text-yellow-600" size={18} />
                                <p className="leading-relaxed">葉葉揪團啦~~ 趕緊上車！或是你想要買自己的東西，那就發起委託，讓葉葉幫你發個人車車~</p>
                            </div>
                        )}
                        <div className="mb-6 bg-slate-200 p-3 rounded-lg flex flex-col sm:flex-row items-center gap-4 border-2 border-slate-300">
                            <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                <Search size={18} className="text-slate-500"/> {activeTab === 'active' ? '搜尋收單區間:' : '搜尋發售區間:'}
                            </div>
                            <div className="flex items-center gap-2 flex-1 w-full">
                                <input type="date" className="border-2 border-slate-300 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none flex-1" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
                                <span className="text-slate-400 font-bold">~</span>
                                <input type="date" className="border-2 border-slate-300 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none flex-1" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
                            </div>
                            {(filterStart || filterEnd) && <button onClick={() => { setFilterStart(''); setFilterEnd(''); }} className="text-xs bg-slate-400 text-white px-3 py-1.5 rounded font-bold hover:bg-slate-500">清除篩選</button>}
                        </div>

                        {activeTab === 'active' && (
                        <div className="flex justify-end mb-6 gap-2">
                            {/* 🟢 修改：只有當使用者「不是葉葉」時，才顯示發布個人委託按鈕 */}
                            {appUser?.name !== '葉葉' && (
                                <button 
                                    onClick={() => setModalType('createPersonalRequest')} 
                                    className="px-6 py-2 bg-purple-600 text-white rounded border-2 border-purple-800 font-black hover:bg-purple-700 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(76,29,149,1)] active:translate-y-0.5 active:shadow-none transition-all italic"
                                >
                                    <Zap size={18} /> 發布個人委託
                                </button>
                            )}
                        </div>
                            )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedList.map(group => {
                                const hasOrdered = !!orders.find(o => o.groupId === group.id && o.userId === appUser?.id);
                                const isNew = activeTab === 'active' ? checkIsNew(group, 'group') : false;

                                return (
                                    <div key={group.id} className={`bg-white rounded-lg p-5 shadow-sm border-2 border-slate-900 flex flex-col relative overflow-visible ${activeTab === 'closed' ? 'opacity-75 grayscale-[0.5]' : ''}`} onClick={() => activeTab === 'active' && markAsRead(group, 'group')}>
                                        {isNew && <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-50 border-2 border-white pointer-events-none animate-bounce">NEW!</div>}
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col gap-1">
                                                {group.type === '現貨' ? <span className="self-start px-2 py-0.5 text-[10px] font-black text-white bg-green-600 rounded border border-green-800">⚡ 現貨 IN STOCK</span> : group.type === '個人委託' ? <span className="self-start px-2 py-0.5 text-[10px] font-black text-white bg-purple-600 rounded border border-purple-800">📜 個人委託 REQUEST</span> : <span className="self-start px-2 py-0.5 text-[10px] font-black text-slate-900 bg-yellow-400 rounded border border-slate-900">⏳ 預購 PRE-ORDER</span>}
                                                <h3 className="font-black text-xl text-slate-900 italic">{group.title}</h3>
                                            </div>
                                        </div>
                                        <div className="mb-4 w-full aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden"><ImageSlider images={group.images || []} /></div>
                                        <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1">
                                            <p className="flex justify-between border-b border-slate-100 pb-1 font-bold"><span>收單時間</span><span className="text-red-600">{group.deadline}</span></p>
                                            {group.releaseDate && <p className="flex justify-between border-b border-slate-100 pb-1 font-bold"><span>預計發售</span><span className="text-blue-600">{group.releaseDate}</span></p>}
                                            <p className="flex justify-between border-b border-slate-100 pb-1"><span>品項數量</span><span>{group.items?.length || 0} 款</span></p>
                                            {group.infoUrl && <p className="flex justify-between border-b border-slate-100 pb-1"><span>官方資訊</span><a href={group.infoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 font-bold hover:underline flex items-center gap-1"><ExternalLink size={12} /> Link</a></p>}
                                            {hasOrdered && activeTab === 'active' && <div className="mt-2 bg-green-100 text-green-700 border border-green-300 px-2 py-1 rounded text-center text-xs font-black transform -rotate-1">已參戰 (ORDERED)</div>}
                                        </div>
                                        
                                        {group.status !== '揪團中' && (
                                            <div className="mt-4 mb-4">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 px-1 font-bold">{STATUS_STEPS.map(step => <span key={step} className={`${(group.trackingStatus || '下單中') === step ? 'text-blue-600' : ''}`}>{step}</span>)}</div>
                                                <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex border border-slate-300">{STATUS_STEPS.map((step, i) => { const currentIdx = STATUS_STEPS.indexOf(group.trackingStatus || '下單中'); return <div key={step} className={`flex-1 border-r border-white last:border-0 transition-all duration-500 ${i <= currentIdx ? 'bg-blue-600' : 'bg-transparent'}`} /> })}</div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-auto">
                                            {activeTab === 'active' && (
                                                <button className={`flex-1 px-4 py-2 rounded font-black text-white border-2 transition-all italic ${hasOrdered ? 'bg-green-600 border-green-800 hover:bg-green-700' : 'bg-red-600 border-red-800 hover:bg-red-700'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('joinGroup'); }}>{hasOrdered ? "修改訂單" : "我要跟團"}</button>
                                            )}
                                            <button className={`px-3 py-2 rounded font-bold border-2 ${activeTab !== 'active' ? 'flex-1 bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('viewOrders'); }}>查看明細</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {paginatedList.length === 0 && <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300"><Shield size={48} className="mb-3 opacity-50" /><p className="font-bold">暫無任務資料</p></div>}
                        </div>
                        <Pagination />
                    </div>
                )}
            </main>

            <Modal isOpen={modalType === 'wish'} onClose={() => { setModalType(null); setEditingWish(null); }} title={editingWish ? "修改願望" : "我要許願"}>
                <WishForm onSubmit={handleWishSubmit} onCancel={() => { setModalType(null); setEditingWish(null); }} initialData={editingWish} />
            </Modal>
            <Modal isOpen={modalType === 'createPersonalRequest'} onClose={() => setModalType(null)} title="發布個人委託">
                <PersonalRequestForm onSubmit={handleCreatePersonalRequest} onCancel={() => setModalType(null)} />
            </Modal>
            <Modal isOpen={modalType === 'secondPayment'} onClose={() => setModalType(null)} title="國際運二補試算">
                {selectedGroup && <SecondPaymentForm group={selectedGroup} orders={orders.filter(o => o.groupId === selectedGroup?.id)} currentUser={appUser} onUpdate={null} isReadOnly={true} />}
            </Modal>
            <Modal isOpen={modalType === 'changeName'} onClose={() => setModalType(null)} title="修改暱稱">
                <ChangeNameForm currentUser={appUser} onSubmit={handleChangeName} onCancel={() => setModalType(null)} />
            </Modal>
            <Modal isOpen={modalType === 'changePwd'} onClose={() => setModalType(null)} title="修改密碼"><ChangePasswordForm onSubmit={handleChangePassword} /></Modal>
            <Modal isOpen={modalType === 'changeAvatar'} onClose={() => setModalType(null)} title="更改頭像"><ChangeAvatarForm currentUser={appUser} onSubmit={handleChangeAvatar} /></Modal>
            <Modal isOpen={modalType === 'joinGroup'} onClose={() => setModalType(null)} title={`跟團：${selectedGroup?.title}`}>
                {selectedGroup && <OrderForm group={selectedGroup} currentOrder={orders.find(o => o.groupId === selectedGroup?.id && o.userId === appUser?.id)} onSubmit={(items) => handleSubmitOrder(items, selectedGroup.id)} />}
            </Modal>
            <Modal isOpen={modalType === 'viewOrders'} onClose={() => setModalType(null)} title={`訂單明細：${selectedGroup?.title}`}>
                {selectedGroup && <OrderSummary group={selectedGroup} orders={orders.filter(o => o.groupId === selectedGroup?.id)} currentUser={appUser} onEdit={selectedGroup?.status === '揪團中' ? () => setModalType('joinGroup') : null} />}
            </Modal>
        </div>
    );
}