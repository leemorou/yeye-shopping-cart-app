// src/components/LoginScreen.jsx
import React, { useState } from 'react';
// ★ 替換成更符合主題的 Icon
import { ShoppingBag, User, Lock, ArrowRight, Shield } from 'lucide-react'; 

export default function LoginScreen({ users, onLogin }) {
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');

  // 處理按鈕點擊的函式
  const handleButtonClick = (e) => {
    e.preventDefault(); // 阻止表單預設提交行為
    console.log("正在傳送登入請求...");
    onLogin(selectedId, password);
  };

  return (
    // ★ 背景換成深藍/黑
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      
      {/* ★ 卡片：粗黑框 + 黃色硬陰影 */}
      <form 
        onSubmit={handleButtonClick}
        className="
          bg-white w-full max-w-md p-8 rounded-lg 
          border-4 border-slate-900 
          shadow-[8px_8px_0px_0px_#FACC15] 
          relative overflow-hidden
        "
      >
        {/* 背景裝飾：紅色斜線 */}
        <div className="absolute top-0 left-0 w-full h-1/4 bg-red-600 transform -skew-y-3 -mt-8 opacity-10"></div>
        
        <div className="text-center mb-8 relative z-10">
          {/* Icon：深藍底黃色 Icon */}
          <div className="inline-block p-4 bg-slate-900 rounded-full text-yellow-400 mb-4 border-2 border-yellow-400">
            <Shield size={36} />
          </div>
          {/* 標題：黑字 + 黃色追蹤線 */}
          <h1 className="text-3xl font-black italic text-slate-900 tracking-wider">
            英雄報到入口
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-bold">U.A. ACADEMY LOGIN</p>
        </div>
        
        <div className="space-y-6">
          {/* 1. 選擇身分 (Select) */}
          <div>
            <label className="text-slate-900 text-sm font-black italic block mb-1 flex items-center gap-1">
              <User size={16} /> 英雄名稱 (Your ID)
            </label>
            <select 
              className="
                w-full border-2 border-slate-900 rounded-lg px-3 py-2.5 
                bg-slate-50 text-slate-800 font-bold 
                focus:outline-none focus:ring-4 focus:ring-yellow-400 
                transition-all appearance-none
              " 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">請選擇你的英雄身分...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          
          {/* 2. 輸入密碼 (Password) */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-900 text-sm font-black italic block mb-1 flex items-center gap-1">
              <Lock size={16} /> 秘密暗號 (Password)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="
                w-full border-2 border-slate-900 rounded-lg px-3 py-2 
                bg-slate-50 text-slate-900 font-bold 
                focus:outline-none focus:ring-4 focus:ring-yellow-400 
                placeholder-slate-400 transition-all
              "
              required
            />
            <span className="text-xs text-slate-500 font-medium mt-1">
              提示：預設是 4 個 0 喔！
            </span>
          </div>

          {/* 3. 登入按鈕 (Submit) */}
          <button 
            type="submit"
            className="
              w-full py-3 mt-4 text-xl 
              bg-red-600 text-white font-black italic 
              rounded-lg border-2 border-red-800
              shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]
              hover:bg-red-700 
              disabled:opacity-50 disabled:shadow-none
              transition-all transform active:translate-y-0.5 active:translate-x-0.5 active:shadow-none
            " 
            disabled={!selectedId || !password}
          >
            <ArrowRight size={20} className="inline mr-2" /> 
            確認參戰 (LOGIN!)
          </button>
        </div>
      </form>
    </div>
  );
}