// src/components/ChangeNameForm.jsx
import React, { useState } from 'react';
import { Tag, Save, X } from 'lucide-react';

export default function ChangeNameForm({ currentUser, onSubmit, onCancel }) {
    const [newName, setNewName] = useState(currentUser?.name || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newName.trim()) return alert("請輸入新的暱稱！");
        if (newName.trim() === currentUser?.name) return alert("新暱稱與舊暱稱相同喔！");
        onSubmit(newName);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-slate-800">
            <div>
                <label className="block text-sm font-black text-slate-700 mb-1">
                    新的英雄稱號 (Nickname)
                </label>
                <div className="relative">
                    <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full border-2 border-slate-900 rounded p-2 pl-9 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold bg-slate-50 text-slate-900"
                        placeholder="請輸入新稱號"
                        autoFocus
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1 pl-1">
                    * 修改後，新成立的訂單將顯示新名稱。
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                 <button 
                    type="button" 
                    onClick={onCancel} 
                    className="px-4 py-2 rounded border-2 border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-all"
                >
                    <X size={16} className="inline mr-1" /> 取消
                </button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-slate-900 text-yellow-400 rounded font-black border-2 border-slate-900 hover:bg-slate-800 shadow-[2px_2px_0px_0px_#FACC15] active:translate-y-0.5 active:shadow-none transition-all"
                >
                    <Save size={16} className="inline mr-1" /> 確認更名
                </button>
            </div>
        </form>
    );
}