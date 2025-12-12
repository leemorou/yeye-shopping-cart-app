// src/components/ImageSlider.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function ImageSlider({ images }) {
    const [idx, setIdx] = useState(0);
    // 如果沒有圖片，顯示預設圖
    const imgList = Array.isArray(images) && images.length > 0 ? images : [];

    if (imgList.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-300">
                <ImageIcon size={24} className="opacity-20" />
            </div>
        );
    }

    const next = (e) => { e.stopPropagation(); setIdx((prev) => (prev + 1) % imgList.length); };
    const prev = (e) => { e.stopPropagation(); setIdx((prev) => (prev - 1 + imgList.length) % imgList.length); };

    return (
        <div className="relative w-full h-full bg-stone-100 group">
            <img 
                src={imgList[idx]} 
                alt="product" 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
            />
            
            {/* 只有當圖片大於 1 張時才顯示箭頭 */}
            {imgList.length > 1 && (
                <>
                    <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-stone-600">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-stone-600">
                        <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {imgList.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-orange-500' : 'bg-white/70'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}