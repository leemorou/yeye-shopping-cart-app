// src/components/Dashboard.jsx
import { useState, useEffect, useMemo } from "react"; 
import { Link } from 'react-router-dom';
// ★ 確認引入 setDoc
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { 
    ShoppingBag, Heart, Users, CheckCircle, Package, Plus, LogOut, 
    ExternalLink, Edit3, Settings, Calendar, Camera, Key, Trash2, Archive, School,
    Zap, Shield, Star, Megaphone, Save, X, Search, Plane, Calculator, DollarSign, Crown, Info, Clock, Tag
} from 'lucide-react'; 

import WishForm from "./WishForm";
import GroupForm from "./GroupForm";
import PersonalRequestForm from "./PersonalRequestForm";
import OrderForm from "./OrderForm";
import OrderSummary from "./OrderSummary";
import SecondPaymentForm from "./SecondPaymentForm"; 
import ChangePasswordForm from "./ChangePasswordForm";
import ChangeAvatarForm from "./ChangeAvatarForm";
import ChangeNameForm from "./ChangeNameForm";
import Modal from "./Modal";
import ImageSlider from "./ImageSlider";
import RichTextEditor from "./RichTextEditor";

import Header from "./Header";
import BillWidget from "./BillWidget";

import { db } from "../firebase"; 

const ADMIN_USER = "葉葉";
const STATUS_STEPS = ["下單中", "已下單", "日本出貨", "抵達日倉", "轉運中", "抵台", "二補計算", "已結案"];
const PAYMENT_STATUS_OPTIONS = [
    "未收款", "商品收款中", "商品已收款", "二補收款中", "二補已收款", "商品+二補收款中", "商品+二補已收款"
];
const MONTHLY_FEE = 90; 

