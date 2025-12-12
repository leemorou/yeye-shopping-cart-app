// src/components/WishForm.jsx
import React, { useState } from 'react';
import { Image as ImageIcon, Upload, X, Save, ExternalLink, MessageSquare, Trash2 } from 'lucide-react';

// 圖片壓縮工具 (保持原樣)
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
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

export default function WishForm({ onSubmit, onCancel, initialData = null }) {
    // 保持原有的 State 邏輯
    const [title, setTitle] = useState(initialData?.title || '');
    
    // 圖片網址 (http開頭的) 填回文字框
    const [urls, setUrls] = useState(() => 
        initialData?.images?.filter(url => url.startsWith('http'))?.join(', ') || '' // ★ 加上逗號和空格，讓編輯更清楚
    );
    
    const [link, setLink] = useState(initialData?.url || '');
    const [note, setNote] = useState(initialData?.note || '');
    
    // Base64 圖片 (Data URL)
    const [localImages, setLocalImages] = useState(() => 
        initialData?.images?.filter(url => url.startsWith('data:')) || []
    );

    const handleFileChange = async (e) => {
        if (e.target.files) {
            // 限制總圖片數量不超過 5 張 (URLs + localImages)
            const maxImages = 5;
            const manualUrls = urls.split(',').map(s => s.trim()).filter(s => s);
            const currentCount = manualUrls.length + localImages.length;
            const remainingSlots = maxImages - currentCount;

            if (remainingSlots <= 0) {
                alert(`圖片數量已達上限 ${maxImages} 張！`);
                e.target.value = null; // 清空選取
                return;
            }

            const files = Array.from(e.target.files).slice(0, remainingSlots);
            const compressed = await Promise.all(files.map(f => compressImage(f)));
            setLocalImages(prev => [...prev, ...compressed]);
            e.target.value = null; // 處理後清空 input value，以便再次選擇相同文件
        }
    };

    const handleRemoveLocalImage = (idx) => {
        setLocalImages(p => p.filter((_, i) => i !== idx));
    };

    const handleSubmit = () => {
        if (!title) return alert("請填寫商品名稱");
        const manualUrls = urls.split(',').map(s => s.trim()).filter(s => s);
        
        // 匯集所有圖片
        const allImages = [...manualUrls, ...localImages];

        onSubmit({ 
            title, 
            images: allImages, 
            url: link, 
            note 
        });
    };

    const currentTotalImages = localImages.length + urls.split(',').map(s => s.trim()).filter(s => s).length;
    const isEditMode = !!initialData;

    return (
        // ★ 樣式調整：採用英雄學院風格
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} 
            className="flex flex-col gap-4 text-slate-800"
        >
            {/* 商品名稱 (Title) */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <MessageSquare size={16} /> 許願品項名稱 (必填)
                </label>
                <input 
                    className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    placeholder="例如：爆豪勝己 限定版黏土人" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required
                />
            </div>

            {/* 圖片連結 (URLs) */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <ImageIcon size={16} /> 圖片網址 (多個請用逗號分隔)
                </label>
                <textarea 
                    className="w-full border-2 border-slate-900 rounded p-2 text-sm h-16 focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    placeholder="若有多張圖片網址，請貼在這裡，用逗號或換行分隔" 
                    value={urls} 
                    onChange={e => setUrls(e.target.value)} 
                />
            </div>

            {/* 上傳本機圖片 (Local Upload) */}
            <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-100">
                <label className="text-sm font-black italic text-slate-900 flex items-center justify-between">
                    <span>
                      <Upload size={16} className="inline mr-1" /> 上傳本機圖片 (已選 {currentTotalImages} / 5)
                    </span>
                    {currentTotalImages >= 5 && <span className="text-red-600 font-bold">已達上限</span>}
                </label>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileChange} 
                    disabled={currentTotalImages >= 5}
                    // ★ 檔案上傳按鈕樣式調整
                    className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-2 file:border-red-800 file:text-xs file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer disabled:opacity-50" 
                />
                
                {/* 圖片預覽區 */}
                {localImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 pb-4">
                        {localImages.map((src, idx) => (
                            <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-900 shadow">
                                <img src={src} className="w-full h-full object-cover" alt="preview" />
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveLocalImage(idx)} 
                                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 transform translate-x-1/3 -translate-y-1/3 border-2 border-white hover:bg-red-700 transition-all"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 參考網址 (Link) */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <ExternalLink size={16} /> 參考連結 (選填)
                </label>
                <input 
                    className="w-full border-2 border-slate-900 rounded p-2 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    value={link} 
                    onChange={e => setLink(e.target.value)} 
                    placeholder="https://www.amazon.co.jp/..."
                />
            </div>

            {/* 補充說明 (Note) */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-black italic text-slate-900 mb-1 flex items-center gap-1">
                    <MessageSquare size={16} /> 補充說明/備註 (選填)
                </label>
                <textarea 
                    className="w-full border-2 border-slate-900 rounded p-2 h-24 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:border-slate-900 font-bold bg-slate-50 placeholder:text-slate-400 transition-all" 
                    maxLength={500} 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    placeholder="例如：請代購 M 號，紅色款。希望價格不超過 ¥8000。"
                />
            </div>

            {/* 動作按鈕 */}
            <div className="flex justify-end gap-3 pt-2">
                <button 
                    type="button"
                    onClick={onCancel} 
                    // ★ 取消按鈕樣式
                    className="px-6 py-2 rounded bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-100 font-bold italic transition-all"
                >
                    <X size={16} className="inline mr-1" /> 取消
                </button>
                <button 
                    type="submit"
                    // ★ 確認按鈕樣式 (熱血紅)
                    className="px-6 py-2 rounded bg-red-600 text-white border-2 border-red-800 hover:bg-red-700 font-black italic shadow-[2px_2px_0px_0px_rgba(153,27,27,1)] active:translate-y-0.5 active:shadow-none transition-all"
                >
                    <Save size={16} className="inline mr-1" /> {isEditMode ? '儲存修改' : '發送願望'}
                </button>
            </div>
        </form>
    );
}