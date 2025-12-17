// src/components/JF26Page.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ExternalLink, Tag, AlertCircle, Search, Rocket, Plus, Edit3, Trash2, X, 
    Database, ShoppingCart, MapPin, Truck, List, ArrowUp, ArrowDown, Home, 
    Crown, LogOut, Camera, Key, Calendar, Clock, CheckCircle, ArrowLeft,
    Ticket, DollarSign, Package, HelpCircle, Clock3,
    ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Save, 
    Calculator, FileText, CheckSquare, Square, Truck as TruckIcon, PackageCheck, AlertTriangle, Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// 引入縮放套件
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// 引入需要的 Modal 表單
import Modal from "./Modal";
import ChangeNameForm from "./ChangeNameForm";
import ChangeAvatarForm from "./ChangeAvatarForm";
import ChangePasswordForm from "./ChangePasswordForm";

import JSPreOrderTab from './JSPreOrderTab';

const ADMIN_USER = "葉葉";

// 使用者 ID 與 訂單暱稱 的對照表
const USER_MAPPING = {
    "titi": "踢",
    "xiaomei": "玫",
    "heng": "姮",
    "baobao": "寶",
    "yeye": "葉",
    "Sjie": "S姐",
    "qiaoyu": "魚",
    "teacher": "澄",
    "ann": "安",
    "Aurora": "Aurora"
};

