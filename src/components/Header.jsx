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
            {/* 加入 flex-wrap 允許換行，gap-y-3 控制上下行間距 */}
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-y-3">
                
                {/* 1. 左側 LOGO & 標題 */}
                {/* Mobile: w-full (佔滿整行) + justify-center (置中) */}
                {/* Desktop (md): w-auto (自動寬度) + justify-start (靠左) */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                    <div className="bg-yellow-400 p-2 rounded transform -skew-x-12 border-2 border-white">
                        <ShoppingBag size={24} className="text-slate-900 transform skew-x-12" />
                    </div>
                    {/* Mobile: text-3xl (放大) */}
                    <h1 className="text-3xl md:text-2xl font-black italic tracking-tight text-white drop-shadow-md">
                        {title}
                    </h1>
                </div>

                {/* 2. 右側功能區 (包含 Widget 和 UserMenu) */}
                {/* Mobile: w-full (佔滿第二行) */}
                {/* Desktop (md): w-auto (回到右邊) + flex-1 (填滿中間空間) */}
                <div className="flex items-center w-full md:w-auto md:flex-1 md:justify-end gap-2">
                    
                    {/* 中間內容 (BillWidget) */}
                    {/* flex-1: 讓它在手機版自動伸展，佔據頭像左邊的所有空間 */}
                    <div className="flex-1 min-w-0 md:flex-none"> 
                        {children}
                    </div>

                    {/* HERO NAME 文字：手機版隱藏，以免擠壓 Widget 空間 */}
                    <div className="text-right hidden md:block shrink-0">
                        <p className="text-xs text-slate-400">HERO NAME</p>
                        <p className="font-bold text-white tracking-wide">{user?.name}</p>
                    </div>
                    
                    {/* 右側選單 (Avatar) - 直接使用原本的 UserMenu */}
                    {/* shrink-0: 防止被壓縮 */}
                    <div className="shrink-0 ml-1">
                        <UserMenu 
                            currentUser={user} 
                            onLogout={onLogout} 
                            onOpenModal={onOpenModal} 
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}