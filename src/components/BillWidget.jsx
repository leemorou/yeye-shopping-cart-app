// src/components/BillWidget.jsx
import { HelpCircle } from 'lucide-react';

export default function BillWidget({ isMember, fee, amount, description }) {
    
    const defaultDesc = "【費用組成說明】\n\n• 門號訂閱費用 (均分)\n• 個人團務累計待付金額";
    const finalDesc = description || defaultDesc;

    return (
        <div className="
            relative group border-r border-slate-700 mr-1 pr-2 sm:mr-2 sm:pr-4
            flex w-full items-center justify-end gap-3   /* 手機版：左右並排、佔滿寬度 */
            sm:w-auto sm:flex-col sm:items-end sm:gap-0  /* 電腦版：垂直堆疊、靠右對齊 */
        ">
            {/* 標題與按鈕區 */}
            <button 
                type="button"
                onClick={() => alert(finalDesc)}
                className="
                    focus:outline-none group/btn
                    flex items-center gap-2              /* 手機版：橫向間距 */
                    sm:mb-1 sm:gap-1.5
                "
            >
                {/* 文字：統一為 16px (手機) / base (電腦) */}
                <span className="text-[16px] sm:text-base text-slate-400 font-bold whitespace-nowrap pt-0.5">
                    個人英雄帳單
                </span>
                
                {/* 提示區塊 */}
                <span className="text-[10px] text-yellow-500 group-hover/btn:text-yellow-400 border-b border-dashed border-yellow-500/50 flex items-center gap-0.5 transition-colors">
                    <span className="hidden sm:inline">這是什麼?</span>
                    {/* 圖示：統一大小 14 (手機) / 10 (電腦) */}
                    <HelpCircle className="block sm:hidden" size={14} />
                    <HelpCircle className="hidden sm:block" size={10} />
                </span>
            </button>

            {/* 金額顯示區 */}
            <div className="text-yellow-400 font-black drop-shadow-sm text-right flex items-center">
                {/* 貨幣符號：微調位置與大小，確保對齊數字 */}
                <span className="text-xs mr-1 text-yellow-200 mt-1">NT$</span>
                
                {/* 金額數字：統一字體大小與字型 */}
                <span className="text-xl sm:text-xl font-mono">
                    {isMember ? `${fee} + ${amount.toLocaleString()}` : amount.toLocaleString()}
                </span>
            </div>
            
            {/* 電腦版懸停提示 */}
            <div className="absolute top-12 right-0 w-max bg-slate-800 text-white text-xs p-2 rounded border border-yellow-400 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 hidden sm:block whitespace-pre-wrap text-left">
               {finalDesc}
            </div>
        </div>
    );
}