export default function JF26Page({ currentUser }) {
    const [currentTab, setCurrentTab] = useState('vendors');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalType, setModalType] = useState(null); 
    const [lightboxImg, setLightboxImg] = useState(null);
    const [myTotalBill, setMyTotalBill] = useState(0);

    const isAdmin = currentUser?.id === "yeye"; 
    const isMember = currentUser?.isMember;

    // 計算總金額 (JS + JCS)
    useEffect(() => {
        if (!currentUser?.id) return;

        const myOrderName = USER_MAPPING[currentUser.id] || currentUser.name;
        
        let jsTotal = 0;
        let jcsTotal = 0;

        // A. 監聽 JS 先行
        const unsubJS = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const orders = data.orders || [];
                const settings = data.settings || { exchangeRate: 0.24, totalShippingJPY: 0 };
                
                const totalBoughtQty = orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0);
                const shipPerUnit = totalBoughtQty > 0 ? (settings.totalShippingJPY / totalBoughtQty) : 0;

                const myOrders = orders.filter(o => o.buyer === myOrderName && o.isBought);
                
                const myYenTotal = myOrders.reduce((sum, item) => {
                    return sum + (item.price * item.quantity) + (shipPerUnit * item.quantity);
                }, 0);

                jsTotal = Math.ceil(myYenTotal * settings.exchangeRate);
            } else {
                jsTotal = 0;
            }
            setMyTotalBill(jsTotal + jcsTotal);
        });

        // B. 監聽 JCS 抽選
        const unsubJCS = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            // 這裡暫時沒有實作 JCS 的個人金額計算邏輯，預留位置
            // let tempJcsTotal = ...
            jcsTotal = 0; 
            setMyTotalBill(jsTotal + jcsTotal);
        });

        return () => {
            unsubJS();
            unsubJCS();
        };
    }, [currentUser]);

    const handleLogout = () => {
        localStorage.removeItem('app_user_id');
        window.location.reload(); 
    };

    const handleChangeName = async (newName) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { name: newName });
            alert("暱稱修改成功！");
            setModalType(null);
        } catch (e) { console.error("修改暱稱失敗", e); alert("修改失敗"); }
    };

    const handleChangeAvatar = async (newAvatarUrl) => {
        if (!currentUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { avatar: newAvatarUrl });
        alert("頭像更新成功！");
        setModalType(null);
    };

    const handleChangePassword = async (newPwd) => {
        if (!currentUser) return;
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { password: newPwd });
        alert("密碼修改成功！");
        setModalType(null);
    };

    const handleToggleMembership = async () => {
        if (!currentUser) return;
        if (currentUser.isMember) {
            if (currentUser.memberValidUntil) {
                if (confirm("要恢復自動續訂嗎？\n您的會員資格將繼續保持。")) {
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { memberValidUntil: null, memberCancelledAt: null });
                    alert("已恢復續訂！");
                }
            } else {
                if (confirm("確定要取消訂閱嗎？\n會員資格將保留 30 天，之後自動失效。")) {
                    const next30Days = new Date();
                    next30Days.setDate(next30Days.getDate() + 30); 
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberValidUntil: next30Days.toISOString(), memberCancelledAt: new Date().toISOString() });
                    alert(`已取消續訂。\n您的會員資格將保留至 ${next30Days.toLocaleDateString()}。`);
                }
            }
        } else {
            if (confirm("確定要訂閱 PLUS ULTRA 會員嗎？\n將共同分擔日本門號維持費。")) {
                await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberSince: new Date().toISOString(), memberValidUntil: null, memberCancelledAt: null });
                alert("歡迎加入英雄會員！");
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-yellow-400 selection:text-black">
          {/* Header */}
            <header className="sticky top-0 z-30 bg-slate-900 border-b-4 border-yellow-400 px-4 py-3 shadow-md">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link to="/home" className="flex items-center gap-2 bg-yellow-400 px-4 py-1.5 rounded transform -skew-x-12 border-2 border-yellow-600 hover:scale-105 transition-transform group">
                            <ArrowLeft size={20} className="text-slate-900 transform skew-x-12 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                            <span className="text-slate-900 font-black text-sm transform skew-x-12 hidden">返回</span>
                        </Link>
                        <h1 className="text-2xl font-black italic tracking-tight text-white">
                            JF26 作戰中心
                        </h1>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        {currentUser && (
                            <BillWidget amount={myTotalBill} />
                        )}
                        
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400">HERO NAME</p>
                            <p className="font-bold text-white tracking-wide">{currentUser?.name}</p>
                        </div>

                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${isMember ? 'border-purple-500' : 'border-yellow-400'} shadow-lg overflow-hidden hover:scale-105 transition-all relative`}>
                                <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" className="w-full h-full object-cover" />
                                {isMember && (
                                    <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-white">
                                        <Crown size={8} className="text-white fill-white" />
                                    </div>
                                )}
                            </button>
                            
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-slate-900 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-3 py-2 border-b-2 border-slate-100 bg-slate-50">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black text-slate-500 flex items-center gap-1">
                                                <Crown size={12} className={isMember ? "text-purple-600 fill-purple-600" : "text-slate-300"} />
                                                PLUS 會員
                                            </span>
                                            {isMember && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold">SUBSCRIBED</span>}
                                        </div>
                                        <button 
                                            onClick={handleToggleMembership}
                                            className={`w-full text-xs font-bold py-1.5 rounded border-2 transition-all ${isMember && currentUser.memberValidUntil ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : isMember ? 'bg-white border-slate-300 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300' : 'bg-purple-600 border-purple-800 text-white hover:bg-purple-700'}`}
                                        >
                                            {isMember 
                                                ? (currentUser.memberValidUntil ? "恢復續訂 (取消申請中)" : "取消訂閱 (保留30天)") 
                                                : "訂閱會員 (NT$90/月均分)"}
                                        </button>
                                    </div>
                                    
                                    <button onClick={() => { setMenuOpen(false); setModalType('changeName'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Tag size={16} /> 修改暱稱</button>
                                    <button onClick={() => { setMenuOpen(false); setModalType('changeAvatar'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Camera size={16} /> 更換英雄頭像</button>
                                    <button onClick={() => { setMenuOpen(false); setModalType('changePwd'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Key size={16} /> 修改密碼</button>
                                    
                                    {/* 🟢 這裡確保 Link 和 Settings 都已定義 */}
                                    {currentUser?.name === '葉葉' && (
                                        <div className="border-t border-slate-100 mt-1">
                                            <Link
                                                to="/admin/dashboard"
                                                className="block px-4 py-2 text-sm text-blue-700 font-black hover:bg-blue-50 transition-colors flex items-center gap-2"
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <Settings size={16} /> 團務後台管理
                                            </Link>
                                        </div>
                                    )}

                                    <div className="border-t-2 border-slate-100 my-1"></div>
                                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 font-black">
                                        <LogOut size={16} /> 登出
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* 標題區 */}
                <div className="text-center mb-8 relative">
                    <div className="inline-block relative">
                        <h2 className="text-5xl font-black text-slate-900 italic transform -skew-x-6 z-10 relative">
                            JUMP FESTA 2026
                        </h2>
                        <div className="absolute -bottom-2 -right-4 w-[110%] h-6 bg-yellow-400 -z-0 transform -skew-x-6"></div>
                    </div>
                    <p className="text-slate-500 font-bold mt-4 flex items-center justify-center gap-2">
                        <Rocket size={18} className="text-slate-900" /> 荷包起飛中...
                    </p>
                    
                    {/* 連結區塊 */}
                    <div className="flex justify-center gap-3 text-sm font-black mt-6 flex-wrap">
                        <a href="https://www.jumpfesta.com/maker/" target="_blank" rel="noreferrer" className="px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center gap-1 rounded">
                            JF26 攤商資訊 <ExternalLink size={14}/>
                        </a>
                        <a href="https://jumpcs.shueisha.co.jp/shop/pages/jumpfesta.aspx" target="_blank" rel="noreferrer" className="px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center gap-1 rounded">
                            JCS特設頁 <ExternalLink size={14}/>
                        </a>
                        <a href="https://docs.google.com/spreadsheets/d/1zfT-MMN-DwIRamibiAQUyp4lJLGBoxS3Rpeb1aVJLK8/edit?usp=sharing" target="_blank" rel="noreferrer" className="px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center gap-1 rounded">
                            JF26 資訊表 <ExternalLink size={14}/>
                        </a>
                        <a href="https://forms.gle/VsHvAvraVQp4dHaK8" target="_blank" rel="noreferrer" className="px-4 py-1.5 bg-yellow-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center gap-1 rounded">
                            JF26 抽選登記 <ExternalLink size={14}/>
                        </a>
                    </div>
                </div>

                {/* TAB 導航 */}
                <nav className="max-w-md mx-auto mb-8 px-4">
                    <div className="bg-white p-1 rounded-lg shadow-sm border-2 border-slate-200 flex justify-around gap-1">
                        {[
                            { id: 'vendors', label: '攤商情報', icon: Rocket },
                            { id: 'js_pre', label: 'JS 先行 (Online)', icon: ShoppingCart },
                            { id: 'jcs_lottery', label: 'JCS 抽選', icon: Ticket }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = currentTab === tab.id;

                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setCurrentTab(tab.id)} 
                                    className={`
                                        flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 sm:px-4 rounded font-black transition-all border-2 
                                        ${isActive 
                                            ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-md transform -translate-y-1' 
                                            : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    <Icon size={20} className={isActive ? "animate-pulse" : ""} />
                                    <span className="text-[11px] sm:text-sm whitespace-nowrap">
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* 內容區塊渲染 */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {currentTab === 'vendors' && (
                        <VendorsTab currentUser={currentUser} isAdmin={isAdmin} />
                    )}
                    {currentTab === 'js_pre' && (
                        <JSPreOrderTab currentUser={currentUser} isAdmin={isAdmin} onImageClick={setLightboxImg} />
                    )}
                    {currentTab === 'jcs_lottery' && (
                        <JCSLotteryTab currentUser={currentUser} isAdmin={isAdmin} />
                    )}
                </div>
            </div>

             {/* Modals */}
            <Modal isOpen={modalType === 'changeName'} onClose={() => setModalType(null)} title="修改暱稱">
                <ChangeNameForm currentUser={currentUser} onSubmit={handleChangeName} onCancel={() => setModalType(null)} />
            </Modal>
            <Modal isOpen={modalType === 'changePwd'} onClose={() => setModalType(null)} title="修改密碼">
                <ChangePasswordForm onSubmit={handleChangePassword} />
            </Modal>
            <Modal isOpen={modalType === 'changeAvatar'} onClose={() => setModalType(null)} title="更改頭像">
                <ChangeAvatarForm currentUser={currentUser} onSubmit={handleChangeAvatar} />
            </Modal>

            {/* Lightbox */}
            {lightboxImg && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 animate-in fade-in duration-200">
                    <TransformWrapper initialScale={1} minScale={0.5} maxScale={4} centerOnInit={true}>
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                <div className="absolute top-4 right-4 z-[110] flex items-center gap-2 bg-slate-900/80 p-2 rounded-full backdrop-blur border border-slate-700 shadow-xl">
                                    <button onClick={() => zoomIn()} className="p-2 text-white hover:text-yellow-400 hover:bg-white/10 rounded-full"><ZoomIn size={20} /></button>
                                    <button onClick={() => zoomOut()} className="p-2 text-white hover:text-yellow-400 hover:bg-white/10 rounded-full"><ZoomOut size={20} /></button>
                                    <button onClick={() => resetTransform()} className="p-2 text-white hover:text-yellow-400 hover:bg-white/10 rounded-full"><RotateCcw size={20} /></button>
                                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                                    <button onClick={() => setLightboxImg(null)} className="p-2 text-white hover:text-red-400 hover:bg-white/10 rounded-full"><X size={20} /></button>
                                </div>
                                <TransformComponent wrapperClass="!w-screen !h-screen" contentClass="!w-screen !h-screen flex items-center justify-center">
                                    <img src={lightboxImg} alt="Full Preview" className="max-w-full max-h-full object-contain"/>
                                </TransformComponent>
                            </>
                        )}
                    </TransformWrapper>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 子元件定義 
