// src/components/ChangeAvatarForm.jsx
import React, { useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';

// 圖片壓縮工具
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500; // 頭像不用太大
                const MAX_HEIGHT = 500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
};

export default function ChangeAvatarForm({ currentUser, onSubmit }) {
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');
    const [localImage, setLocalImage] = useState(null);

    const handleFileChange = async (e) => { 
        if (e.target.files && e.target.files[0]) {
            setLocalImage(await compressImage(e.target.files[0])); 
        }
    };

    const handleSubmit = () => { 
        const finalAvatar = localImage || avatarUrl; 
        if (finalAvatar) onSubmit(finalAvatar); 
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-100 shadow-md">
                    <img 
                        src={localImage || avatarUrl || currentUser?.avatar} 
                        className="w-full h-full object-cover" 
                        alt="avatar"
                        onError={(e) => e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}&backgroundColor=ffdfbf`} 
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <label className="text-stone-600 text-sm font-bold flex items-center gap-2">
                        <ImageIcon size={16} /> 圖片連結
                    </label>
                    <input 
                        type="text" 
                        className="border border-stone-200 rounded-lg px-3 py-2 text-sm" 
                        placeholder="請貼上圖片網址" 
                        value={avatarUrl} 
                        onChange={e => { setAvatarUrl(e.target.value); setLocalImage(null); }} 
                    />
                </div>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-stone-400">或是</span></div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-stone-600 text-sm font-bold flex items-center gap-2">
                        <Upload size={16} /> 上傳本機圖片
                    </label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer" />
                </div>
            </div>
            
            <button 
                className="w-full py-2 bg-orange-400 text-white rounded-lg font-bold hover:bg-orange-500"
                onClick={handleSubmit}
            >
                更新頭像
            </button>
        </div>
    );
}