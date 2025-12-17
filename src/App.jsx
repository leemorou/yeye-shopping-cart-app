import { useState, useEffect, useCallback } from "react"; 
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, doc } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { School } from 'lucide-react'; 

import LoginScreen from "./components/LoginScreen";
import JF26Page from "./components/JF26Page"; 
import MusicPlayer from './components/MusicPlayer';
import Dashboard from "./components/Dashboard";
import AdminDashboard from './components/AdminDashboard'; 

import { db, auth } from "./firebase";

export default function App() {
    const [user, setUser] = useState(null);       
    const [appUser, setAppUser] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [usersData, setUsersData] = useState([]);

    const handleLogout = useCallback(() => {
        setAppUser(null);
        localStorage.removeItem('app_user_id');
        setLoading(false); 
    }, []);

    useEffect(() => {
        const init = async () => {
            try { if (!auth.currentUser) await signInAnonymously(auth); } 
            catch (e) { console.error("Firebase 登入失敗", e); }
        };
        init();
        return onAuthStateChanged(auth, (u) => { setUser(u); });
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubUsers = onSnapshot(collection(db, "artifacts", "default-app-id", "public", "data", "users"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsersData(list);
        });

        const storedUserId = localStorage.getItem('app_user_id');
        let unsubAppUser = () => {};

        if (storedUserId) {
            unsubAppUser = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "users", storedUserId), (docSnap) => {
                if (docSnap.exists()) {
                    setAppUser({ id: docSnap.id, ...docSnap.data() });
                    setLoading(false); 
                } else { handleLogout(); }
            }, () => handleLogout());
        } else { setLoading(false); }

        return () => { unsubUsers(); unsubAppUser(); };
    }, [user, handleLogout]);

    const handleLogin = (incomingId, password) => {
        const userId = (typeof incomingId === 'object' && incomingId !== null) ? incomingId.id : incomingId;
        const targetUser = usersData.find(u => u.id === userId);
        if (targetUser && String(targetUser.password).trim() === String(password).trim()) {
            localStorage.setItem('app_user_id', targetUser.id);
            setAppUser(targetUser); 
            setLoading(false); 
        } else { alert("密碼錯誤！"); }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-yellow-400">
            <div className="flex items-center gap-2 mb-4 animate-bounce"><School size={80} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" /></div>
            <p className="text-3xl font-black italic tracking-widest animate-pulse">PLUS ULTRA...</p>
        </div>
    );

    return (
        <HashRouter>
            <div className="relative min-h-screen">
                {appUser && <MusicPlayer />}
                <Routes>
                    <Route path="/" element={!appUser ? <LoginScreen users={usersData} onLogin={handleLogin} /> : <Navigate to="/home" replace />} />
                    
                    <Route path="/home" element={appUser ? <Dashboard appUser={appUser} usersData={usersData} handleLogout={handleLogout} /> : <Navigate to="/" replace />} />
                    
                    <Route path="/jf26" element={appUser ? <JF26Page currentUser={appUser} /> : <Navigate to="/" replace />} />
                    
                    <Route 
                        path="/admin/dashboard" 
                        element={
                            appUser?.name === '葉葉' 
                            ? <AdminDashboard currentUser={appUser} />  // 🟢 這裡要傳 props
                            : <Navigate to="/home" replace />           // 🔴 建議沒權限是回 home 而不是 login
                        } 
                    />
                </Routes>
            </div>
        </HashRouter>
    );
}