export default function Dashboard({ appUser, usersData, handleLogout }) {
    const [wishes, setWishes] = useState([]);
    const [groups, setGroups] = useState([]);
    const [orders, setOrders] = useState([]);
    
    const [modalType, setModalType] = useState(null); 
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [editingWish, setEditingWish] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);

    const [activeTab, setActiveTab] = useState('wishing');

    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    const [bulletin, setBulletin] = useState("<div>🎉 <strong>PLUS ULTRA!!</strong> 歡迎來到英友盡有學院！</div>");
    const [isEditingBulletin, setIsEditingBulletin] = useState(false);
    const [tempBulletin, setTempBulletin] = useState("");

    const ITEMS_PER_PAGE = 15;
    const [currentPage, setCurrentPage] = useState(1);
    
    const [readStatusTick, setReadStatusTick] = useState(0);

    const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

    useEffect(() => {
        const unsubWishes = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "wishes"), (snap) => setWishes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubGroups = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "orders"), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubBulletin = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), (docSnap) => {
            if (docSnap.exists()) setBulletin(docSnap.data().content);
        });

        return () => { unsubWishes(); unsubGroups(); unsubOrders(); unsubBulletin(); };
    }, []);

    // 自動清理過期團務
    useEffect(() => {
        if (groups.length === 0) return;
        const checkAndCleanup = async () => {
            const now = new Date();
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            groups.forEach(async (group) => {
                if (group.status === '已結案' && group.closedAt) {
                    if (now - new Date(group.closedAt) > SEVEN_DAYS_MS) {
                        try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id)); } 
                        catch (e) { console.error("自動刪除失敗", e); }
                    }
                }
            });
        };
        checkAndCleanup();
    }, [groups]);

    // 會員過期檢查
    useEffect(() => {
        if (usersData.length === 0) return;
        const now = new Date();
        usersData.forEach(async (u) => {
            if (u.isMember && u.memberValidUntil && new Date(u.memberValidUntil) < now) {
                try {
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', u.id), {
                        isMember: false, memberValidUntil: null, memberCancelledAt: null 
                    });
                } catch (e) { console.error("更新過期會員失敗", e); }
            }
        });
    }, [usersData]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, filterStart, filterEnd]);

    // --- 邏輯功能 (已更新為雲端+本地同步版) ---

    const checkIsNew = (item, type) => {
        const timeKey = item.updatedAt || item.createdAt;
        if (!timeKey) return false;

        // 統一 Key 格式
        const itemKey = `${type}_${item.id}`; 

        // 1. 優先讀取：Firebase 資料庫裡的紀錄 (跟著帳號走)
        let lastRead = appUser?.readHistory?.[itemKey];

        // 2. 備用讀取：如果資料庫還沒載入，先看瀏覽器暫存 (提升體驗)
        if (!lastRead) {
            const localKey = `read_${appUser?.id}_${type}_${item.id}`;
            lastRead = localStorage.getItem(localKey);
        }

        if (!lastRead) return true; // 兩邊都沒紀錄，就是 New
        return new Date(timeKey) > new Date(lastRead); // 更新時間 > 最後讀取時間 = New
    };

    const markAsRead = async (item, type) => {
        const now = new Date().toISOString();
        const itemKey = `${type}_${item.id}`;
        const localKey = `read_${appUser?.id}_${type}_${item.id}`;

        // 1. 本地更新 (讓 UI 瞬間變色，不用等伺服器)
        localStorage.setItem(localKey, now);
        setReadStatusTick(t => t + 1); // 強制觸發畫面重繪，讓 NEW 消失

        // 2. 雲端同步 (使用 setDoc + merge)
        if (appUser && appUser.id) {
            try {
                const userRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', appUser.id);
                // 使用 merge: true，只更新 readHistory 裡的特定 Key，不影響其他資料
                await setDoc(userRef, {
                    readHistory: {
                        [itemKey]: now
                    }
                }, { merge: true });
            } catch (e) {
                console.error("雲端已讀同步失敗", e);
            }
        }
    };
    
    // ... 其餘功能保持不變 ...

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

    const handleDeleteGroup = async (group) => {
        if (!confirm(`確定要刪除團務「${group.title}」嗎？\n刪除後無法復原喔！`)) return;
        try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id)); } catch (e) { console.error("刪除失敗", e); alert("刪除失敗"); }
    };

    const handlePlusOne = async (wish) => {
        if (!appUser) return;
        markAsRead(wish, 'wish');
        const currentPlusOnes = wish.plusOnes || [];
        const isPlussed = currentPlusOnes.includes(appUser.name);
        const newPlusOnes = isPlussed ? currentPlusOnes.filter(n => n !== appUser.name) : [...currentPlusOnes, appUser.name];
        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "wishes", wish.id), { plusOnes: newPlusOnes });
    };

    const handleCreateGroup = async (data) => {
        await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "groups"), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: '揪團中', createdBy: appUser.name, exchangeRate: 0.21, shippingFee: 0, secondPayment: {}, paymentStatus: '未收款' });
        setModalType(null);
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

    const handleUpdateGroup = async (data) => {
        if (!editingGroup) return;
        try {
            await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", editingGroup.id), { ...data, updatedAt: new Date().toISOString(), status: editingGroup.status, createdAt: editingGroup.createdAt, exchangeRate: editingGroup.exchangeRate, shippingFee: editingGroup.shippingFee });
            setModalType(null); setEditingGroup(null); alert("團務資訊已更新！");
        } catch (e) { console.error("更新失敗", e); alert("更新失敗"); }
    };

    const handleUpdateSecondPayment = async (secondPaymentData) => {
        if (!selectedGroup) return;
        try { await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", selectedGroup.id), { secondPayment: secondPaymentData }); alert("二補資訊已更新！"); } catch (e) { console.error("二補更新失敗", e); alert("更新失敗"); }
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

    const handleCloseGroup = async (group) => {
        if (!confirm(`確定要將「${group.title}」結單嗎？`)) return;
        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id), { status: '已成團', trackingStatus: STATUS_STEPS[0] });
    };

    const handleUpdateGroupStatus = async (group, newStatus) => {
        const updates = { trackingStatus: newStatus };
        if (newStatus === '已結案') { updates.status = '已結案'; updates.closedAt = new Date().toISOString(); }
        if (newStatus === '二補計算') { updates.status = '二補計算'; }
        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id), updates);
    };

    const handleUpdatePaymentStatus = async (group, newPaymentStatus) => {
        await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "groups", group.id), { paymentStatus: newPaymentStatus });
    };

    const handleSaveBulletin = async () => {
        try {
            await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "system", "bulletin"), { content: tempBulletin }, { merge: true });
            setBulletin(tempBulletin);
            setIsEditingBulletin(false);
            alert("公告已更新！Plus Ultra！");
        } catch (e) { 
            console.error("更新公告失敗", e); 
            alert("更新失敗"); 
        }
    };

    // --- 計算邏輯 ---

    const totalTWD = useMemo(() => {
        if (!orders || !groups || orders.length === 0 || !appUser) return 0;

        const groupTotalQuantities = {};
        orders.forEach(o => {
            if (!groupTotalQuantities[o.groupId]) groupTotalQuantities[o.groupId] = 0;
            o.items.forEach(item => {
                groupTotalQuantities[o.groupId] += (Number(item.quantity) || 0);
            });
        });

        return orders.reduce((acc, order) => {
            if (order.userId !== appUser.id) return acc;
            const g = groups.find(grp => grp.id === order.groupId);
            if (!g) return acc;
            
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
                
                if (status === '未收款') {
                    return acc;
                } else if (status === '商品收款中') {
                    return acc + itemTotalTWD;
                } else if (status === '商品已收款') {
                    return acc;
                } else if (status === '二補收款中') {
                    return acc + Math.round(secondPayTWD);
                } else if (status === '二補已收款') {
                    return acc;
                } else if (status === '商品+二補收款中') {
                    return acc + itemTotalTWD + Math.round(secondPayTWD);
                } else if (status === '商品+二補已收款') {
                    return acc;
                }
            }
            return acc;
        }, 0); 
    }, [orders, groups, appUser]);

    const { memberFeeSplit, isMember } = useMemo(() => {
        if (!appUser || !usersData.length) return { memberFeeSplit: 0, isMember: false };
        const memberCount = usersData.filter(u => u.isMember).length;
        const fee = memberCount > 0 ? Math.ceil(MONTHLY_FEE / memberCount) : 0;
        return { memberFeeSplit: fee, isMember: appUser.isMember };
    }, [appUser, usersData]);

    const processGroups = (statusList, dateField = 'deadline') => {
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

    const activeGroups = processGroups(['揪團中'], 'deadline');
    const completedGroups = processGroups(['已成團'], 'releaseDate');
    const shippingGroups = processGroups(['二補計算'], 'releaseDate');
    const closedGroups = processGroups(['已結案'], 'releaseDate');

    const targetList = activeTab === 'active' ? activeGroups 
                      : activeTab === 'completed' ? completedGroups 
                      : activeTab === 'shipping' ? shippingGroups 
                      : activeTab === 'closed' ? closedGroups 
                      : []; 

    const listForPagination = targetList;
    const totalPages = Math.ceil(listForPagination.length / ITEMS_PER_PAGE);

    const paginatedList = listForPagination.slice(
        (currentPage - 1) * ITEMS_PER_PAGE, 
        currentPage * ITEMS_PER_PAGE
    );

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
            
            {/* ★ 使用新的 Header */}
            <Header 
                user={appUser} 
                onLogout={handleLogout} 
                onOpenModal={(type) => setModalType(type)}
            >
                <BillWidget 
                    isMember={isMember} 
                    fee={memberFeeSplit} 
                    amount={totalTWD} 
                />
            </Header>

            <section className="max-w-5xl mx-auto mt-6 px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 公告欄 */}
                    <div className="md:col-span-3 bg-white rounded-lg p-0 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 relative overflow-hidden flex flex-col">
                        <div className="bg-yellow-400 border-b-2 border-slate-900 p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg italic transform -skew-x-6"><Megaphone size={24} className="fill-slate-900" /><h2>ACADEMY NEWS</h2></div>
                            {appUser?.name === ADMIN_USER && !isEditingBulletin && (
                                <button onClick={() => { setTempBulletin(bulletin); setIsEditingBulletin(true); }} className="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold uppercase tracking-wider transition-colors"><Edit3 size={12} className="inline mr-1" /> Edit</button>
                            )}
                        </div>
                        <div className="p-6 flex-1">
                            {isEditingBulletin ? (
                                <div className="animate-in fade-in duration-300">
                                    <RichTextEditor initialContent={tempBulletin} onChange={setTempBulletin} />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => setIsEditingBulletin(false)} className="px-4 py-2 rounded border-2 border-slate-300 text-slate-600 font-bold hover:bg-slate-100"><X size={16} className="inline mr-1" /> CANCEL</button>
                                        <button onClick={handleSaveBulletin} className="px-4 py-2 rounded bg-red-600 border-2 border-red-800 text-white font-black hover:bg-red-700 shadow-sm"><Save size={16} className="inline mr-1" /> PUBLISH</button>
                                    </div>
                                </div>
                            ) : ( <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: bulletin }} /> )}
                        </div>
                    </div>

                    {/* JF26 專區 */}
                    <div className="md:col-span-1">
                        <Link
                            to="/jf26"
                            className="block w-full h-full relative group transition-all duration-300 hover:-translate-y-1 focus:outline-none"
                        >
                            <div className="h-full bg-white p-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#FACC15] transition-all overflow-hidden relative flex flex-col">
                                <div className="bg-slate-900 text-yellow-400 font-black text-center text-sm py-1 mb-1 italic">
                                    JF26 專區
                                </div>
                                <div className="flex-1 overflow-hidden rounded-lg border-2 border-slate-100 relative">
                                    <img src="https://www.jumpfesta.com/assets/images/top_jumpfesta_pc@2x.webp" alt="JF26" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-white shadow-sm transform rotate-12">
                                    HOT!
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            <nav className="max-w-5xl mx-auto mt-8 px-4">
                {/* 容器改用 flex justify-around 確保按鈕平均分布 */}
                <div className="bg-white p-1 rounded-lg shadow-sm border-2 border-slate-200 flex justify-around gap-1">
                    {[
                        { id: 'wishing', label: '許願池', icon: Heart },
                        { id: 'active', label: '揪團中', icon: Zap }, 
                        { id: 'completed', label: '已成團', icon: CheckCircle },
                        { id: 'shipping', label: '國際二補', icon: Plane }, // 稍微簡化文字長度
                        { id: 'closed', label: '已結案', icon: Archive }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`
                                flex-1                       /* 讓每個按鈕寬度平均 */
                                flex flex-col                /* 關鍵：垂直排列 (上圖下文) */
                                items-center justify-center 
                                gap-1                        /* 圖示跟文字的距離 */
                                py-2 px-0.5 sm:px-4          /* 調整內距，手機版左右不留白以爭取空間 */
                                rounded 
                                font-black 
                                transition-all 
                                border-2 
                                ${activeTab === tab.id 
                                    ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-md transform -translate-y-1' 
                                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }
                            `}
                        >
                            {/* 圖示 */}
                            <tab.icon size={20} className={activeTab === tab.id ? "animate-pulse" : ""} />
                            
                            {/* 文字：手機版設為 11px 避免過大，電腦版回復 14px (sm:text-sm) */}
                            <span className="text-[11px] sm:text-sm whitespace-nowrap">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {activeTab === 'wishing' && (
                    <div>
                        {/* ★ 新增：許願池說明文字 */}
                        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm text-blue-900 text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <Info className="shrink-0 mt-0.5 text-blue-600" size={18} />
                            <p className="leading-relaxed">
                                葉葉沒有揪團，但想找人一起上車嗎？點擊按鈕留下你的願望，號召大家一起+1，說不定聖誕老葉葉就會幫你們開團喔！(?)
                            </p>
                        </div>
                        <div className="flex justify-end mb-6">
                            <button onClick={() => { setEditingWish(null); setModalType('wish'); }} className="px-6 py-2 bg-red-600 text-white border-2 border-red-800 rounded font-black hover:bg-red-700 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(153,27,27,1)] active:translate-y-0.5 active:shadow-none transition-all italic"><Plus size={20} /> MAKE A WISH</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishes.map(wish => {
                                const isNew = checkIsNew(wish, 'wish');
                                return (
                                    <div 
                                        key={wish.id} 
                                        className="bg-white rounded-lg p-4 shadow-sm border-2 border-slate-200 hover:border-slate-900 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all flex flex-col h-full relative group"
                                        onClick={() => markAsRead(wish, 'wish')}
                                    >
                                        {/* ★ 修改這裡：加上 animate-bounce */}
                                        {isNew && (
                                            <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-50 border-2 border-white pointer-events-none animate-bounce">
                                                NEW!
                                            </div>
                                        )}

                                        <div className="mb-3 w-full aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden"><ImageSlider images={wish.images} /></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-slate-900 line-clamp-2">{wish.title}</h3>
                                                {(appUser?.id === wish.authorId || appUser?.name === ADMIN_USER) && (
                                                    <div className="flex gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingWish(wish); setModalType('wish'); }} className="text-slate-400 hover:text-blue-600 p-1" title="編輯"><Edit3 size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteWish(wish); }} className="text-slate-400 hover:text-red-600 p-1" title="刪除"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs px-2 py-1 rounded font-bold">BY: {wish.authorName}</span>
                                                {wish.url && <a href={wish.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 font-bold text-xs hover:underline truncate max-w-[120px] flex items-center gap-1"><ExternalLink size={10}/> Link</a>}
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">{wish.note || "無補充說明"}</p>
                                        </div>
                                        <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-end mt-auto">
                                            <div className="text-xs font-bold text-slate-400">{wish.plusOnes?.length > 0 && <span className="text-red-600 flex items-center gap-1"><Heart size={10} className="fill-red-600"/> {wish.plusOnes.length} 英雄集氣</span>}</div>
                                            <button onClick={(e) => { e.stopPropagation(); handlePlusOne(wish); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-black border-2 transition-all ${wish.plusOnes?.includes(appUser?.name) ? 'bg-red-100 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'}`}>+1</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {wishes.length === 0 && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300"><Star size={48} className="mb-3 opacity-50" /><p className="font-bold">還沒有願望... 成為第一個許願的英雄吧！</p></div>
                        )}
                    </div>
                )}

                {(activeTab === 'active' || activeTab === 'completed' || activeTab === 'closed' || activeTab === 'shipping') && (
                    <div>
                    {activeTab === 'active' && (
                        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-sm text-yellow-900 text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <Megaphone className="shrink-0 mt-0.5 text-yellow-600" size={18} />
                                <p className="leading-relaxed">
                                    葉葉揪團啦~~ 趕緊上車！或是你想要買自己的東西，那就發起委託，讓葉葉幫你發個人車車~
                                </p>
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
                            {(filterStart || filterEnd) && (
                                <button onClick={() => { setFilterStart(''); setFilterEnd(''); }} className="text-xs bg-slate-400 text-white px-3 py-1.5 rounded font-bold hover:bg-slate-500">清除篩選</button>
                            )}
                        </div>

                        {activeTab === 'active' && (
                            <div className="flex justify-end mb-6 gap-2">
                                {appUser?.name === ADMIN_USER ? (
                                    <button onClick={() => { setEditingGroup(null); setModalType('createGroup'); }} className="px-6 py-2 bg-slate-900 text-white rounded border-2 border-slate-900 font-black hover:bg-slate-700 flex items-center gap-2 shadow-[4px_4px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all italic"><Edit3 size={18} /> 發起團務</button>
                                ) : (
                                    <button onClick={() => setModalType('createPersonalRequest')} className="px-6 py-2 bg-purple-600 text-white rounded border-2 border-purple-800 font-black hover:bg-purple-700 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(76,29,149,1)] active:translate-y-0.5 active:shadow-none transition-all italic"><Zap size={18} /> 發布個人委託</button>
                                )}
                            </div>
                        )}

                        {activeTab === 'closed' && (
                            <div className="bg-red-50 text-red-600 p-3 rounded border-2 border-red-100 mb-6 text-center text-sm font-bold flex items-center justify-center gap-2 animate-pulse"><Trash2 size={16} /> ⚠️ 資料將於結案 7 天後自動銷毀！</div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedList.map(group => {
                                const hasOrdered = !!orders.find(o => o.groupId === group.id && o.userId === appUser?.id);
                                const isNew = activeTab === 'active' ? checkIsNew(group, 'group') : false;

                                return (
                                    <div 
                                        key={group.id} 
                                        className={`bg-white rounded-lg p-5 shadow-sm border-2 border-slate-900 flex flex-col relative overflow-visible ${activeTab === 'closed' ? 'opacity-75 grayscale-[0.5]' : ''}`}
                                        onClick={() => activeTab === 'active' && markAsRead(group, 'group')}
                                    >
                                        {/* ★ 修改這裡：加上 animate-bounce */}
                                        {isNew && (
                                            <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-50 border-2 border-white pointer-events-none animate-bounce">
                                                NEW!
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col gap-1">
                                                {group.type === '現貨' ? (
                                                    <span className="self-start px-2 py-0.5 text-[10px] font-black text-white bg-green-600 rounded border border-green-800">⚡ 現貨 IN STOCK</span>
                                                ) : group.type === '個人委託' ? (
                                                    <span className="self-start px-2 py-0.5 text-[10px] font-black text-white bg-purple-600 rounded border border-purple-800">📜 個人委託 REQUEST</span>
                                                ) : (
                                                    <span className="self-start px-2 py-0.5 text-[10px] font-black text-slate-900 bg-yellow-400 rounded border border-slate-900">⏳ 預購 PRE-ORDER</span>
                                                )}
                                                <h3 className="font-black text-xl text-slate-900 italic">{group.title}</h3>
                                            </div>
                                            {appUser?.name === ADMIN_USER && (
                                                <div className="flex gap-1 ml-auto">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setModalType('createGroup'); }} className="text-slate-400 hover:text-blue-600 p-1" title="編輯團務"><Edit3 size={18} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }} className="text-slate-400 hover:text-red-600 p-1" title="刪除團務"><Trash2 size={18} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mb-4 w-full aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden"><ImageSlider images={group.images || []} /></div>
                                        <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1">
                                            <p className="flex justify-between border-b border-slate-100 pb-1 font-bold"><span>收單時間</span><span className="text-red-600">{group.deadline}</span></p>
                                            
                                            {group.releaseDate && (
                                                <p className="flex justify-between border-b border-slate-100 pb-1 font-bold">
                                                    <span>預計發售</span>
                                                    <span className="text-blue-600">{group.releaseDate}</span>
                                                </p>
                                            )}

                                            <p className="flex justify-between border-b border-slate-100 pb-1"><span>品項數量</span><span>{group.items?.length || 0} 款</span></p>
                                            {group.infoUrl && (
                                                <p className="flex justify-between border-b border-slate-100 pb-1"><span>官方資訊</span><a href={group.infoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 font-bold hover:underline flex items-center gap-1"><ExternalLink size={12} /> Link</a></p>
                                            )}
                                            {hasOrdered && activeTab === 'active' && <div className="mt-2 bg-green-100 text-green-700 border border-green-300 px-2 py-1 rounded text-center text-xs font-black transform -rotate-1">已參戰 (ORDERED)</div>}
                                        </div>
                                        
                                        {group.status !== '揪團中' && (
                                            <div className="mt-4 mb-4">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 px-1 font-bold">{STATUS_STEPS.map(step => <span key={step} className={`${(group.trackingStatus || '下單中') === step ? 'text-blue-600' : ''}`}>{step}</span>)}</div>
                                                <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex border border-slate-300">{STATUS_STEPS.map((step, i) => { const currentIdx = STATUS_STEPS.indexOf(group.trackingStatus || '下單中'); return <div key={step} className={`flex-1 border-r border-white last:border-0 transition-all duration-500 ${i <= currentIdx ? 'bg-blue-600' : 'bg-transparent'}`} /> })}</div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-auto">
                                            {activeTab === 'active' && !(appUser?.name === ADMIN_USER && group.type === '個人委託') && (
                                                <button className={`flex-1 px-4 py-2 rounded font-black text-white border-2 transition-all italic ${hasOrdered ? 'bg-green-600 border-green-800 hover:bg-green-700' : 'bg-red-600 border-red-800 hover:bg-red-700'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('joinGroup'); }}>{hasOrdered ? "修改訂單" : "我要跟團"}</button>
                                            )}
                                            <button className={`px-3 py-2 rounded font-bold border-2 ${activeTab !== 'active' ? 'flex-1 bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500'}`} onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('viewOrders'); }}>查看明細</button>
                                            
                                            {(activeTab === 'shipping' || activeTab === 'closed') && (
                                                <button className="px-3 py-2 rounded font-bold border-2 bg-yellow-400 border-slate-900 text-slate-900 hover:bg-yellow-500" onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setModalType('secondPayment'); }}>二補明細</button>
                                            )}

                                            {appUser?.name === ADMIN_USER && activeTab === 'active' && <button onClick={(e) => { e.stopPropagation(); handleCloseGroup(group); }} className="px-3 py-2 rounded font-black bg-slate-900 text-white hover:bg-slate-700 border-2 border-slate-900">成團</button>}
                                        </div>
                                        
                                        {(activeTab === 'completed' || activeTab === 'shipping' || activeTab === 'closed') && appUser?.name === ADMIN_USER && (
                                            <div className="mt-3 pt-3 border-t-2 border-slate-100 space-y-2" onClick={e => e.stopPropagation()}>
                                                <select className="w-full bg-slate-50 border-2 border-slate-200 text-sm rounded px-2 py-1 font-bold text-slate-700" value={group.trackingStatus || '下單中'} onChange={(e) => handleUpdateGroupStatus(group, e.target.value)}>{STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                                
                                                <div className="flex items-center gap-2 bg-yellow-50 p-1 rounded border border-yellow-200">
                                                    <DollarSign size={14} className="text-yellow-600" />
                                                    <span className="text-xs font-bold text-slate-500">收款：</span>
                                                    <select 
                                                        className="flex-1 bg-transparent text-xs font-black text-slate-900 focus:outline-none" 
                                                        value={group.paymentStatus || '未收款'} 
                                                        onChange={(e) => handleUpdatePaymentStatus(group, e.target.value)}
                                                    >
                                                        {PAYMENT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {paginatedList.length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300"><Shield size={48} className="mb-3 opacity-50" /><p className="font-bold">暫無任務資料</p></div>
                            )}
                        </div>

                        <Pagination />
                    </div>
                )}
            </main>

            <Modal isOpen={modalType === 'wish'} onClose={() => { setModalType(null); setEditingWish(null); }} title={editingWish ? "修改願望" : "我要許願"}>
                <WishForm onSubmit={handleWishSubmit} onCancel={() => { setModalType(null); setEditingWish(null); }} initialData={editingWish} />
            </Modal>
            <Modal isOpen={modalType === 'createGroup'} onClose={() => { setModalType(null); setEditingGroup(null); }} title={editingGroup ? "編輯團務" : "發起新團務"}>
                <GroupForm onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup} onCancel={() => { setModalType(null); setEditingGroup(null); }} initialData={editingGroup} submitLabel={editingGroup ? "儲存修改" : "發佈團購"} />
            </Modal>
            <Modal isOpen={modalType === 'createPersonalRequest'} onClose={() => setModalType(null)} title="發布個人委託">
                <PersonalRequestForm onSubmit={handleCreatePersonalRequest} onCancel={() => setModalType(null)} />
            </Modal>
            <Modal isOpen={modalType === 'secondPayment'} onClose={() => setModalType(null)} title="國際運二補試算">
                {selectedGroup && <SecondPaymentForm group={selectedGroup} orders={orders.filter(o => o.groupId === selectedGroup?.id)} currentUser={appUser} onUpdate={handleUpdateSecondPayment} />}
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