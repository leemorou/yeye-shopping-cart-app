// src/components/JF26Page.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, Tag, AlertCircle, Search, Rocket, Plus, Edit3, Trash2, X, Database, ShoppingCart, MapPin, CheckCircle, Truck, List, ArrowUp, ArrowDown } from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const ADMIN_USER = "葉葉";

// 初始資料
const INITIAL_VENDORS = [
    {
        name: "JS 先行 (JUMP SHOP)",
        mainUrl: "https://jumpfesta.com/maker/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://jumpshop-online.com/collections/jf2026" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["Jump全作品"],
        notes: "Jump Shop Online 先行販售，官方推特有更多資訊"
    },
    {
        name: "ANIPLAZA",
        mainUrl: "https://aniplaza-jumpfesta.com/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://pochimart.com/" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["我的英雄學院", "排球少年!!", "SAKAMOTO DAYS", "咒術迴戰", "鏈鋸人", "怪獸8號", "BLEACH", "家教", "銀魂", "獵人"],
        notes: "受理網站：PochiMart。各商品限購3個 (盲盒為款式數x3)。滿額即提前結束。"
    },
    {
        name: "アニメイト (Animate / movic)",
        mainUrl: "https://www.movic.jp/shop/pages/jf2026.aspx",
        preOrder: { period: "依網站公告", url: "https://www.movic.jp/shop/pages/jf2026.aspx" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注", "場販限定"],
        products: ["ONE PIECE", "青春之箱", "七龍珠Z", "銀魂", "家教", "影子籃球員", "排球少年!!", "齊木楠雄", "我英", "鬼滅", "失憶投捕", "咒術", "間諜家家酒", "膽大黨", "怪獸8號", "網球王子", "東京喰種"],
        notes: "【JF限定商品】也有在 JCS特設網站 販售（不含食品）。"
    },
    {
        name: "AMNIBUS",
        mainUrl: "https://event.amnibus.com/jumpfesta2026/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://amnibus.com/" },
        postOrder: { period: "2025/12/22 ~ 1/28", url: "https://amnibus.com/" },
        tags: ["事前受注", "事後通販"],
        products: ["家教", "鬼滅", "銀魂", "一弦定音", "黃金神威", "SAKAMOTO DAYS", "咒術", "間諜家家酒", "驅魔少年", "東京喰種", "Dr.STONE", "火影", "排球", "棋靈王", "BLEACH", "失憶投捕", "遊戲王", "憂國的莫里亞蒂", "境界觸發者"],
        notes: "銀魂不提供事前受注。"
    },
    {
        name: "eeo",
        mainUrl: "https://eeo.today/pr/jumpfesta2026/",
        preOrder: { period: "場販先行", url: "" },
        postOrder: { period: "待定", url: "https://eeo.today/store/101/" },
        tags: ["場販限定", "事後通販"],
        products: ["不死不運", "影子籃球員", "SAKAMOTO DAYS", "咒術", "2.5次元", "排球", "BLEACH", "遊戲王GX"],
        notes: "通販期間待定"
    },
    {
        name: "EDITH",
        mainUrl: "https://www.edith.co.jp/lp/jumpfesta-2026/vigilante.html",
        preOrder: { period: "", url: "" },
        postOrder: { period: "", url: "" },
        tags: ["場販限定"],
        products: ["火影忍者", "銀魂", "家教", "肌肉魔法使", "膽大黨", "東京喰種", "維吉蘭蒂", "擅長逃跑的殿下", "齊木楠雄"],
        notes: "⚠️ 網頁需要 VPN 才可進入。暫無通販資訊。"
    },
    {
        name: "Ensky",
        mainUrl: "https://news.ensky.co.jp/jumpfesta2026/",
        preOrder: { period: "部分於 JCS 販售", url: "" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注", "場販限定"],
        products: ["ONE PIECE", "新網球王子", "我英", "境界觸發者", "SAKAMOTO DAYS", "黃金神威", "銀八老師", "失憶投捕", "怪獸8號", "肌肉魔法使", "膽大黨", "鏈鋸人", "排球", "家教", "鬼滅", "影子籃球員", "間諜家家酒", "BLEACH", "地獄樂", "Witch Watch", "咒術"],
        notes: "通販暫且未知。排球少年巨大動物七咪需於 Ensky Shop 購買。"
    },
    {
        name: "キャラアニ (Chara-Ani)",
        mainUrl: "https://www.chara-ani.com/pickup.aspx?p=cawj",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://www.chara-ani.com/pickup.aspx?p=cawj" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["家教", "排球", "新網球王子", "銀八老師", "暗殺教室", "我推的孩子", "死亡筆記本", "我英", "SAKAMOTO DAYS", "鴨乃橋論", "2.5次元", "怪獸8號", "間諜家家酒", "火影", "咒術", "黃金神威", "失憶投捕", "Dr.STONE", "遊戲王"],
        notes: "先行通販"
    },
    {
        name: "COSPA",
        mainUrl: "https://www.cospa.com/cospa/special/jumpfesta/",
        preOrder: { period: "即日起 ~ 12/28", url: "https://www.cospa.com/" },
        postOrder: { period: "2026/3 (一般販售)", url: "" },
        tags: ["事前受注", "事後通販"],
        products: ["銀魂", "排球", "遊戲王", "我英", "火影", "鬼滅", "ONE PIECE", "七龍珠", "2.5次元", "咒術"],
        notes: "先行通販商品將於明年3月寄出。數量有限。"
    },
    {
        name: "THEキャラ (THE CHARA)",
        mainUrl: "https://www.the-chara.com/blog/?p=102132",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://www.the-chara.com/view/category/ct4306" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["暗殺教室", "讓驅魔師免於墮落", "家教", "銀八老師", "SAKAMOTO DAYS", "咒術", "網球王子", "死亡筆記本", "東京喰種", "Dr.STONE", "火影", "排球", "獵人", "藍色監獄"],
        notes: "滿2000日圓送特典照片。《銀八老師》無同期通販。"
    },
    {
        name: "集英社DeNA",
        mainUrl: "https://dena-ent-goodspage.mbok.jp/jumpfesta-goods2026/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://dena-ent-goodspage.mbok.jp/" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["Jump系列作品 (詳見連結)"],
        notes: "現場與線上價格可能不同。特典送完即止。"
    },
    {
        name: "ShoPro",
        mainUrl: "https://mall.shopro.co.jp/",
        preOrder: { period: "預售通路開放中", url: "https://mall.shopro.co.jp/" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["BLACK TORCH", "拷問時間", "間諜家家酒", "齊木楠雄", "Witch Watch", "拉麵赤貓"],
        notes: "ShoPro Mall"
    },
    {
        name: "ショウワノート (Showa Note)",
        mainUrl: "https://www.showa-note.co.jp/",
        preOrder: { period: "", url: "" },
        postOrder: { period: "", url: "" },
        tags: ["場販限定"],
        products: ["新網球王子", "排球", "銀魂", "影子籃球員", "膽大黨", "暗殺教室", "怪獸8號"],
        notes: "僅提供 PDF 資訊，無通販連結"
    },
    {
        name: "TAPIOCA",
        mainUrl: "https://tapioca-online.stores.jp/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://tapioca-online.stores.jp/" },
        postOrder: { period: "", url: "" },
        tags: ["事前受注"],
        products: ["肌肉魔法使", "家教", "棋靈王", "BLEACH", "失憶投捕", "我英", "SAKAMOTO DAYS", "東京喰種"],
        notes: "無會場特典。出貨預計1週～10天。"
    },
    {
        name: "中外鉱業",
        mainUrl: "https://www.chugai-contents.jp/blog/event/jf2026/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://www.chugai-contents.jp/" },
        postOrder: { period: "2025/12/23 ~ 1/7", url: "https://www.chugai-contents.jp/" },
        tags: ["事前受注", "事後通販"],
        products: ["咒術", "排球", "影子籃球員", "境界觸發者", "新網球王子", "黃金神威", "家教", "魁!!男塾", "暗殺教室", "SAKAMOTO DAYS", "血界戰線", "齊木楠雄", "青春之箱", "網球王子音樂劇"],
        notes: "事前/事後皆有特典。配送時間依作品2月或3月起。"
    },
    {
        name: "MEDICOS",
        mainUrl: "https://www.medicos-e.net/newsdetail/jumpfesta2026/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://medicos-e-shop.net/" },
        postOrder: { period: "2025/12/23 ~ 1/13", url: "https://medicos-e-shop.net/" },
        tags: ["事前受注", "事後通販"],
        products: ["JOJO", "銀八老師", "火影", "SAKAMOTO DAYS", "排球", "新網球王子", "我英", "咒術", "BLEACH"],
        notes: "盲盒只賣抱盒。《銀魂》無事前通販。"
    },
    {
        name: "LAWSON HMV&BOOKS",
        mainUrl: "https://www.hmv.co.jp/en/news/article/251111149/",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://www.hmv.co.jp/en/" },
        postOrder: { period: "2025/12/22 ~ 2026/1/12", url: "https://www.hmv.co.jp/en/" },
        tags: ["事前受注", "事後通販"],
        products: ["咒術", "我英", "影子籃球員", "新網球王子", "BLEACH", "家教", "銀魂"],
        notes: "500日圓商品變為499日圓。運費一律660日圓。"
    },
    {
        name: "TOHO",
        mainUrl: "https://tohoentertainmentonline.com/shop/pages/jf2026.aspx",
        preOrder: { period: "2025/12/17 ~ 12/21", url: "https://tohoentertainmentonline.com/shop/brand/TaS/" },
        postOrder: { period: "2025/12/22 起", url: "https://tohoentertainmentonline.com/shop/brand/TaS/" },
        tags: ["事前受注", "事後通販"],
        products: ["我英", "排球", "Dr.STONE", "咒術", "間諜家家酒", "怪獸8號", "非法英雄", "青春之箱"],
        notes: "部分商品為「網路販售限定」。"
    }
];

