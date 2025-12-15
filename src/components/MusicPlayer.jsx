// src/components/MusicPlayer.jsx
import React, { useState } from 'react';
import { Music, Minus } from 'lucide-react';

export default function MusicPlayer() {
    const [minimized, setMinimized] = useState(false);

    // 這是最原始的 YouTube 嵌入網址
    // autoplay=1: 自動播放
    // mute=1: 靜音 (必須靜音才能自動播)
    // loop=1: 循環播放
    // playlist=...: 單曲循環需要指定 playlist ID 為自己
    const VIDEO_ID = "4sNrzUoSLQY"; // 你原本的那首歌
    const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=1`;

    return (
        <div className={`fixed bottom-4 left-4 z-[9999] transition-all duration-300 ${minimized ? 'w-12 h-12' : 'w-80'}`}>
            <div className="bg-slate-900 border-4 border-yellow-400 rounded-xl shadow-[4px_4px_0px_0px_#000] overflow-hidden flex flex-col h-full">
                
              
                <div style={{ display: minimized ? 'none' : 'block', height: '180px' }}>
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={EMBED_URL} 
                        title="YouTube music player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                    ></iframe>
                </div>

                {/* 簡單的標題列 */}
                {minimized ? (
                    <button 
                        onClick={() => setMinimized(false)}
                        className="w-full h-full flex items-center justify-center text-yellow-400 hover:bg-slate-800 bg-slate-900"
                    >
                        <Music size={20} className="animate-pulse" />
                    </button>
                ) : (
                    <div className="p-3 bg-slate-900">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-yellow-400 flex items-center gap-1">
                                <Music size={12} /> BGM PLAYER - 敬我們愛的我英完結
                            </span>
                            <button onClick={() => setMinimized(true)} className="text-slate-400 hover:text-white"><Minus size={14} /></button>
                        </div>
                        <div className="text-[10px] text-slate-400 text-center">
                            若畫面全黑請關閉 AdBlock，撥放器可按－縮小
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}