// src/components/MusicPlayer.jsx
import React, { useState, useRef } from 'react';
import { Music, Minus, Volume2, VolumeX } from 'lucide-react';

export default function MusicPlayer() {
    const [minimized, setMinimized] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // 預設靜音
    const iframeRef = useRef(null);

    const VIDEO_ID = "4sNrzUoSLQY"; 
    const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=1&enablejsapi=1`;

    const toggleMute = () => {
        if (!iframeRef.current) return;
        const command = isMuted ? 'unMute' : 'mute';
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
            'event': 'command',
            'func': command,
            'args': []
        }), '*');
        setIsMuted(!isMuted);
    };

    return (
        <div 
            className={`
                fixed bottom-4 z-[9999] transition-all duration-300
                ${minimized 
                    ? 'left-4' 
                    : 'left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0'
                }
                ${minimized ? 'w-12 h-12' : 'w-80'}
            `}
        >
            <div className="bg-slate-900 border-4 border-yellow-400 rounded-xl shadow-[4px_4px_0px_0px_#000] overflow-hidden flex flex-col h-full">
                
                {/* 播放器本體 - 移除覆蓋的按鈕 */}
                <div style={{ display: minimized ? 'none' : 'block', height: '180px' }}>
                    <iframe 
                        ref={iframeRef}
                        width="100%" 
                        height="100%" 
                        src={EMBED_URL} 
                        title="YouTube music player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                    ></iframe>
                </div>

                {/* 控制列 */}
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
                                <Music size={12} /> BGM PLAYER
                            </span>
                            
                            <div className="flex items-center gap-3">
                                {/* ★ 只保留這個：下方的小喇叭按鈕 */}
                                <button 
                                    onClick={toggleMute} 
                                    className={`hover:text-yellow-400 transition-colors ${!isMuted ? 'text-yellow-400' : 'text-slate-400'}`}
                                    title={isMuted ? "開啟聲音" : "靜音"}
                                >
                                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>

                                <button onClick={() => setMinimized(true)} className="text-slate-400 hover:text-white">
                                    <Minus size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-400 text-center truncate px-1">
                            {isMuted ? "點擊喇叭開啟聲音 🔊" : "正在播放: 致 我們愛的我英 | 按【－】收起播放器"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}