export default function JF26Page({ currentUser }) {
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [viewingIpsVendor, setViewingIpsVendor] = useState(null);
    // 用於觸發畫面重新渲染以更新 "NEW" 標籤
    const [readStatusTick, setReadStatusTick] = useState(0);

    const isAdmin = currentUser?.name === ADMIN_USER;

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // 依照 order 排序
            setVendors(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        });
        return () => unsub();
    }, []);

    const filteredVendors = vendors.filter(v => 
        (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (Array.isArray(v.products) 
            ? v.products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
            : (v.products || v.ips || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這張卡片嗎？")) return;
        const previousVendors = [...vendors];
        setVendors(prev => prev.filter(v => v.id !== id));
        try {
            await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", id));
        } catch (e) { 
            console.error("刪除失敗", e); 
            alert("刪除失敗"); 
            setVendors(previousVendors);
        }
    };

    // 處理排序 (上移/下移)
    const handleMoveVendor = async (index, direction) => {
        // direction: -1 (up), 1 (down)
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= vendors.length) return;

        // 樂觀更新
        const newVendors = [...vendors];
        const temp = newVendors[index];
        newVendors[index] = newVendors[targetIndex];
        newVendors[targetIndex] = temp;
        setVendors(newVendors);

        try {
            // 交換 order 值
            const itemA = vendors[index];
            const itemB = vendors[targetIndex];
            // 確保有 order 值，若無則用當下時間
            const orderA = itemA.order || Date.now();
            const orderB = itemB.order || (Date.now() + 1);

            const batch = writeBatch(db);
            const refA = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", itemA.id);
            const refB = doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", itemB.id);

            batch.update(refA, { order: orderB });
            batch.update(refB, { order: orderA });
            await batch.commit();
        } catch (e) {
            console.error("排序失敗", e);
            alert("排序失敗");
            // 失敗會由 onSnapshot 自動修正回原狀
        }
    };

    const handleInitData = async () => {
        if (!confirm("確定要匯入預設資料嗎？(這會覆蓋/新增資料)")) return;
        try {
            const batch = writeBatch(db);
            INITIAL_VENDORS.forEach((v, idx) => {
                const docRef = doc(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"));
                // 匯入時給予初始時間與順序
                batch.set(docRef, { 
                    ...v, 
                    order: idx, 
                    updatedAt: new Date().toISOString() 
                });
            });
            await batch.commit();
            alert("資料匯入成功！");
        } catch (e) { console.error("匯入失敗", e); alert("匯入失敗"); }
    };

    // 檢查是否顯示 "NEW" 標籤
    const isVendorNew = (vendor) => {
        if (!vendor.updatedAt) return false;
        const lastReadKey = `jf26_read_${vendor.id}`;
        const lastReadTime = localStorage.getItem(lastReadKey);
        
        // 如果從未讀過，或者更新時間比讀取時間晚，則為 NEW
        if (!lastReadTime) return true;
        return new Date(vendor.updatedAt) > new Date(lastReadTime);
    };

    // 標記已讀 (當點擊連結時觸發)
    const markAsRead = (vendorId) => {
        const lastReadKey = `jf26_read_${vendorId}`;
        localStorage.setItem(lastReadKey, new Date().toISOString());
        // 強制觸發重新渲染以消除 NEW 標籤
        setReadStatusTick(prev => prev + 1);
    };

    const getTagStyle = (tag) => {
        switch(tag) {
            case "事前受注": return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "事後通販": return "bg-blue-100 text-blue-800 border-blue-300";
            case "場販限定": return "bg-red-100 text-red-800 border-red-300";
            default: return "bg-slate-100 text-slate-800 border-slate-300";
        }
    };

    const IP_LIMIT = 10;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 pb-12">
            {/* 標題區 */}
            <div className="text-center mb-8 relative">
                <div className="inline-block relative">
                    <h2 className="text-4xl font-black text-slate-900 italic transform -skew-x-6 z-10 relative">JUMP FESTA 2026</h2>
                    <div className="absolute -bottom-2 -right-2 w-full h-4 bg-yellow-400 -z-0 transform -skew-x-6"></div>
                </div>
                <p className="text-slate-500 font-bold mt-2 flex items-center justify-center gap-2">
                    <Rocket size={18} /> 攤商情報懶人包
                </p>

                {/* 導航連結 */}
                <div className="mt-4 flex justify-center gap-4 text-sm font-bold text-slate-500">
                    <a href="https://www.jumpfesta.com/maker/" target="_blank" rel="noreferrer" className="hover:text-slate-900 border-b-2 border-transparent hover:border-yellow-400 transition-colors flex items-center gap-1">
                        JF26 攤商資訊 <ExternalLink size={12}/>
                    </a>
                    <span className="text-slate-300">|</span>
                    <a href="https://jumpcs.shueisha.co.jp/shop/pages/jumpfesta.aspx" target="_blank" rel="noreferrer" className="hover:text-slate-900 border-b-2 border-transparent hover:border-yellow-400 transition-colors flex items-center gap-1">
                        JCS特設頁 <ExternalLink size={12}/>
                    </a>
                </div>
                
                {/* 初始匯入按鈕 (僅限管理員且無資料時顯示) */}
                {isAdmin && vendors.length === 0 && (
                    <div className="absolute right-0 top-0">
                         <button onClick={handleInitData} className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 flex items-center gap-1 font-bold">
                            <Database size={12} /> 匯入
                        </button>
                    </div>
                )}
            </div>

            {/* 搜尋欄 & 新增按鈕區 */}
            <div className="max-w-md mx-auto mb-8 flex flex-col gap-3 px-4">
                <div className="flex items-center w-full h-12 rounded-full border-2 border-slate-300 bg-white shadow-sm transition-all focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-yellow-400/50 overflow-hidden">
                    <div className="pl-4 pr-2 flex items-center justify-center text-slate-400">
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="搜尋攤商名稱 或 IP..." 
                        className="w-full h-full bg-transparent border-none outline-none text-slate-700 font-bold placeholder:font-normal focus:ring-0" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                
                {/* ★ 需求1: 新增按鈕移到搜尋欄下方 */}
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} 
                        className="w-full bg-slate-900 text-yellow-400 py-3 rounded-lg font-black shadow-md hover:bg-slate-800 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-transform"
                    >
                        <Plus size={18} /> 新增攤商卡片
                    </button>
                )}
            </div>

            {/* 卡片網格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor, index) => {
                    const productList = Array.isArray(vendor.products) ? vendor.products : [];
                    const showEllipsis = productList.length > IP_LIMIT;
                    const displayedProducts = showEllipsis ? productList.slice(0, IP_LIMIT) : productList;
                    const isNew = isVendorNew(vendor);

                    return (
                        <div key={vendor.id} className="bg-white rounded-xl border-4 border-slate-900 p-5 shadow-[6px_6px_0px_0px_#FACC15] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#FACC15] transition-all duration-200 flex flex-col relative group">
                            
                            {/* 裝飾釘子 */}
                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-400 z-10"></div>
                            
                            {/* ★ 需求4: NEW 標籤 (左上角) */}
                            {isNew && (
                                <div className="absolute -top-3 -left-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded shadow-md transform -rotate-12 z-20 border-2 border-white">
                                    NEW!
                                </div>
                            )}

                            {/* 標題與管理按鈕區 */}
                            <div className="flex justify-between items-start mb-3 pr-4">
                                <h3 className="font-black text-xl text-slate-900 leading-tight pt-1">{vendor.name}</h3>
                                
                                {/* ★ 需求2 & 3: 手機版管理按鈕 (編輯/刪除/排序) 直接顯示在標題旁 */}
                                {isAdmin && (
                                    <div className="flex flex-col gap-1 ml-2 shrink-0">
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200" title="編輯">
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(vendor.id)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200" title="刪除">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleMoveVendor(index, -1)} disabled={index === 0} className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 border border-slate-300 disabled:opacity-30" title="上移">
                                                <ArrowUp size={14} />
                                            </button>
                                            <button onClick={() => handleMoveVendor(index, 1)} disabled={index === vendors.length - 1} className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 border border-slate-300 disabled:opacity-30" title="下移">
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {vendor.tags && vendor.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {vendor.tags.map(tag => (
                                        <span key={tag} className={`text-[10px] font-black px-2 py-0.5 rounded border ${getTagStyle(tag)}`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-4 flex-1">
                                {/* Products (IPs) */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Tag size={12}/> 參與作品 (IPs)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {displayedProducts.map((ip, idx) => (
                                            <span 
                                                key={idx} 
                                                className="bg-yellow-50 text-slate-800 text-xs font-bold px-2 py-1.5 rounded shadow-sm border border-yellow-200 transition-transform hover:scale-105"
                                            >
                                                {ip}
                                            </span>
                                        ))}
                                        {showEllipsis && (
                                            <button 
                                                onClick={() => {
                                                    setViewingIpsVendor(vendor);
                                                    markAsRead(vendor.id); // 點擊查看更多也算已讀
                                                }}
                                                className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1.5 rounded shadow-sm border border-slate-300 hover:bg-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                                            >
                                                <List size={12}/> ... (點擊看全部 {productList.length} 個)
                                            </button>
                                        )}
                                        {!Array.isArray(vendor.products) && vendor.ips && vendor.ips.split(/[,、]/).map((ip, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded border">{ip}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* 販售期間 */}
                                <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
                                    {vendor.preOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-1 rounded mr-2">事前</span>
                                            <span className="font-bold text-slate-700">{vendor.preOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.postOrder?.period && (
                                        <div className="text-sm">
                                            <span className="text-[10px] font-black bg-blue-400 text-white px-1 rounded mr-2">事後</span>
                                            <span className="font-bold text-slate-700">{vendor.postOrder.period}</span>
                                        </div>
                                    )}
                                    {vendor.tags?.includes("場販限定") && (
                                        <div className="text-sm flex items-center gap-2 text-red-600 font-bold">
                                            <MapPin size={14} /> 僅限 JUMP FESTA 現場
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {vendor.notes && (
                                    <div className="flex items-start gap-2 bg-red-50 p-2 rounded border border-red-100">
                                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold text-red-600">{vendor.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Buttons Footer */}
                            <div className="mt-5 space-y-3">
                                <div className="flex gap-2">
                                    {vendor.preOrder?.url && (
                                        <a href={vendor.preOrder.url} onClick={() => markAsRead(vendor.id)} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-yellow-400 text-slate-900 text-center font-bold rounded border-2 border-yellow-500 hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1 text-xs shadow-[2px_2px_0px_0px_#b45309] active:translate-y-0.5 active:shadow-none">
                                            <ShoppingCart size={14} /> 事前受注
                                        </a>
                                    )}
                                    {vendor.postOrder?.url && (
                                        <a href={vendor.postOrder.url} onClick={() => markAsRead(vendor.id)} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-blue-100 text-blue-700 text-center font-bold rounded border-2 border-blue-200 hover:bg-blue-200 transition-colors flex items-center justify-center gap-1 text-xs shadow-[2px_2px_0px_0px_#bfdbfe] active:translate-y-0.5 active:shadow-none">
                                            <Truck size={14} /> 事後通販
                                        </a>
                                    )}
                                </div>

                                {vendor.mainUrl && (
                                    <a href={vendor.mainUrl} onClick={() => markAsRead(vendor.id)} target="_blank" rel="noreferrer" className="block w-full py-2 bg-slate-100 text-slate-700 text-center font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm border-2 border-slate-200">
                                        <ExternalLink size={16} /> 攤商/活動官網
                                    </a>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {filteredVendors.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-bold">
                    {vendors.length === 0 ? "目前沒有資料，請點擊右上角匯入預設資料。" : "沒有找到相關的攤商情報... 🐢"}
                </div>
            )}
            
            <div className="mt-12 text-center text-xs text-slate-400 font-bold">
                * 資訊來源：JF26 官方與各廠商公告，如有變動請以官方為準。
            </div>

            {/* 查看詳細 IP 的 Modal */}
            {viewingIpsVendor && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border-4 border-slate-900 overflow-hidden scale-100">
                        <div className="bg-slate-100 px-4 py-3 border-b-2 border-slate-900 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2 truncate">
                                <Tag size={20}/> {viewingIpsVendor.name} - 參與作品
                            </h3>
                            <button onClick={() => setViewingIpsVendor(null)} className="text-slate-500 hover:text-slate-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                             <div className="flex flex-wrap gap-2">
                                {(Array.isArray(viewingIpsVendor.products) ? viewingIpsVendor.products : []).map((ip, idx) => (
                                    <span 
                                        key={idx} 
                                        className="bg-yellow-50 text-slate-800 text-sm font-bold px-3 py-2 rounded shadow-sm border border-yellow-200"
                                    >
                                        {ip}
                                    </span>
                                ))}
                            </div>
                        </div>
                         <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                            <button onClick={() => setViewingIpsVendor(null)} className="px-4 py-2 rounded border-2 border-slate-300 font-bold text-slate-600 hover:bg-slate-200">關閉</button>
                         </div>
                    </div>
                </div>
            )}

            {/* 編輯/新增 Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border-4 border-slate-900 overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="bg-yellow-400 px-4 py-3 border-b-2 border-slate-900 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-black text-lg text-slate-900 italic flex items-center gap-2">
                                {editingVendor ? <Edit3 size={20}/> : <Plus size={20}/>}
                                {editingVendor ? "編輯攤商資訊" : "新增攤商資訊"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-900 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            <VendorForm 
                                initialData={editingVendor} 
                                onSubmit={async (data) => {
                                    try {
                                        if (editingVendor) {
                                            await updateDoc(doc(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors", editingVendor.id), { 
                                                ...data, 
                                                updatedAt: new Date().toISOString() // 編輯時更新時間，觸發 NEW 標籤
                                            });
                                            alert("更新成功！");
                                        } else {
                                            await addDoc(collection(db, "artifacts", "default-app-id", "public", "data", "jf26_vendors"), { 
                                                ...data, 
                                                order: Date.now(), 
                                                updatedAt: new Date().toISOString(), // 新增時設定時間
                                                createdAt: new Date().toISOString() 
                                            });
                                            alert("新增成功！");
                                        }
                                        setIsModalOpen(false);
                                    } catch(e) { console.error("儲存失敗", e); alert("儲存失敗"); }
                                }}
                                onCancel={() => setIsModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 編輯表單
function VendorForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        mainUrl: initialData?.mainUrl || '',
        preOrder: { 
            period: initialData?.preOrder?.period || '', 
            url: initialData?.preOrder?.url || '' 
        },
        postOrder: { 
            period: initialData?.postOrder?.period || '', 
            url: initialData?.postOrder?.url || '' 
        },
        tags: initialData?.tags || [], 
        products: initialData?.products || [],
        notes: initialData?.notes || ''
    });

    const handleTagChange = (tag) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag) 
                ? prev.tags.filter(t => t !== tag) 
                : [...prev.tags, tag];
            return { ...prev, tags: newTags };
        });
    };

    const handleProductsChange = (e) => {
        const val = e.target.value;
        const arr = val.split(/[,，、]/).map(s => s.trim()).filter(s => s);
        setFormData({ ...formData, products: arr });
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div>
                <label className="block text-xs font-black text-slate-700 mb-1">攤商名稱</label>
                <input className="w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div>
                <label className="block text-xs font-black text-slate-700 mb-1">官方/活動網址 (Main URL)</label>
                <input className="w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0" 
                    value={formData.mainUrl} onChange={e => setFormData({...formData, mainUrl: e.target.value})} placeholder="https://..." />
            </div>
            
            <div>
                <label className="block text-xs font-black text-slate-700 mb-1">販售類型</label>
                <div className="flex gap-3">
                    {["事前受注", "事後通販", "場販限定"].map(tag => (
                        <label key={tag} className={`flex-1 cursor-pointer border-2 rounded px-2 py-1.5 text-center text-xs font-bold transition-all ${formData.tags.includes(tag) ? 'bg-slate-800 text-yellow-400 border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>
                            <input type="checkbox" className="hidden" checked={formData.tags.includes(tag)} onChange={() => handleTagChange(tag)} />
                            {formData.tags.includes(tag) && <CheckCircle size={10} className="inline mr-1" />}
                            {tag}
                        </label>
                    ))}
                </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 space-y-2">
                <p className="text-xs font-black text-yellow-700 border-b border-yellow-200 pb-1">事前受注設定</p>
                <div>
                    <label className="block text-[10px] font-bold text-yellow-800">期間</label>
                    <input className="w-full border border-yellow-300 rounded p-1 text-sm" 
                        value={formData.preOrder.period} 
                        onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, period: e.target.value}})} 
                        placeholder="例如：12/17 ~ 12/21" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-yellow-800">購買連結</label>
                    <input className="w-full border border-yellow-300 rounded p-1 text-sm" 
                        value={formData.preOrder.url} 
                        onChange={e => setFormData({...formData, preOrder: {...formData.preOrder, url: e.target.value}})} />
                </div>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                <p className="text-xs font-black text-blue-700 border-b border-blue-200 pb-1">事後通販設定</p>
                <div>
                    <label className="block text-[10px] font-bold text-blue-800">期間</label>
                    <input className="w-full border border-blue-300 rounded p-1 text-sm" 
                        value={formData.postOrder.period} 
                        onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, period: e.target.value}})} 
                        placeholder="例如：12/23 起" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-blue-800">購買連結</label>
                    <input className="w-full border border-blue-300 rounded p-1 text-sm" 
                        value={formData.postOrder.url} 
                        onChange={e => setFormData({...formData, postOrder: {...formData.postOrder, url: e.target.value}})} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-slate-700 mb-1">參與 IP (作品)</label>
                <textarea className="w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0 h-20" 
                    defaultValue={formData.products.join(', ')} 
                    onChange={handleProductsChange} 
                    placeholder="請用逗號分隔，例如：排球少年, 咒術迴戰" />
                <p className="text-[10px] text-slate-400 mt-1">* 顯示時會自動拆分成小標籤</p>
            </div>

            <div>
                <label className="block text-xs font-black text-slate-700 mb-1">備註 / 注意事項</label>
                <input className="w-full border-2 border-slate-300 rounded p-2 text-sm font-bold focus:border-slate-900 focus:ring-0" 
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded border-2 border-slate-300 font-bold text-slate-600 hover:bg-slate-100">取消</button>
                <button type="submit" className="px-4 py-2 rounded bg-slate-900 text-yellow-400 font-black border-2 border-slate-900 hover:bg-slate-700 shadow-md">儲存</button>
            </div>
        </form>
    );
}