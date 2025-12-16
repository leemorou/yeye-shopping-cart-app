// src/components/BillWidget.jsx
import { HelpCircle } from 'lucide-react'; // ★ 改用問號 Icon

export default function BillWidget({ isMember, fee, amount, description }) {
    
    // 定義預設的說明文字 (當沒有傳入 description 時使用)
    const defaultDesc = "【費用組成說明】\n\n• 門號訂閱費用 (均分)\n• 個人團務累計待付金額";
    // 決定最終要顯示的文字
    const finalDesc = description || defaultDesc;

    return (
        <div className="flex flex-col items-end mr-1 pr-2 sm:mr-2 sm:pr-4 border-r border-slate-700 relative group">
            
            {/* ★ 按鈕區域修改 */}
            <button 
                type="button"
                onClick={() => alert("finalDesc")}
                // 這裡使用了 flex 和 items-baseline 讓文字對齊好看一點
                className="mb-1 flex items-center gap-1.5 focus:outline-none group/btn"
            >
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">
                    個人英雄帳單
                </span>
                
                {/* ★ 顯眼的「這是什麼?」提示區塊 */}
                <span className="text-[10px] text-yellow-500 group-hover/btn:text-yellow-400 border-b border-dashed border-yellow-500/50 flex items-center gap-0.5 transition-colors">
                    這是什麼? <HelpCircle size={10} />
                </span>
            </button>

            <div className="text-yellow-400 font-black leading-none drop-shadow-sm text-right">
                <span className="text-xs mr-1 text-yellow-200">NT$</span>
                <span className="text-lg sm:text-xl font-mono">
                    {isMember ? `${fee} + ${amount.toLocaleString()}` : amount.toLocaleString()}
                </span>
            </div>
            
            {/* 電腦版懸停提示 (保持原樣，僅在 sm 以上顯示) */}
            <div className="absolute top-12 right-0 w-max bg-slate-800 text-white text-xs p-2 rounded border border-yellow-400 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 hidden sm:block whitespace-pre-wrap">
               {finalDesc}
            </div>
        </div>
    );
}