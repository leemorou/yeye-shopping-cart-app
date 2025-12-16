// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Shield } from 'lucide-react'; 

export default function LoginScreen({ users, onLogin }) {
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');

  const handleButtonClick = (e) => {
    e.preventDefault();
    onLogin(selectedId, password);
  };

  // 定義跑馬燈的內容，重複多次以確保長度足夠
  const marqueeText = "PLUS ULTRA • GO BEYOND • PLUS ULTRA • GO BEYOND • ";
  // 重複字串讓它夠長，能覆蓋直向螢幕
  const fullText = marqueeText.repeat(4); 

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ==================== ⬇️ 背景特效區塊 (左右直向) ⬇️ ==================== */}
      
      {/* 1. 靜態裝飾：網點 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* 2. 左側跑馬燈：由上至下 (Down) */}
      <div className="absolute left-0 top-0 bottom-0 w-32 flex justify-center pointer-events-none overflow-hidden select-none opacity-10">
         {/* 這裡設定 writing-mode: vertical-rl 讓文字直排 */}
        <div className="animate-scroll-down whitespace-nowrap text-8xl font-black text-slate-100 tracking-tighter" style={{ writingMode: 'vertical-rl' }}>
          {/* 為了無縫接軌，我們需要兩組文字 */}
          <span>{fullText}</span>
          <span>{fullText}</span>
        </div>
      </div>

      {/* 3. 右側跑馬燈：由下至上 (Up) */}
      <div className="absolute right-0 top-0 bottom-0 w-32 flex justify-center pointer-events-none overflow-hidden select-none opacity-10">
        <div className="animate-scroll-up whitespace-nowrap text-8xl font-black text-slate-100 tracking-tighter" style={{ writingMode: 'vertical-rl' }}>
          <span>{fullText}</span>
          <span>{fullText}</span>
        </div>
      </div>

      {/* 定義直向動畫的 CSS */}
        <style jsx>{`
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        
        @keyframes scroll-down {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }

        .animate-scroll-up {
          /* 1. 把時間改成 50s */
          animation: scroll-up 50s linear infinite;
          /* 2. ★ 新增這行：告訴瀏覽器這會動，請用 GPU 加速 (避免卡頓) */
          will-change: transform;
        }

        .animate-scroll-down {
          /* 1. 把時間改成 50s */
          animation: scroll-down 50s linear infinite;
          /* 2. ★ 新增這行 */
          will-change: transform;
        }
      `}</style>

      {/* ==================== ⬆️ 背景特效結束 ⬆️ ==================== */}

      {/* ★ 登入卡片 (維持原樣) */}
      <form 
        onSubmit={handleButtonClick}
        className="
          bg-white w-full max-w-md p-8 rounded-lg 
          border-4 border-slate-900 
          shadow-[8px_8px_0px_0px_#FACC15] 
          relative overflow-hidden z-10
        "
      >
        <div className="absolute top-0 left-0 w-full h-1/4 bg-red-600 transform -skew-y-3 -mt-8 opacity-10"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-block p-4 bg-slate-900 rounded-full text-yellow-400 mb-4 border-2 border-yellow-400">
            <Shield size={36} />
          </div>
          <h1 className="text-3xl font-black italic text-slate-900 tracking-wider">
            英雄報到入口
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-bold">U.A. ACADEMY LOGIN</p>
        </div>
        
        <div className="space-y-6">
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