// src/components/JF26Page.jsx
import React, { useState, useEffect } from 'react';
import { 
    ExternalLink, Tag, AlertCircle, Search, Rocket, ShoppingCart, MapPin, Truck, List, 
    Crown, LogOut, Camera, Key, CheckCircle, ArrowLeft,
    Ticket, HelpCircle, Clock3, ZoomIn, ZoomOut, RotateCcw, X, Info, Settings, TruckIcon, CheckSquare,
    // 🟢 補上可能用到的圖示，避免白畫面
    Plus, Edit3, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Modal from "./Modal";
import ChangeNameForm from "./ChangeNameForm";
import ChangeAvatarForm from "./ChangeAvatarForm";
import ChangePasswordForm from "./ChangePasswordForm";
import JSPreOrderTab from './JSPreOrderTab';

const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

export default function JF26Page({ currentUser }) {
    const [currentTab, setCurrentTab] = useState('vendors');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalType, setModalType] = useState(null); 
    const [lightboxImg, setLightboxImg] = useState(null);
    const [myTotalBill, setMyTotalBill] = useState(0);

    const isAdmin = currentUser?.id === "yeye"; 
    const isMember = currentUser?.isMember;

    // 🟢 整合計算 JS + JCS 帳單
    useEffect(() => {
        if (!currentUser?.id) return;
        const myOrderName = USER_MAPPING[currentUser.id] || currentUser.name;
        const RATE_PER_KG = 250;

        let jsAmt = 0;
        let jcsAmt = 0;

        // 1. 監聽 JS 先行
        const unsubJS = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_calc_data", "main"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const orders = data.orders || [];
                const settings = data.settings || {};
                const secondPay = settings.secondPayment || { weights: {}, boxWeight: 0 };
                
                const totalBoughtQty = orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0);
                const shipPerUnitJPY = totalBoughtQty > 0 ? (settings.totalShippingJPY / totalBoughtQty) : 0;
                const boxShipTWDPerUnit = totalBoughtQty > 0 ? (parseFloat(secondPay.boxWeight || 0) * RATE_PER_KG / totalBoughtQty) : 0;

                const myOrders = orders.filter(o => o.buyer === myOrderName && o.isBought);
                jsAmt = myOrders.reduce((total, item) => {
                    let itemSum = 0;
                    // 商品本體 (若未付)
                    if (item.paymentStatus !== '已收款') {
                        const yen = (Number(item.price) * Number(item.quantity)) + (shipPerUnitJPY * item.quantity);
                        itemSum += Math.ceil(yen * (settings.exchangeRate || 0.24));
                    }
                    // 二補運費 (若未付)
                    if (item.shippingPaymentStatus !== '已收款') {
                        const weight = parseFloat(secondPay.weights[item.name] || 0);
                        itemSum += Math.ceil((weight * RATE_PER_KG * item.quantity) + (boxShipTWDPerUnit * item.quantity));
                    }
                    return total + itemSum;
                }, 0);
            }
            setMyTotalBill(jsAmt + jcsAmt);
        });

        // 2. 監聽 JCS 抽選
        const unsubJCSOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), async (snap) => {
            const settingsSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"));
            const jcsDomesticShipping = settingsSnap.exists() ? (settingsSnap.data().totalDomesticShipping || 0) : 0;
            
            const allJcsOrders = snap.docs.map(d => d.data());
            
            // 計算全站中選總數
            let totalWonQty = 0;
            allJcsOrders.forEach(o => o.items?.forEach(i => { if(i.status === 'WON') totalWonQty += Number(i.qty); }));
            
            // 計算單件運費分攤
            const jcsShipPerUnit = totalWonQty > 0 ? (jcsDomesticShipping / totalWonQty) : 0;

            // 計算我的金額
            let myJcsYen = 0;
            allJcsOrders.forEach(o => o.items?.forEach(i => {
                if (i.status === 'WON' && i.assignedTo === myOrderName) {
                    const qty = Number(i.qty);
                    myJcsYen += (Number(i.price) * qty) + (jcsShipPerUnit * qty);
                }
            }));
            jcsAmt = Math.ceil(myJcsYen * 0.24); // JCS 匯率固定 0.24
            setMyTotalBill(jsAmt + jcsAmt);
        });

        return () => { unsubJS(); unsubJCSOrders(); };
    }, [currentUser]);

    const handleLogout = () => { localStorage.removeItem('app_user_id'); window.location.reload(); };
    const handleChangeName = async (n) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { name: n }); setModalType(null); };
    const handleChangeAvatar = async (u) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { avatar: u }); setModalType(null); };
    const handleChangePassword = async (p) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { password: p }); setModalType(null); };

    const handleToggleMembership = async () => {
        if (!currentUser) return;
        if (currentUser.isMember) {
            if (currentUser.memberValidUntil) {
                if (confirm("要恢復自動續訂嗎？")) await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { memberValidUntil: null, memberCancelledAt: null });
            } else {
                if (confirm("確定要取消訂閱嗎？")) {
                    const next30Days = new Date(); next30Days.setDate(next30Days.getDate() + 30); 
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberValidUntil: next30Days.toISOString(), memberCancelledAt: new Date().toISOString() });
                }
            }
        } else {
            if (confirm("確定要訂閱 PLUS ULTRA 會員嗎？")) await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberSince: new Date().toISOString(), memberValidUntil: null, memberCancelledAt: null });
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
                        <h1 className="text-2xl font-black italic tracking-tight text-white">JF26 作戰中心</h1>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        {currentUser && <BillWidget amount={myTotalBill} />}
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400">HERO NAME</p>
                            <p className="font-bold text-white tracking-wide">{currentUser?.name}</p>
                        </div>
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${isMember ? 'border-purple-500' : 'border-yellow-400'} shadow-lg overflow-hidden hover:scale-105 transition-all relative`}>
                                <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" className="w-full h-full object-cover" />
                                {isMember && <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-white"><Crown size={8} className="text-white fill-white" /></div>}
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-slate-900 py-1 z-50 animate-in fade-in slide-in-from-top-2 text-slate-700">
                                    <div className="px-3 py-2 border-b-2 border-slate-100 bg-slate-50">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black flex items-center gap-1"><Crown size={12} className={isMember ? "text-purple-600 fill-purple-600" : "text-slate-300"} /> PLUS 會員</span>
                                            {isMember && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold">SUBSCRIBED</span>}
                                        </div>
                                        <button onClick={handleToggleMembership} className={`w-full text-xs font-bold py-1.5 rounded border-2 transition-all ${isMember && currentUser.memberValidUntil ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : isMember ? 'bg-white border-slate-300 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300' : 'bg-purple-600 border-purple-800 text-white hover:bg-purple-700'}`}>
                                            {isMember ? (currentUser.memberValidUntil ? "恢復續訂" : "取消訂閱") : "訂閱會員"}
                                        </button>
                                    </div>
                                    <button onClick={() => { setMenuOpen(false); setModalType('changeName'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 font-bold"><Tag size={16} /> 修改暱稱</button>
                                    <button onClick={() => { setMenuOpen(false); setModalType('changeAvatar'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 font-bold"><Camera size={16} /> 更換頭像</button>
                                    <button onClick={() => { setMenuOpen(false); setModalType('changePwd'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 font-bold"><Key size={16} /> 修改密碼</button>
                                    {isAdmin && (
                                        <div className="border-t border-slate-100 mt-1">
                                            <Link to="/admin/dashboard" className="block px-4 py-2 text-sm text-blue-700 font-black hover:bg-blue-50 flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                                                <Settings size={16} /> 團務後台管理
                                            </Link>
                                        </div>
                                    )}
                                    <div className="border-t-2 border-slate-100 my-1"></div>
                                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 font-black"><LogOut size={16} /> 登出</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* 標題區 (還原樣式) */}
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

                <nav className="max-w-md mx-auto mb-8 px-4">
                    <div className="bg-white p-1 rounded-lg shadow-sm border-2 border-slate-200 flex justify-around gap-1">
                        {[
                            { id: 'vendors', label: '攤商情報', icon: Rocket },
                            { id: 'js_pre', label: 'JS 先行', icon: ShoppingCart },
                            { id: 'jcs_lottery', label: 'JCS 抽選', icon: Ticket }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = currentTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 sm:px-4 rounded font-black transition-all border-2 ${isActive ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-md transform -translate-y-1' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100'}`}>
                                    <Icon size={20} className={isActive ? "animate-pulse" : ""} />
                                    <span className="text-[11px] sm:text-sm whitespace-nowrap">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {currentTab === 'vendors' && <VendorsTab currentUser={currentUser} />}
                    {currentTab === 'js_pre' && <JSPreOrderTab currentUser={currentUser} isAdmin={isAdmin} onImageClick={setLightboxImg} />}
                    {currentTab === 'jcs_lottery' && <JCSLotteryTab />}
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
                                <div className="absolute top-4 right-4 z-[110] flex items-center gap-2 bg-slate-900/80 p-2 rounded-full border border-slate-700 shadow-xl">
                                    <button onClick={() => zoomIn()} className="p-2 text-white hover:text-yellow-400"><ZoomIn size={20} /></button>
                                    <button onClick={() => zoomOut()} className="p-2 text-white hover:text-yellow-400"><ZoomOut size={20} /></button>
                                    <button onClick={() => resetTransform()} className="p-2 text-white hover:text-yellow-400"><RotateCcw size={20} /></button>
                                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                                    <button onClick={() => setLightboxImg(null)} className="p-2 text-white hover:text-red-400"><X size={20} /></button>
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