// ============================================================================

// 1. 小工具：金額顯示 Widget
function BillWidget({ amount }) {
    const description = "此區只計算 JF26 相關團務費用";

    return (
        <div className="
            relative group border-r border-slate-700 mr-1 pr-2 sm:mr-2 sm:pr-4
            flex w-full items-center justify-end gap-3   /* 手機版：左右並排、佔滿寬度 */
            sm:w-auto sm:flex-col sm:items-end sm:gap-0  /* 電腦版：垂直堆疊、靠右對齊 */
        ">
            <button 
                type="button"
                onClick={() => alert(description)}
                className="
                    focus:outline-none group/btn
                    flex items-center gap-2              /* 手機版：橫向間距 */
                    sm:mb-1 sm:gap-1.5
                "
            >
                <span className="text-[16px] sm:text-base text-slate-400 font-bold whitespace-nowrap pt-0.5">
                    個人英雄帳單
                </span>
                
                <span className="text-[10px] text-yellow-500 group-hover/btn:text-yellow-400 border-b border-dashed border-yellow-500/50 flex items-center gap-0.5 transition-colors">
                    <span className="hidden sm:inline">這是什麼?</span>
                    <HelpCircle className="block sm:hidden" size={14} />
                    <HelpCircle className="hidden sm:block" size={10} />
                </span>
            </button>

            <div className="text-yellow-400 font-black drop-shadow-sm text-right flex items-center">
                <span className="text-xs mr-1 text-yellow-200 mt-1">NT$</span>
                <span className="text-xl sm:text-xl font-mono">
                    {amount.toLocaleString()}
                </span>
            </div>

            <div className="absolute top-12 right-0 w-max bg-slate-800 text-white text-xs p-2 rounded border border-yellow-400 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 hidden sm:block whitespace-pre-wrap text-left">
               {description}
            </div>
        </div>
    );
}

