// src/components/UserMenu.jsx
import { Link } from 'react-router-dom';
import { useState } from "react";
import { 
    Crown, LogOut, Camera, Key, Tag, 
    Clock, Calendar, Settings, ChevronRight 
} from 'lucide-react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function UserMenu({ currentUser, onLogout, onOpenModal }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isMember = currentUser?.isMember;

    const handleToggleMembership = async () => {
        if (!currentUser) return;
        if (currentUser.isMember) {
            if (currentUser.memberValidUntil) {
                if (window.confirm("要恢復自動續訂嗎？\n您的會員資格將繼續保持。")) {
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { memberValidUntil: null, memberCancelledAt: null });
                    alert("已恢復續訂！");
                }
            } else {
                if (window.confirm("確定要取消訂閱嗎？\n會員資格將保留 30 天，之後自動失效。")) {
                    const next30Days = new Date();
                    next30Days.setDate(next30Days.getDate() + 30); 
                    await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberValidUntil: next30Days.toISOString(), memberCancelledAt: new Date().toISOString() });
                    alert(`已取消續訂。\n您的會員資格將保留至 ${next30Days.toLocaleDateString()}。`);
                }
            }
        } else {
            if (window.confirm("確定要訂閱 PLUS ULTRA 會員嗎？\n將共同分擔日本門號維持費。")) {
                await updateDoc(doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'users', currentUser.id), { isMember: true, memberSince: new Date().toISOString(), memberValidUntil: null, memberCancelledAt: null });
                alert("歡迎加入英雄會員！");
            }
        }
    };

    return (
        <div className="relative z-50">
            <button 
                onClick={() => setMenuOpen(!menuOpen)} 
                className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${isMember ? 'border-purple-500' : 'border-yellow-400'} shadow-lg overflow-hidden hover:scale-105 transition-all relative`}
            >
                <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" className="w-full h-full object-cover" />
                {isMember && (
                    <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-white">
                        <Crown size={8} className="text-white fill-white" />
                    </div>
                )}
            </button>
            
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl border-2 border-slate-900 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 border-b-2 border-slate-100 bg-slate-50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-slate-500 flex items-center gap-1">
                                    <Crown size={12} className={isMember ? "text-purple-600 fill-purple-600" : "text-slate-300"} />
                                    PLUS 會員
                                </span>
                                {isMember && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold">SUBSCRIBED</span>}
                            </div>
                            <button onClick={handleToggleMembership} className={`w-full text-xs font-bold py-1.5 rounded border-2 transition-all ${isMember && currentUser.memberValidUntil ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : isMember ? 'bg-white border-slate-300 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300' : 'bg-purple-600 border-purple-800 text-white hover:bg-purple-700'}`}>
                                {isMember ? (currentUser.memberValidUntil ? "恢復續訂" : "取消訂閱") : "訂閱會員 (NT$90/月)"}
                            </button>
                        </div>
                        <button onClick={() => { setMenuOpen(false); onOpenModal('changeName'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Tag size={16} /> 修改暱稱</button>
                        <button onClick={() => { setMenuOpen(false); onOpenModal('changeAvatar'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Camera size={16} /> 更換頭像</button>
                        <button onClick={() => { setMenuOpen(false); onOpenModal('changePwd'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 text-slate-700 font-bold"><Key size={16} /> 修改密碼</button>
                        
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
                        <button onClick={onLogout} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 font-black"><LogOut size={16} /> 登出</button>
                    </div>
                </>
            )}
        </div>
    );
}