function BillWidget({ amount }) {
    return (
        <div className="relative group border-r border-slate-700 mr-1 pr-2 sm:mr-2 sm:pr-4 flex w-full items-center justify-end gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-0">
            <button className="focus:outline-none group/btn flex items-center gap-2 sm:mb-1 sm:gap-1.5" onClick={() => alert("含 JS 本體、二補、JCS 分配")}>
                <span className="text-[16px] sm:text-base text-slate-400 font-bold whitespace-nowrap pt-0.5">個人英雄帳單</span>
                <HelpCircle className="text-yellow-500" size={14} />
            </button>
            <div className="text-yellow-400 font-black drop-shadow-sm text-right flex items-center">
                <span className="text-xs mr-1 text-yellow-200 mt-1">NT$</span>
                <span className="text-xl font-mono">{amount.toLocaleString()}</span>
            </div>
        </div>
    );
}

// 🟢 JCS 用戶端視圖 (純展示)
function JCSLotteryTab() {
    const [orders, setOrders] = useState([]);
    const [jcsSettings, setJcsSettings] = useState({ totalDomesticShipping: 0, exchangeRate: 0.24 });

    useEffect(() => {
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const dataMap = {};
            snap.docs.forEach(d => { dataMap[d.id] = d.data(); });
            // 為了前台顯示，填滿空位
            const displayOrders = Array.from({ length: 10 }, (_, i) => {
                const id = `order_${i+1}`;
                return { id, index: i+1, ...(dataMap[id] || { items: [] }) };
            });
            setOrders(displayOrders);
        });
        
        const unsubSettings = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"), (snap) => {
            if (snap.exists()) setJcsSettings(snap.data());
        });

        return () => { unsubOrders(); unsubSettings(); };
    }, []);

    const getStatusColor = (status) => {
        if (status === 'WON') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'LOST') return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70';
        return 'bg-white text-slate-900 border-slate-200';
    };

    return (
        <div>
            <div className="bg-slate-900 text-yellow-400 p-6 rounded-xl border-4 border-yellow-400 shadow-[8px_8px_0px_0px_#0f172a] mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-3xl font-black italic mb-2">JCS 抽選登記狀況</h3>
                        <div className="flex gap-4 text-sm font-bold text-white/80">
                            <span className="flex items-center gap-1"><Info size={14}/> 匯率:{jcsSettings.exchangeRate || 0.24}</span>
                            <span className="flex items-center gap-1"><TruckIcon size={14}/> 日本境內總運費: ¥{Number(jcsSettings.totalDomesticShipping).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 rotate-2 text-xs sm:text-sm">
                        抽選結果將於 12/23 公布
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8]">
                        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                            <h4 className="font-black italic text-lg flex items-center gap-2"><Ticket size={20} className="text-purple-400"/> ORDER #{order.index}</h4>
                        </div>
                        <div className="p-4 min-h-[120px]">
                            {(!order.items || order.items.length === 0) ? (
                                <div className="text-slate-300 font-bold text-center py-6">等待登記數據...</div>
                            ) : (
                                <div className="space-y-3 text-slate-700">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className={`p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-sm">{item.name}</div>
                                                    <div className="text-[10px] opacity-75">¥{item.price} x {item.qty}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black">¥{item.price * item.qty}</div>
                                                    {item.assignedTo ? (
                                                        <div className="text-[10px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 mt-1">
                                                            歸屬: {item.assignedTo}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                                                            未分配
                                                        </div>
                                                    )}
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
    );
}

// 🟢 VendorsTab (還原樣式 + 移除 Admin 按鈕)
function VendorsTab({ currentUser }) {
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingIpsVendor, setViewingIpsVendor] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVendors(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        });
        return () => unsub();
    }, []);

    const checkIsNew = (item) => {
        try {
            const timeKey = item.updatedAt || item.createdAt;
            if (!timeKey) return false;
            const itemKey = `vendor_${item.id}`;
            const lastRead = currentUser?.readHistory?.[itemKey] || localStorage.getItem(`read_${currentUser?.id}_${itemKey}`);
            return !lastRead || new Date(timeKey) > new Date(lastRead);
        } catch { return false; }
    };

    const markAsRead = async (item) => {
        if (!currentUser?.id) return;
        const now = new Date().toISOString();
        const itemKey = `vendor_${item.id}`;
        localStorage.setItem(`read_${currentUser.id}_${itemKey}`, now);
        await setDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { readHistory: { [itemKey]: now } }, { merge: true });
    };

    const filteredVendors = vendors.filter(v => (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (Array.isArray(v.products) ? v.products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) : false));

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
            <div className="mb-10 w-full h-12 rounded-xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] flex items-center overflow-hidden">
                <div className="pl-4 pr-2 text-slate-900"><Search size={24} strokeWidth={3} /></div>
                <input type="text" placeholder="搜尋攤商名稱 或 IP..." className="w-full h-full border-none outline-none font-bold text-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                    <div key={vendor.id} onClick={() => markAsRead(vendor)} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[8px_8px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#FACC15] transition-all relative cursor-pointer group">
                        {checkIsNew(vendor) && <div className="absolute -top-3 -left-3 bg-red-600 text-white text-xs font-black px-2 py-1 shadow-md transform -rotate-12 z-20 border-2 border-white animate-bounce">NEW!</div>}
                        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-900 z-10"></div>
                        
                        <div className="flex justify-between items-start mb-4 pr-4 border-b-2 border-slate-100 pb-2">
                            <h3 className="font-black text-2xl text-slate-900 leading-tight italic">{vendor.name}</h3>
                        </div>

                        {vendor.tags && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {vendor.tags.map(tag => <span key={tag} className={`text-[11px] font-black px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${getTagStyle(tag)}`}>{tag}</span>)}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1 uppercase tracking-wider"><Tag size={12}/> 參與作品 (IPs)</p>
                                <div className="flex flex-wrap gap-2">
                                    {(vendor.products || []).slice(0, 10).map((ip, i) => <span key={i} className="bg-yellow-50 text-slate-900 text-xs font-bold px-2 py-1 border-2 border-slate-200 transition-transform hover:scale-105 hover:border-slate-900 hover:bg-yellow-200">{ip}</span>)}
                                    {(vendor.products || []).length > 10 && <button onClick={(e) => {e.stopPropagation(); setViewingIpsVendor(vendor)}} className="bg-slate-800 text-white text-xs font-bold px-2 py-1 border-2 border-slate-900 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"><List size={12}/> MORE...</button>}
                                </div>
                            </div>
                            <div className="space-y-2 bg-slate-50 p-3 rounded border-2 border-slate-200 relative">
                                {vendor.preOrder?.period && <div className="text-sm"><span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-1 border border-slate-900 mr-2">事前</span><span className="font-bold text-slate-700">{vendor.preOrder.period}</span></div>}
                                {vendor.postOrder?.period && <div className="text-sm"><span className="text-[10px] font-black bg-blue-500 text-white px-1 border border-slate-900 mr-2">事後</span><span className="font-bold text-slate-700">{vendor.postOrder.period}</span></div>}
                                {vendor.tags?.includes("場販限定") && <div className="text-sm flex items-center gap-2 text-red-600 font-black"><MapPin size={14} /> 僅限 JUMP FESTA 現場</div>}
                            </div>
                            {vendor.notes && <div className="flex items-start gap-2 bg-red-50 p-2 rounded border-2 border-red-100"><AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" /><p className="text-xs font-bold text-red-600 leading-relaxed">{vendor.notes}</p></div>}
                        </div>

                        <div className="mt-6 space-y-3 pt-4 border-t-2 border-slate-100">
                            <div className="flex gap-2">
                                {vendor.preOrder?.url && <a href={vendor.preOrder.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="flex-1 py-2 bg-yellow-400 text-slate-900 text-center font-black rounded border-2 border-slate-900 hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none"><ShoppingCart size={14} strokeWidth={3} /> 事前受注</a>}
                                {vendor.postOrder?.url && <a href={vendor.postOrder.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="flex-1 py-2 bg-blue-500 text-white text-center font-black rounded border-2 border-slate-900 hover:bg-blue-400 transition-colors flex items-center justify-center gap-1 text-xs shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none"><Truck size={14} strokeWidth={3} /> 事後通販</a>}
                            </div>
                            {vendor.mainUrl && <a href={vendor.mainUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="block w-full py-2 bg-slate-100 text-slate-700 text-center font-black rounded border-2 border-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"><ExternalLink size={16} /> 攤商/活動官網</a>}
                        </div>
                    </div>
                ))}
            </div>
            {viewingIpsVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingIpsVendor(null)}>
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border-4 border-slate-900 overflow-hidden" onClick={e=>e.stopPropagation()}>
                        <div className="bg-slate-900 px-4 py-3 border-b-4 border-yellow-400 flex justify-between items-center"><h3 className="font-black text-lg text-white flex items-center gap-2 truncate italic"><Tag size={20} className="text-yellow-400"/> {viewingIpsVendor.name}</h3><button onClick={()=>setViewingIpsVendor(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24}/></button></div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50">
                            <div className="flex flex-wrap gap-2">
                                {(viewingIpsVendor.products||[]).map((ip,i)=><span key={i} className="bg-white text-slate-900 text-sm font-bold px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#ccc]">{ip}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}