// 2. 分頁：攤商情報 (Vendors)
function VendorsTab({ currentUser, isAdmin, modalType, setModalType }) {
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingVendor, setEditingVendor] = useState(null);
    const [viewingIpsVendor, setViewingIpsVendor] = useState(null);
    const [readStatusTick, setReadStatusTick] = useState(0);

    const INITIAL_VENDORS = [
        {
            name: "JS 先行 (JUMP SHOP)",
            mainUrl: "https://jumpfesta.com/maker/",
            preOrder: { period: "2025/12/17 ~ 12/21", url: "https://jumpshop-online.com/collections/jf2026" },
            postOrder: { period: "", url: "" },
            tags: ["事前受注"],
            products: ["Jump全作品"],
            notes: "Jump Shop Online 先行販售，官方推特有更多資訊"
        },
    ];

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVendors(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        });
        return () => unsub();
    }, []);

    // ★ 關鍵修正：這裡改為 currentUser，並加上安全檢查
    const checkIsNew = (item) => {
        try {
            const timeKey = item.updatedAt || item.createdAt;
            if (!timeKey) return false;
            
            const itemKey = `vendor_${item.id}`;
            
            // 1. 優先讀取 Firebase (注意變數名稱是 currentUser)
            let lastRead = currentUser?.readHistory?.[itemKey];

            // 2. 備用讀取 LocalStorage
            if (!lastRead && currentUser?.id) {
                try {
                    const localKey = `read_${currentUser.id}_${itemKey}`;
                    lastRead = localStorage.getItem(localKey);
                } catch (err) {
                    console.warn("LocalStorage access denied:", err);
                }
            }
            
            if (!lastRead) return true; 
            return new Date(timeKey) > new Date(lastRead);
        } catch (error) {
            console.error("checkIsNew error:", error);
            return false;
        }
    };

    // ★ 關鍵修正：這裡改為 currentUser
    const markAsRead = async (item) => {
        if (!currentUser?.id) return;

        const now = new Date().toISOString();
        const itemKey = `vendor_${item.id}`;
        const localKey = `read_${currentUser.id}_${itemKey}`;

        try {
            // 1. 本地更新
            try {
                localStorage.setItem(localKey, now);
                setReadStatusTick(t => t + 1); 
            } catch (err) {
                console.warn("LocalStorage write failed:", err);
            }

            // 2. 雲端同步
            const userRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id);
            await setDoc(userRef, {
                readHistory: {
                    [itemKey]: now
                }
            }, { merge: true });

        } catch (e) {
            console.error("同步已讀狀態失敗", e);
        }
    };

    const handleInitData = async () => {
        if (!confirm("確定要匯入預設資料嗎？")) return;
        try {
            const batch = writeBatch(db);
            INITIAL_VENDORS.forEach((v, idx) => {
                const docRef = doc(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"));
                batch.set(docRef, { ...v, order: idx, updatedAt: new Date().toISOString() });
            });
            await batch.commit();
        } catch (e) { alert("匯入失敗"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這張卡片嗎？")) return;
        try { await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", id)); } 
        catch (e) { console.error("刪除失敗", e); alert("刪除失敗"); }
    };

    const filteredVendors = vendors.filter(v => 
        (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (Array.isArray(v.products) 
            ? v.products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
            : (v.products || v.ips || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const getTagStyle = (tag) => {
        switch(tag) {
            case "事前受注": return "bg-yellow-400 text-slate-900 border-slate-900";
            case "事後通販": return "bg-blue-500 text-white border-slate-900";
            case "場販限定": return "bg-red-600 text-white border-slate-900";
            default: return "bg-white text-slate-800 border-slate-900";
        }
    };

    return (
        <div>
            {isAdmin && vendors.length === 0 && (
                <div className="flex justify-end mb-4">
                      <button onClick={handleInitData} className="px-4 py-1.5 bg-blue-100 text-blue-600 border border-blue-300 rounded hover:bg-blue-200 flex items-center gap-1 font-bold">
                        <Database size={12} /> 匯入資料庫
                    </button>
                </div>
            )}

            <div className="mb-10 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full h-12 rounded-xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] transition-all focus-within:ring-4 focus-within:ring-yellow-400/50 overflow-hidden flex items-center">
                    <div className="pl-4 pr-2 flex items-center justify-center text-slate-900">
                        <Search size={24} strokeWidth={3} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="搜尋攤商名稱 或 IP..." 
                        className="w-full h-full bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium text-lg" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingVendor(null); setModalType('vendor'); }} 
                        className="w-full md:w-auto px-6 h-12 bg-slate-900 text-yellow-400 rounded-xl border-4 border-slate-900 font-black shadow-[4px_4px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#FACC15] flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                        <Plus size={24} strokeWidth={3} /> 新增攤商
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor, index) => {
                    const productList = Array.isArray(vendor.products) ? vendor.products : [];
                    const showEllipsis = productList.length > 10;
                    const displayedProducts = showEllipsis ? productList.slice(0, 10) : productList;

                    const isNew = checkIsNew(vendor);

                    return (
                        <div 
                            key={vendor.id} 
                            onClick={() => markAsRead(vendor)}
                            className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[8px_8px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#FACC15] transition-all duration-200 flex flex-col relative group cursor-pointer"
                        >
                            {isNew && (
                                <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-20 border-2 border-white pointer-events-none animate-bounce">
                                    NEW!
                                </div>
                            )}

                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-900 z-10"></div>
                            
                            <div className="flex justify-between items-start mb-4 pr-4 border-b-2 border-slate-100 pb-2">
                                <h3 className="font-black text-2xl text-slate-900 leading-tight italic">{vendor.name}</h3>
                                {isAdmin && (
                                    <div className="flex flex-col gap-1 ml-2 shrink-0">
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); setModalType('vendor'); }} className="p-1.5 bg-white text-slate-900 rounded border-2 border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]" title="編輯"><Edit3 size={14} strokeWidth={2.5} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(vendor.id); }} className="p-1.5 bg-red-500 text-white rounded border-2 border-slate-900 hover:bg-red-600 shadow-[2px_2px_0px_0px_#000]" title="刪除"><Trash2 size={14} strokeWidth={2.5} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {vendor.tags && vendor.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {vendor.tags.map(tag => (
                                        <span key={tag} className={`text-[11px] font-black px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${getTagStyle(tag)}`}>{tag}</span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-4 flex-1">
                                <div>
                                    <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1 uppercase tracking-wider"><Tag size={12}/> 參與作品 (IPs)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {displayedProducts.map((ip, idx) => (
                                            <span key={idx} className="bg-yellow-50 text-slate-900 text-xs font-bold px-2 py-1 border-2 border-slate-200 transition-transform hover:scale-105 hover:border-slate-900 hover:bg-yellow-200">{ip}</span>
                                        ))}
                                        {showEllipsis && (
                                            <button onClick={(e) => { e.stopPropagation(); setViewingIpsVendor(vendor); }} className="bg-slate-800 text-white text-xs font-bold px-2 py-1 border-2 border-slate-900 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"><List size={12}/> MORE...</button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 bg-slate-50 p-3 rounded border-2 border-slate-200 relative">
                                    {vendor.preOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-1 border border-slate-900 mr-2">事前</span>
                                            <span className="font-bold text-slate-700">{vendor.preOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.postOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-blue-500 text-white px-1 border border-slate-900 mr-2">事後</span>
                                            <span className="font-bold text-slate-700">{vendor.postOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.tags?.includes("場販限定") && (
                                        <div className="text-sm flex items-center gap-2 text-red-600 font-black">
                                            <MapPin size={14} /> 僅限 JUMP FESTA 現場
                                        </div>
                                    )}
                                </div>

                                {vendor.notes && (
                                    <div className="flex items-start gap-2 bg-red-50 p-2 rounded border-2 border-red-100">
                                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold text-red-600 leading-relaxed">{vendor.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3 pt-4 border-t-2 border-slate-100">
                                <div className="flex gap-2">
                                    {vendor.preOrder?.url && (
                                        <a href={vendor.preOrder.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex-1 py-2 bg-yellow-400 text-slate-900 text-center font-black rounded border-2 border-slate-900 hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none"><ShoppingCart size={14} strokeWidth={3} /> 事前受注</a>
                                    )}
                                    {vendor.postOrder?.url && (
                                        <a href={vendor.postOrder.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex-1 py-2 bg-blue-500 text-white text-center font-black rounded border-2 border-slate-900 hover:bg-blue-400 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none"><Truck size={14} strokeWidth={3} /> 事後通販</a>
                                    )}
                                </div>
                                {vendor.mainUrl && (
                                    <a href={vendor.mainUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="block w-full py-2 bg-slate-100 text-slate-700 text-center font-black rounded border-2 border-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"><ExternalLink size={16} /> 攤商/活動官網</a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <Modal isOpen={modalType === 'vendor'} onClose={() => { setModalType(null); setEditingVendor(null); }} title={editingVendor ? "EDIT VENDOR" : "NEW VENDOR"}>
                <VendorForm 
                    initialData={editingVendor} 
                    onSubmit={async (data) => {
                        try {
                            if (editingVendor) {
                                await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", editingVendor.id), { ...data, updatedAt: new Date().toISOString() });
                                alert("更新成功！");
                            } else {
                                await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), { ...data, order: Date.now(), updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
                                alert("新增成功！");
                            }
                            setModalType(null);
                        } catch(e) { console.error("儲存失敗", e); alert("儲存失敗"); }
                    }}
                    onCancel={() => setModalType(null)}
                />
            </Modal>
            
            {/* IP Viewer Modal */}
            {viewingIpsVendor && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingIpsVendor(null)}>
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border-4 border-slate-900 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 px-4 py-3 border-b-4 border-yellow-400 flex justify-between items-center">
                            <h3 className="font-black text-lg text-white flex items-center gap-2 truncate italic">
                                <Tag size={20} className="text-yellow-400"/> {viewingIpsVendor.name}
                            </h3>
                            <button onClick={() => setViewingIpsVendor(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50">
                             <div className="flex flex-wrap gap-2">
                                {(Array.isArray(viewingIpsVendor.products) ? viewingIpsVendor.products : []).map((ip, idx) => (
                                    <span key={idx} className="bg-white text-slate-900 text-sm font-bold px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#ccc]">{ip}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 3. 表單：Vendor Form
function VendorForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        mainUrl: initialData?.mainUrl || '',
        preOrder: { period: initialData?.preOrder?.period || '', url: initialData?.preOrder?.url || '' },
        postOrder: { period: initialData?.postOrder?.period || '', url: initialData?.postOrder?.url || '' },
        tags: initialData?.tags || [], 
        products: initialData?.products || [],
        notes: initialData?.notes || ''
    });

    const handleTagChange = (tag) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
            return { ...prev, tags: newTags };
        });
    };

    const handleProductsChange = (e) => {
        const val = e.target.value;
        const arr = val.split(/[,，、]/).map(s => s.trim()).filter(s => s);
        setFormData({ ...formData, products: arr });
    };

    const inputClass = "w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0 focus:shadow-[4px_4px_0px_0px_#FACC15] transition-all";
    const labelClass = "block text-xs font-black text-slate-700 mb-1 uppercase tracking-wide";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div>
                <label className={labelClass}>攤商名稱</label>
                <input className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
                <label className={labelClass}>官方網址 (Main URL)</label>
                <input className={inputClass} value={formData.mainUrl} onChange={e => setFormData({...formData, mainUrl: e.target.value})} placeholder="https://..." />
            </div>
            <div>
                <label className={labelClass}>販售類型</label>
                <div className="flex gap-3">
                    {["事前受注", "事後通販", "場販限定"].map(tag => (
                        <label key={tag} className={`flex-1 cursor-pointer border-2 rounded px-2 py-2 text-center text-xs font-black transition-all ${formData.tags.includes(tag) ? 'bg-slate-900 text-yellow-400 border-slate-900 shadow-[2px_2px_0px_0px_#FACC15] transform -translate-y-0.5' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                            <input type="checkbox" className="hidden" checked={formData.tags.includes(tag)} onChange={() => handleTagChange(tag)} />
                            {formData.tags.includes(tag) && <CheckCircle size={10} className="inline mr-1" />}
                            {tag}
                        </label>
                    ))}
                </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded border-2 border-yellow-200 space-y-2">
                <p className={labelClass + " text-yellow-700 border-b border-yellow-200 pb-1"}>事前受注設定</p>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">期間</label>
                    <input className={inputClass} value={formData.preOrder.period} onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, period: e.target.value}})} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">連結</label>
                    <input className={inputClass} value={formData.preOrder.url} onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, url: e.target.value}})} />
                </div>
            </div>
            <div className="bg-blue-50 p-3 rounded border-2 border-blue-200 space-y-2">
                <p className={labelClass + " text-blue-700 border-b border-blue-200 pb-1"}>事後通販設定</p>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">期間</label>
                    <input className={inputClass} value={formData.postOrder.period} onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, period: e.target.value}})} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500">連結</label>
                    <input className={inputClass} value={formData.postOrder.url} onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, url: e.target.value}})} />
                </div>
            </div>
            <div>
                <label className={labelClass}>參與 IP (作品)</label>
                <textarea className={inputClass + " h-20"} defaultValue={formData.products.join(', ')} onChange={handleProductsChange} placeholder="請用逗號分隔..." />
            </div>
            <div>
                <label className={labelClass}>備註</label>
                <input className={inputClass} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t-2 border-slate-200 mt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded border-2 border-slate-300 font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">取消</button>
                <button type="submit" className="px-6 py-2 rounded bg-slate-900 text-yellow-400 font-black border-2 border-slate-900 hover:bg-slate-800 shadow-[4px_4px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all">儲存 (SAVE)</button>
            </div>
        </form>
    );
}

// 4. 分頁：JCS 抽選 (Lottery)
function JCSLotteryTab({ currentUser, isAdmin }) {
    const [orders, setOrders] = useState(Array.from({ length: 10 }, (_, i) => ({ id: `order_${i+1}`, index: i+1 })));
    const [editingOrder, setEditingOrder] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const dataMap = {};
            snap.docs.forEach(d => { dataMap[d.id] = d.data(); });
            
            setOrders(prev => prev.map(o => ({
                ...o,
                ...(dataMap[o.id] || { items: [] })
            })));
        });
        return () => unsub();
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
            default: return 'bg-white text-slate-900 border-slate-200';
        }
    };

    return (
        <div>
             <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] relative overflow-hidden mb-10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JUMP CHARACTERS STORE 抽選</h3>
                        <div className="space-y-1 font-bold text-white">
                             <p className="flex items-center gap-2"><Clock3 size={18} className="text-yellow-400"/> 抽選期間：12/17 11:00 ~ 12/21 16:00</p>
                             <a href="https://jumpcs.shueisha.co.jp/shop/default.aspx" target="_blank" rel="noreferrer" className="flex items-center gap-2 underline hover:text-yellow-300"><ExternalLink size={18} /> 抽選網站</a>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 transform rotate-2">
                        抽選結果(23號公布)
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => {
                    const hasItems = order.items && order.items.length > 0;
                    const totalYen = hasItems ? order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0) : 0;
                    
                    return (
                        <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6b21a8] transition-all">
                             <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                 <h4 className="font-black italic text-lg flex items-center gap-2">
                                     <Ticket className="text-purple-400" size={20}/> ORDER #{order.index}
                                 </h4>
                                 {isAdmin && (
                                     <button onClick={() => setEditingOrder(order)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-500 flex items-center gap-1">
                                         <Edit3 size={12}/> 編輯
                                     </button>
                                 )}
                             </div>

                             <div className="p-4 min-h-[150px]">
                                 {!hasItems ? (
                                     <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold gap-2 py-8">
                                         <Package size={32}/>
                                         <span>等待登記</span>
                                     </div>
                                 ) : (
                                     <div className="space-y-3">
                                         {order.items.map((item, idx) => (
                                             <div key={idx} className={`flex items-center justify-between p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                                 <div className="flex-1">
                                                     <div className="font-bold text-sm">{item.name}</div>
                                                     <div className="text-xs opacity-80">¥{item.price} x {item.qty}</div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <div className="font-mono font-black">¥{item.price * item.qty}</div>
                                                     {item.status === 'WON' && <CheckCircle className="text-green-600" size={18}/>}
                                                     {item.status === 'LOST' && <XCircle className="text-slate-400" size={18}/>}
                                                     {(!item.status || item.status === 'PENDING') && <Clock size={18} className="text-slate-400"/>}
                                                 </div>
                                             </div>
                                         ))}
                                         <div className="border-t-2 border-slate-100 mt-2 pt-2 flex justify-between items-center font-black text-slate-900">
                                             <span>TOTAL</span>
                                             <span className="text-lg">¥{totalYen.toLocaleString()}</span>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    );
                })}
            </div>

            {/* JCS Edit Modal */}
            <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`編輯訂單 #${editingOrder?.index}`}>
                {editingOrder && (
                    <JCSOrderForm 
                        initialData={editingOrder}
                        onSubmit={async (data) => {
                            try {
                                await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders", editingOrder.id), data);
                                setEditingOrder(null);
                            } catch(e) { console.error(e); alert("儲存失敗"); }
                        }}
                        onCancel={() => setEditingOrder(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

// 5. 表單：JCS Order Form
function JCSOrderForm({ initialData, onSubmit, onCancel }) {
    const [items, setItems] = useState(initialData.items || []);

    const handleAddItem = () => {
        setItems([...items, { name: '', qty: 1, price: 0, status: 'PENDING' }]);
    };

    const handleUpdateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx][field] = value;
        setItems(newItems);
    };

    const handleRemoveItem = (idx) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ items }); }} className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4 p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded border-2 border-slate-200 relative">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><X size={16}/></button>
                        <div className="space-y-2 pr-6">
                            <input 
                                className="w-full text-sm font-bold border border-slate-300 rounded p-1" 
                                placeholder="品項名稱"
                                value={item.name}
                                onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                                required
                            />
                            <div className="flex gap-2">
                                <input 
                                    type="number" className="w-20 text-sm border border-slate-300 rounded p-1" placeholder="數量"
                                    value={item.qty} onChange={e => handleUpdateItem(idx, 'qty', e.target.value)}
                                />
                                <input 
                                    type="number" className="flex-1 text-sm border border-slate-300 rounded p-1" placeholder="單價(¥)"
                                    value={item.price} onChange={e => handleUpdateItem(idx, 'price', e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 text-xs font-bold">
                                {['PENDING', 'WON', 'LOST'].map(status => (
                                    <button 
                                        type="button"
                                        key={status}
                                        onClick={() => handleUpdateItem(idx, 'status', status)}
                                        className={`flex-1 py-1 rounded border ${
                                            item.status === status 
                                            ? (status === 'WON' ? 'bg-green-500 text-white border-green-600' : status === 'LOST' ? 'bg-slate-500 text-white border-slate-600' : 'bg-yellow-400 text-black border-yellow-500')
                                            : 'bg-white text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        {status === 'WON' ? '中選' : status === 'LOST' ? '落選' : '等待'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button type="button" onClick={handleAddItem} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded border-2 border-dashed border-slate-300 hover:bg-slate-200 hover:border-slate-400 flex items-center justify-center gap-2">
                <Plus size={16}/> 新增品項
            </button>

            <div className="flex justify-end gap-2 pt-4 border-t-2 border-slate-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded border font-bold">取消</button>
                <button type="submit" className="px-6 py-2 rounded bg-slate-900 text-white font-bold">儲存變更</button>
            </div>
        </form>
    );
}