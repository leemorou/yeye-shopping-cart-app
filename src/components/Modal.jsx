// src/components/Modal.jsx
import React, { useEffect } from 'react';
import { X, Zap } from 'lucide-react'; // 加入 Zap 圖示裝飾

const Modal = ({ isOpen, onClose, title, children }) => {
  
  // 按下 ESC 關閉視窗
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // 背景遮罩：使用深藍色半透明，讓注意力集中在視窗上
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* 視窗本體：漫畫風格 */}
      <div 
        className="
            bg-white w-full max-w-lg rounded-lg overflow-hidden relative 
            border-4 border-slate-900 
            shadow-[8px_8px_0px_0px_#FACC15] 
            animate-in zoom-in-95 duration-300
        "
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 標題列：雄英風格 (深藍底 + 黃字) */}
        <div className="bg-slate-900 p-4 border-b-4 border-slate-900 flex justify-between items-center relative overflow-hidden">
            {/* 背景裝飾紋路 (斜線) */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-800 rotate-45 transform translate-x-10 -translate-y-10"></div>
            
            <div className="flex items-center gap-2 relative z-10">
                <Zap className="text-yellow-400 fill-yellow-400" size={24} />
                <h3 className="text-xl font-black italic tracking-wider text-yellow-400 uppercase transform -skew-x-6">
                    {title}
                </h3>
            </div>

            <button 
                onClick={onClose}
                className="
                    relative z-10 
                    bg-red-600 hover:bg-red-700 text-white 
                    p-1.5 rounded border-2 border-white 
                    transition-transform hover:scale-110 active:scale-95
                    shadow-lg
                "
            >
                <X size={20} strokeWidth={3} />
            </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-white">
            {children}
        </div>

        {/* 底部裝飾條 (Plus Ultra 風格) */}
        <div className="h-2 bg-yellow-400 border-t-2 border-slate-900 flex">
            <div className="w-1/3 bg-red-600 border-r-2 border-slate-900"></div>
            <div className="w-1/3 bg-white border-r-2 border-slate-900"></div>
            <div className="w-1/3 bg-blue-600"></div>
        </div>
      </div>
    </div>
  );
};

export default Modal;