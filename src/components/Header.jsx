// src/components/Header.jsx
import { ShoppingBag } from 'lucide-react';
import UserMenu from './UserMenu';

// title: 左上角的標題文字
// user: 當前使用者資料
// children: 中間可以插入的自定義內容 (例如 BillWidget)
// onLogout, onOpenModal: 傳遞給 UserMenu 的功能
export default function Header({ title = "我的英友盡有學院", user, children, onLogout, onOpenModal }) {
    return (
        <header className="sticky top-0 z-30 bg-slate-900 border-b-4 border-yellow-400 px-4 py-3 shadow-md">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                {/* 左側 LOGO */}
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-400 p-2 rounded transform -skew-x-12 border-2 border-white">
                        <ShoppingBag size={24} className="text-slate-900 transform skew-x-12" />
                    </div>
                    <h1 className="text-2xl font-black italic tracking-tight text-white hidden sm:block">{title}</h1>
                </div>

                {/* 右側功能區 */}
                <div className="flex items-center gap-2 sm:gap-4">
                    
                    {/* 這裡插入中間的內容 (例如帳單) */}
                    {children}

                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">HERO NAME</p>
                        <p className="font-bold text-white tracking-wide">{user?.name}</p>
                    </div>
                    
                    {/* 右側選單 */}
                    <UserMenu 
                        currentUser={user} 
                        onLogout={onLogout} 
                        onOpenModal={onOpenModal} 
                    />
                </div>
            </div>
        </header>
    );
}