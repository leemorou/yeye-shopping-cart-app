// src/components/BillWidget.jsx
import { Info } from 'lucide-react';

export default function BillWidget({ isMember, fee, amount }) {
    return (
        <div className="flex flex-col items-end mr-1 pr-2 sm:mr-2 sm:pr-4 border-r border-slate-700 relative group">
            <span className="text-[10px] sm:text-xs text-slate-400 mb-0.5 flex items-center gap-1 cursor-help">
                個人英雄帳單 <Info size={12} className="text-slate-500" />
            </span>
            <div className="text-yellow-400 font-black leading-none drop-shadow-sm text-right">
                <span className="text-xs mr-1 text-yellow-200">NT$</span>
                <span className="text-lg sm:text-xl font-mono">
                    {isMember ? `${fee} + ${amount.toLocaleString()}` : amount.toLocaleString()}
                </span>
            </div>
            
            <div className="absolute top-12 right-0 w-max bg-slate-800 text-white text-xs p-2 rounded border border-yellow-400 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <p className="font-bold mb-1 text-yellow-400">費用組成：</p>
                <p>• 門號訂閱費用 (均分)</p>
                <p>• 個人團務累計待付金額</p>
            </div>
        </div>
    );
}