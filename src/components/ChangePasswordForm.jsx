// src/components/ChangePasswordForm.jsx
import React, { useState } from 'react';

export default function ChangePasswordForm({ onSubmit }) {
    const [pwd, setPwd] = useState('');

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <label className="text-stone-600 text-sm font-bold tracking-wide">新密碼</label>
                <input 
                    type="password" 
                    className="border border-stone-200 rounded-lg px-3 py-2" 
                    placeholder="請輸入新密碼"
                    value={pwd} 
                    onChange={e => setPwd(e.target.value)} 
                />
            </div>
            <button 
                className="w-full py-2 bg-orange-400 text-white rounded-lg font-bold hover:bg-orange-500 disabled:opacity-50"
                onClick={() => onSubmit(pwd)} 
                disabled={!pwd}
            >
                確認修改
            </button>
        </div>
    );
}