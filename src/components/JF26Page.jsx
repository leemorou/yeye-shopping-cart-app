// src/components/JF26Page.jsx
import React, { useState, useEffect } from 'react';
import { 
    ExternalLink, Tag, AlertCircle, Search, Rocket, ShoppingCart, MapPin, Truck, List, 
    Crown, LogOut, Camera, Key, CheckCircle, ArrowLeft,
    Ticket, HelpCircle, Clock3, ZoomIn, ZoomOut, RotateCcw, X, Info, Settings, TruckIcon,
    Plus, Edit3, Trash2, ShoppingBag, XCircle, Clock
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
import JSPostOrderTab from './JSPostOrderTab';

const USER_MAPPING = {
    "titi": "踢", "xiaomei": "玫", "heng": "姮", "baobao": "寶",
    "yeye": "葉", "Sjie": "S姐", "qiaoyu": "魚", "teacher": "澄",
    "ann": "安", "Aurora": "Aurora"
};

const RATE_PER_KG = 250;

export default function JF26Page({ currentUser }) {
    const [currentTab, setCurrentTab] = useState('vendors');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalType, setModalType] = useState(null); 
    const [lightboxImg, setLightboxImg] = useState(null);

    const [billJS, setBillJS] = useState(0);     
    const [billJCS, setBillJCS] = useState(0);   
    const [billPost, setBillPost] = useState(0); 
    const myTotalBill = billJS + billJCS + billPost;

    const isAdmin = currentUser?.id === "yeye"; 
    const isMember = currentUser?.isMember;

    // 🟢 整合計算 JS + JCS 帳單
    useEffect(() => {
        if (!currentUser?.id) return;
        const myOrderName = USER_MAPPING[currentUser.id] || currentUser.name;

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
                const amt = myOrders.reduce((total, item) => {
                    let itemSum = 0;
                    if (item.paymentStatus !== '已收款') {
                        const yen = (Number(item.price) * Number(item.quantity)) + (shipPerUnitJPY * item.quantity);
                        itemSum += Math.ceil(yen * (settings.exchangeRate || 0.24));
                    }
                    if (item.shippingPaymentStatus !== '已收款') {
                        const weight = parseFloat(secondPay.weights[item.name] || 0);
                        itemSum += Math.ceil((weight * RATE_PER_KG * item.quantity) + (boxShipTWDPerUnit * item.quantity));
                    }
                    return total + itemSum;
                }, 0);
                setBillJS(amt);
            }
        });

        // 2. 監聽 JCS 抽選
        const unsubJCS = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), async (snap) => {
            const settingsSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_settings", "main"));
            const s = settingsSnap.exists() ? settingsSnap.data() : { totalDomesticShipping: 0, exchangeRate: 0.24 };
            const allJcsOrders = snap.docs.map(d => d.data());
            let totalWonQty = 0;
            allJcsOrders.forEach(o => o.items?.forEach(i => { if(i.status === 'WON') totalWonQty += Number(i.qty); }));
            const jcsShipPerUnit = totalWonQty > 0 ? (s.totalDomesticShipping / totalWonQty) : 0;
            let myJcsYen = 0;
            allJcsOrders.forEach(o => o.items?.forEach(i => {
                const myAs = i.assignments?.find(a => a.user === myOrderName);
                if (i.status === 'WON' && myAs) {
                    const qty = Number(myAs.qty);
                    myJcsYen += (Number(i.price) * qty) + (jcsShipPerUnit * qty);
                }
            }));
            setBillJCS(Math.ceil(myJcsYen * (s.exchangeRate || 0.24)));
        });

        // 3. 監聽 JS 事後受注
        const unsubPost = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_post_calc_data", "main"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const orders = data.orders || [];
                const settings = data.settings || {};
                const secondPay = settings.secondPayment || { weights: {}, boxWeight: 0 };
                const totalBoughtQty = orders.reduce((sum, item) => item.isBought ? sum + item.quantity : sum, 0);
                const shipPerUnitJPY = totalBoughtQty > 0 ? (settings.totalShippingJPY / totalBoughtQty) : 0;
                const boxShipTWDPerUnit = totalBoughtQty > 0 ? (parseFloat(secondPay.boxWeight || 0) * RATE_PER_KG / totalBoughtQty) : 0;
                const myOrders = orders.filter(o => o.buyer === myOrderName && o.isBought);
                const amt = myOrders.reduce((total, item) => {
                    let itemSum = 0;
                    if (item.paymentStatus !== '已收款') {
                        const yen = (Number(item.price) * Number(item.quantity)) + (shipPerUnitJPY * item.quantity);
                        itemSum += Math.ceil(yen * (settings.exchangeRate || 0.207));
                    }
                    if (item.shippingPaymentStatus !== '已收款') {
                        const weight = parseFloat(secondPay.weights[item.name] || 0);
                        itemSum += Math.ceil((weight * RATE_PER_KG * item.quantity) + (boxShipTWDPerUnit * item.quantity));
                    }
                    return total + itemSum;
                }, 0);
                setBillPost(amt);
            }
        });

        return () => { unsubJS(); unsubJCS(); unsubPost(); };
    }, [currentUser]);

    const handleLogout = () => { localStorage.removeItem('app_user_id'); window.location.reload(); };
    const handleChangeName = async (n) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { name: n }); setModalType(null); };
    const handleChangeAvatar = async (u) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { avatar: u }); setModalType(null); };
    const handleChangePassword = async (p) => { await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { password: p }); setModalType(null); };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-yellow-400 selection:text-black">
            <header className="sticky top-0 z-30 bg-slate-900 border-b-4 border-yellow-400 px-4 py-3 shadow-md">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link to="/home" className="flex items-center gap-2 bg-yellow-400 px-4 py-1.5 rounded transform -skew-x-12 border-2 border-yellow-600 hover:scale-105 transition-transform group">
                            <ArrowLeft size={20} className="text-slate-900 transform skew-x-12 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                        </Link>
                        <h1 className="text-2xl font-black italic tracking-tight text-white">JF26 作戰中心</h1>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        {currentUser && <BillWidget amount={myTotalBill} />}
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${isMember ? 'border-purple-500' : 'border-yellow-400'} shadow-lg overflow-hidden`}>
                                <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" className="w-full h-full object-cover" />
                                {isMember && <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-white"><Crown size={8} className="text-white fill-white" /></div>}
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-slate-900 py-1 z-50 animate-in fade-in slide-in-from-top-2 text-slate-700">
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

                    <div className="flex justify-start sm:justify-center gap-3 text-xs sm:text-sm font-black mt-6 overflow-x-auto pb-4 no-scrollbar px-2">
                        <a href="https://www.jumpfesta.com/maker/" target="_blank" rel="noreferrer" className="shrink-0 px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 transition-all rounded flex items-center gap-1 whitespace-nowrap flex-nowrap">
                            JF26 攤商資訊 <ExternalLink size={14} className="shrink-0" />
                        </a>
                        <a href="https://jumpcs.shueisha.co.jp/shop/pages/jumpfesta.aspx" target="_blank" rel="noreferrer" className="shrink-0 px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 transition-all rounded flex items-center gap-1 whitespace-nowrap flex-nowrap">
                            JCS特設頁 <ExternalLink size={14} className="shrink-0" />
                        </a>
                        <a href="https://docs.google.com/spreadsheets/d/1zfT-MMN-DwIRamibiAQUyp4lJLGBoxS3Rpeb1aVJLK8/edit?usp=sharing" target="_blank" rel="noreferrer" className="shrink-0 px-4 py-1.5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 transition-all rounded flex items-center gap-1 whitespace-nowrap flex-nowrap">
                            JF26 資訊表 <ExternalLink size={14} className="shrink-0" />
                        </a>
                        <a href="https://forms.gle/VsHvAvraVQp4dHaK8" target="_blank" rel="noreferrer" className="shrink-0 px-4 py-1.5 bg-yellow-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-0.5 transition-all rounded text-slate-900 flex items-center gap-1 whitespace-nowrap flex-nowrap">
                            JF26 抽選登記 <ExternalLink size={14} className="shrink-0" />
                        </a>
                    </div>
                </div>

                <nav className="max-w-xl mx-auto mb-8 px-4">
                    <div className="bg-white p-1 rounded-lg shadow-sm border-2 border-slate-200 flex justify-around gap-1">
                        {[
                            { id: 'vendors', label: '攤商情報', icon: Rocket },
                            { id: 'js_pre', label: 'JS 先行', icon: ShoppingCart },
                            { id: 'js_post', label: 'JS 事後', icon: ShoppingBag },
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
                    {currentTab === 'js_post' && <JSPostOrderTab currentUser={currentUser} isAdmin={isAdmin} onImageClick={setLightboxImg} />}
                    {currentTab === 'jcs_lottery' && <JCSLotteryTab currentUser={currentUser} isAdmin={isAdmin} />}
                </div>
            </div>

            {lightboxImg && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 animate-in fade-in duration-200">
                    <TransformWrapper initialScale={1} centerOnInit={true}>
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
                                    <img src={lightboxImg} alt="Preview" className="max-w-full max-h-full object-contain"/>
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

// 🟢 JCS 用戶端視圖 (修正：數字排序 + 移除編輯功能)
function JCSLotteryTab({ currentUser, isAdmin }) {
    const [orders, setOrders] = useState([]);
    const [jcsSettings, setJcsSettings] = useState({ totalDomesticShipping: 0, exchangeRate: 0.24 });
    const myNickName = USER_MAPPING[currentUser?.id] || currentUser?.name || "";

    useEffect(() => {
        const unsubOrders = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_jcs_orders"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // 【修正：數字排序】 解析 order_x 裡面的數字進行排序
            const sortedList = list.sort((a, b) => {
                const numA = parseInt(a.id.replace('order_', '')) || 0;
                const numB = parseInt(b.id.replace('order_', '')) || 0;
                return numA - numB;
            });

            // 確保顯示 10 個框，若資料庫不足則填補
            const displayOrders = Array.from({ length: 10 }, (_, i) => {
                const targetId = `order_${i+1}`;
                const found = sortedList.find(o => o.id === targetId);
                return found || { id: targetId, items: [] };
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
                        <h3 className="text-3xl font-black italic mb-2">JCS 抽選分配狀況</h3>
                        <div className="flex gap-4 text-sm font-bold text-white/80">
                            <span className="flex items-center gap-1"><Info size={14}/> 匯率:{jcsSettings.exchangeRate || 0.24}</span>
                            <span className="flex items-center gap-1"><TruckIcon size={14}/> 日本運費(總): ¥{Number(jcsSettings.totalDomesticShipping).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded font-black border-2 border-yellow-600 rotate-2 text-xs sm:text-sm">
                        抽選結果已公布
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => {
                    const displayItems = isAdmin 
                        ? (order.items || [])
                        : (order.items || []).filter(item => item.assignments?.some(a => a.user === myNickName));

                    if (!isAdmin && displayItems.length === 0) return null;

                    const orderTotalYen = displayItems.reduce((sum, i) => {
                        const myAs = i.assignments?.find(a => a.user === myNickName);
                        const qty = isAdmin ? i.qty : (myAs?.qty || 0);
                        return sum + (Number(i.price) * qty);
                    }, 0);

                    return (
                        <div key={order.id} className="bg-white rounded-xl border-4 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#6b21a8]">
                            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                                <h4 className="font-black italic text-lg flex items-center gap-2">
                                    <Ticket size={20} className="text-purple-400"/> 
                                    ORDER #{order.id.replace('order_', '')}
                                </h4>
                                <div className="text-xs font-mono text-yellow-400 font-bold">¥{orderTotalYen.toLocaleString()}</div>
                            </div>
                            <div className="p-4 min-h-[120px]">
                                <div className="space-y-3 text-slate-700">
                                    {displayItems.map((item, idx) => {
                                        const myAs = item.assignments?.find(a => a.user === myNickName);
                                        const displayQty = isAdmin ? item.qty : (myAs?.qty || 0);
                                        return (
                                            <div key={idx} className={`p-2 rounded border-2 ${getStatusColor(item.status)}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-sm">{item.name}</div>
                                                        <div className="text-[10px] opacity-75">
                                                            ¥{item.price} x {displayQty}
                                                            {isAdmin && item.assignments?.length > 0 && (
                                                                <span className="ml-1 text-purple-600 font-black">
                                                                    ({item.assignments.map(a => `${a.user}${a.qty}`).join(',')})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-black">¥{item.price * displayQty}</div>
                                                        {item.status === 'WON' ? <CheckCircle size={16} className="text-green-600 inline ml-1"/> : item.status === 'LOST' ? <XCircle size={16} className="text-slate-400 inline ml-1"/> : <Clock size={16} className="text-slate-400 inline ml-1"/>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-2 border-t border-dashed border-slate-200 text-right">
                                        <span className="text-[10px] font-black text-slate-400 mr-2 uppercase">Subtotal</span>
                                        <span className="font-black text-slate-900 font-mono italic">
                                            ≈ NT$ {Math.ceil(orderTotalYen * jcsSettings.exchangeRate).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

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

    const markAsRead = async (item) => {
        if (!currentUser?.id) return;
        const now = new Date().toISOString();
        const itemKey = `vendor_${item.id}`;
        localStorage.setItem(`read_${currentUser.id}_${itemKey}`, now);
        await setDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { readHistory: { [itemKey]: now } }, { merge: true });
    };

    const filteredVendors = vendors.filter(v => (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (Array.isArray(v.products) ? v.products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) : false));

    return (
        <div>
            <div className="mb-10 w-full h-12 rounded-xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] flex items-center overflow-hidden">
                <div className="pl-4 pr-2 text-slate-900"><Search size={24} strokeWidth={3} /></div>
                <input type="text" placeholder="搜尋攤商名稱 或 IP..." className="w-full h-full border-none outline-none font-bold text-lg px-2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                    <div key={vendor.id} onClick={() => markAsRead(vendor)} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[8px_8px_0px_0px_#FACC15] hover:-translate-y-1 transition-all relative cursor-pointer group">
                        <h3 className="font-black text-2xl text-slate-900 leading-tight italic border-b-2 pb-2 mb-4">{vendor.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-4 h-20 overflow-hidden">
                            {(vendor.products || []).map((ip, i) => <span key={i} className="bg-yellow-50 text-slate-900 text-[10px] font-bold px-2 py-1 border-2 border-slate-200">{ip}</span>)}
                        </div>
                        <div className="flex gap-2">
                            {vendor.preOrder?.url && <a href={vendor.preOrder.url} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-yellow-400 text-slate-900 text-center font-black rounded border-2 border-slate-900 text-xs">事前受注</a>}
                            {vendor.postOrder?.url && <a href={vendor.postOrder.url} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-blue-500 text-white text-center font-black rounded border-2 border-slate-900 text-xs">事後通販</a>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}