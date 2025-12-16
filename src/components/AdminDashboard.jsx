// src/AdminDashboard.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, ListChecks } from 'lucide-react';

// 引入你原本的兩個元件
import ComplexExcelImport from "./ComplexExcelImport";
import AdminGroupManager from "./AdminGroupManager";

export default function AdminDashboard() {
  // 預設顯示 "管理" 分頁，因為通常匯入完就是一直在管理
  const [activeTab, setActiveTab] = useState('groups'); 
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      
      {/* 頂部導航列 (Navbar) */}
      <header className="bg-slate-900 text-white shadow-md z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* 左邊：標題 */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')} 
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">回首頁</span>
              </button>
              <h1 className="text-xl font-bold tracking-wider border-l border-gray-700 pl-4">
                團務後台控制中心
              </h1>
            </div>

            {/* 中間：切換頁籤 (Tabs) */}
            <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('import')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'import'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <FileSpreadsheet size={16} />
                資料匯入
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'groups'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <ListChecks size={16} />
                團務管理
              </button>
            </div>

            {/* 右邊：使用者 (裝飾用，或是顯示葉葉) */}
            <div className="flex items-center">
                <span className="text-sm text-yellow-400 font-bold">Admin: 葉葉</span>
            </div>
          </div>
        </div>
      </header>

      {/* 內容顯示區 */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'import' ? (
            // 這裡直接顯示匯入元件
            <div className="h-full overflow-auto">
                <ComplexExcelImport />
            </div>
        ) : (
            // 這裡直接顯示管理元件
            <div className="h-full overflow-auto">
                <AdminGroupManager />
            </div>
        )}
      </div>
    </div>
  );
}