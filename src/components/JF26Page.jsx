// src/components/JF26Page.jsx
import React, { useState } from 'react';
import { 
    ExternalLink, Rocket, ShoppingCart, Ticket, 
    Crown, LogOut, Camera, Key, Tag, ArrowLeft,
    ZoomIn, ZoomOut, RotateCcw, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// 引入拆分出去的 Component
// 假設它們都在同一個 components 資料夾下
import VendorsTab from "./VendorsTab";
import JSPreOrderTab from "./JSPreOrderTab";
import JCSLotteryTab from "./JCSOrderForm";

import Modal from "./Modal";
import ChangeNameForm from "./ChangeNameForm";
import ChangeAvatarForm from "./ChangeAvatarForm";
import ChangePasswordForm from "./ChangePasswordForm";

const ADMIN_USER = "葉葉";

export default function JF26Page({ currentUser }) {
    const [currentTab, setCurrentTab] = useState('vendors');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalType, setModalType] = useState(null); 
    const [lightboxImg, setLightboxImg] = useState(null);

    const isAdmin = currentUser?.name === ADMIN_USER;
    const isMember = currentUser?.isMember;

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
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/home" className="flex items-center gap-2 bg-yellow-400 px-4 py-1.5 rounded transform -skew-x-12 border-2 border-yellow-600 hover:scale-105 transition-transform group">
                            <ArrowLeft size={20} className="text-slate-900 transform skew-x-12 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                            <span className="text-slate-900 font-black text-sm transform skew-x-12 hidden sm:inline">返回首頁</span>
                        </Link>
                        <h1 className="text-2xl font-black italic tracking-tight text-white hidden md:block">
                            JF26 作戰中心
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-4">
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
                                    <div className="border-t-2 border-slate-100 my-1"></div>
                                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 font-black"><LogOut size={16} /> 登出</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

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
                <div className="flex justify-center mb-8">
                    <div className="bg-slate-200 p-1.5 rounded-xl flex gap-2 border-2 border-slate-300">
                        <TabButton id="vendors" label="攤商情報" icon={Rocket} active={currentTab === 'vendors'} onClick={setCurrentTab} />
                        <TabButton id="js_pre" label="JS 先行 (Online)" icon={ShoppingCart} active={currentTab === 'js_pre'} onClick={setCurrentTab} />
                        <TabButton id="jcs_lottery" label="JCS 抽選" icon={Ticket} active={currentTab === 'jcs_lottery'} onClick={setCurrentTab} />
                    </div>
                </div>

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

            {/* Modals (全域設定：修改名稱/密碼/頭像) */}
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

function TabButton({ id, label, icon: Icon, active, onClick }) {
    return (
        <button 
            onClick={() => onClick(id)}
            className={`
                px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all duration-200
                ${active 
                    ? 'bg-slate-900 text-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }
            `}
        >
            <Icon size={16} strokeWidth={3} /> {label}
        </button>
    );
}