// src/ComplexExcelImport.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { db } from '../firebase'; 
import { collection, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { Trash2, UploadCloud, RefreshCw, AlertTriangle } from 'lucide-react'; // 引入圖示讓介面更好看

const ComplexExcelImport = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [groupsCount, setGroupsCount] = useState(0); // 🟢 新增：統計目前 Groups 筆數
  const navigate = useNavigate();

  // 📂 資料夾路徑
  const BACKORDERS_PATH = ["artifacts", "default-app-id", "public", "data", "backorders"];
  const GROUPS_PATH = ["artifacts", "default-app-id", "public", "data", "groups"];

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  // 1. 讀取 backorders 分類
  const fetchExistingCategories = async () => {
    try {
      const collectionRef = collection(db, ...BACKORDERS_PATH);
      const querySnapshot = await getDocs(collectionRef);
      const categories = new Set();
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.sheetCategory) categories.add(data.sheetCategory);
      });
      setExistingCategories(Array.from(categories).sort());
    } catch (error) {
      console.error("讀取分類失敗", error);
    }
  };

  // 2. 🟢 新增：讀取 Groups 目前的總筆數 (讓我們知道有多少資料)
  const fetchGroupsCount = async () => {
      try {
          const ref = collection(db, ...GROUPS_PATH);
          const snap = await getDocs(ref);
          setGroupsCount(snap.size);
      } catch (error) {
          console.error(error);
      }
  };

  useEffect(() => { 
      fetchExistingCategories(); 
      fetchGroupsCount();
  }, []);

  // --- 刪除 backorders (暫存區) ---
  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`⚠️ 警告：確定刪除暫存區「${categoryName}」的所有資料？`)) return;
    setLoading(true);
    addLog(`🗑️ 正在刪除暫存區 [${categoryName}]...`);
    try {
      const collectionRef = collection(db, ...BACKORDERS_PATH);
      const q = query(collectionRef, where("sheetCategory", "==", categoryName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
      addLog(`✅ 刪除完成。`);
      fetchExistingCategories();
    } catch (error) {
      addLog(`❌ 刪除失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 上傳 Excel 到 backorders ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
        setSelectedFile(file);
        setLogs([`📄 已選擇檔案：${file.name}`, "👉 請確認無誤後，按下「開始導入」按鈕"]);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setLogs(prev => [...prev, "🚀 開始解析檔案..."]);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        let targetSheetNames = workbook.SheetNames.filter(name => name.includes("團務"));
        if (targetSheetNames.length === 0) targetSheetNames = workbook.SheetNames;
        
        addLog(`📄 鎖定分頁: ${targetSheetNames.join(", ")}`);
        const allOrders = [];

        targetSheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          let headerRowIndex = -1;
          let colMap = {}; 

          for (let i = 0; i < rawData.length; i++) {
            if (JSON.stringify(rawData[i]).includes("團務名稱")) {
              headerRowIndex = i;
              rawData[i].forEach((cell, idx) => {
                  if (typeof cell !== 'string') return;
                  const txt = cell.trim();
                  if (txt.includes("團務名稱")) colMap['title'] = idx;
                  else if (txt.includes("類型")) colMap['type'] = idx;
                  else if (txt.includes("下單") || txt.includes("截止")) colMap['orderDate'] = idx;
                  else if (txt.includes("匯率")) colMap['rate'] = idx;
                  else if (txt.includes("團務狀態")) colMap['status'] = idx;
                  else if (txt.includes("收款進度")) colMap['payProgress'] = idx;
                  else if (txt.includes("收款狀態")) colMap['payStatus'] = idx;
                  else if (txt.includes("連結")) colMap['link'] = idx;
              });
              break;
            }
          }

          if (headerRowIndex === -1) return;

          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!colMap['title'] || !row[colMap['title']]) continue;
            
            let finalStatus = '下單中';
            if (row[colMap['status']] && String(row[colMap['status']]).includes('已結案')) finalStatus = '已結案';

            let rawDate = row[colMap['orderDate']];
            let rawRate = row[colMap['rate']];

            const orderData = {
              title: row[colMap['title']],
              type: row[colMap['type']] || "預購",
              orderDate: rawDate || "",
              rate: parseFloat(rawRate) || 0,
              status: finalStatus,
              paymentStatus: `${row[colMap['payProgress']] || ''} ${row[colMap['payStatus']] || ''}`.trim(),
              link: row[colMap['link']] || "",
              sheetCategory: sheetName,
              createdAt: new Date().toISOString(),
              isArchived: finalStatus === '已結案'
            };
            
            Object.keys(orderData).forEach(key => orderData[key] === undefined && delete orderData[key]);
            allOrders.push(orderData);
          }
        });

        if (allOrders.length === 0) {
            addLog("❌ 抓不到資料");
        } else {
            const collectionRef = collection(db, ...BACKORDERS_PATH);
            const batchSize = 500;
            let successCount = 0;
            for (let i = 0; i < allOrders.length; i += batchSize) {
                const chunk = allOrders.slice(i, i + batchSize);
                await Promise.all(chunk.map(async (order) => {
                    await addDoc(collectionRef, order);
                    successCount++;
                }));
            }
            addLog(`🎉 成功上傳 ${successCount} 筆資料到 backorders！`);
            fetchExistingCategories();
            setSelectedFile(null);
            document.getElementById('file_input').value = ""; 
        }
      } catch (error) {
        addLog(`❌ 錯誤: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // --- 同步 Backorders 到 Groups ---
  const handleSyncToGroups = async () => {
    if (!window.confirm("這將會把「backorders」的資料寫入「groups」資料夾。\n建議先執行下方的「清空 Groups」以避免資料重複。\n\n確定要執行嗎？")) return;

    setLoading(true);
    addLog("🔄 開始同步資料到 Groups...");

    try {
        const sourceRef = collection(db, ...BACKORDERS_PATH);
        const sourceSnap = await getDocs(sourceRef);
        
        if (sourceSnap.empty) {
            addLog("⚠️ backorders 是空的，沒東西可以同步。");
            setLoading(false);
            return;
        }

        const targetRef = collection(db, ...GROUPS_PATH);
        let count = 0;

        const syncPromises = sourceSnap.docs.map(async (sourceDoc) => {
            const src = sourceDoc.data();

            let realRate = src.rate;
            let realDeadline = src.orderDate;

            if ((realRate === 0 || !realRate) && typeof src.orderDate === 'number' && src.orderDate < 1) {
                realRate = src.orderDate; 
                realDeadline = ""; 
            }

            let formattedDeadline = "2025-12-31T23:59";
            if (typeof realDeadline === 'string' && realDeadline.includes('.')) {
                formattedDeadline = realDeadline.replace(/\./g, '-') + "T23:59";
            }

            const groupData = {
                title: src.title,
                exchangeRate: Number(realRate) || 0,
                deadline: formattedDeadline,
                status: "已成團", 
                trackingStatus: src.status || "下單中", 
                paymentStatus: src.paymentStatus || "未收款",
                type: src.type || "預購",
                infoUrl: src.link || "",
                createdBy: "葉葉",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sheetCategory: src.sheetCategory, // 🟢 重要：把來源月份也存進去，方便追蹤
                images: [],
                items: [
                    {
                        id: 1,
                        name: src.title, 
                        spec: "",
                        price: "0", 
                        image: ""
                    }
                ]
            };

            await addDoc(targetRef, groupData);
            count++;
        });

        await Promise.all(syncPromises);
        addLog(`✅ 同步完成！成功發布 ${count} 筆團務到前台。`);
        fetchGroupsCount(); // 更新筆數

    } catch (error) {
        console.error(error);
        addLog(`❌ 同步失敗: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  // 🟢 新增功能：清空 Groups 資料
  const handleClearGroups = async () => {
      const confirmStr = prompt("⚠️ 危險操作！這將會清空「所有」前台的團務資料 (Groups)！\n這通常用於匯入錯誤時的重置。\n\n請輸入 'DELETE' 來確認刪除：");
      
      if (confirmStr !== 'DELETE') {
          if (confirmStr !== null) alert("輸入錯誤，取消操作。");
          return;
      }

      setLoading(true);
      addLog("🔥 正在清空 Groups 資料夾...");

      try {
          const ref = collection(db, ...GROUPS_PATH);
          const snap = await getDocs(ref);
          
          if (snap.empty) {
              addLog("ℹ️ Groups 已經是空的了。");
              setLoading(false);
              return;
          }

          // 批次刪除 (Firestore 限制每次 batch 最多 500 筆)
          const batch = writeBatch(db);
          let count = 0;
          
          snap.forEach(doc => {
              batch.delete(doc.ref);
              count++;
          });
          
          await batch.commit();
          addLog(`✅ 已清空 Groups！共刪除 ${count} 筆資料。`);
          fetchGroupsCount(); // 更新顯示為 0

      } catch (error) {
          addLog(`❌ 清空失敗: ${error.message}`);
      } finally {
          setLoading(false);
      }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">團務系統控制台</h2>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50">← 返回</button>
        </div>

        {/* 步驟一：上傳 */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><UploadCloud/> 步驟 1：匯入 Excel 到暫存區 (Backorders)</h3>
            <div className="flex gap-4 items-end">
                <input id="file_input" type="file" accept=".xlsx, .xls" onChange={handleFileSelect} disabled={loading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                <button onClick={handleStartUpload} disabled={!selectedFile || loading} className={`px-6 py-2 rounded-lg font-bold text-white ${!selectedFile ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>導入暫存</button>
            </div>
        </div>

        {/* 步驟二：管理暫存 */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-yellow-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2">步驟 2：檢查暫存資料</h3>
          <div className="bg-gray-50 rounded-md p-4 max-h-40 overflow-y-auto mb-4">
            {existingCategories.length === 0 ? <p className="text-sm text-gray-400">暫存區是空的</p> : 
                <ul className="space-y-2">
                    {existingCategories.map(cat => (
                        <li key={cat} className="flex justify-between items-center text-sm">
                            <span>{cat}</span>
                            <button onClick={() => handleDeleteCategory(cat)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={14}/> 刪除</button>
                        </li>
                    ))}
                </ul>
            }
          </div>
        </div>

        {/* 步驟三：發布 */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><RefreshCw/> 步驟 3：發布到前台 (Sync to Groups)</h3>
                    <p className="text-sm text-gray-500 mt-1">目前前台 Groups 共有 <span className="font-bold text-green-600">{groupsCount}</span> 筆資料。</p>
                </div>
                <button 
                    onClick={handleSyncToGroups} 
                    disabled={loading || existingCategories.length === 0}
                    className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-transform transform active:scale-95 ${
                        loading || existingCategories.length === 0
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    🚀 執行轉換並發布
                </button>
            </div>
        </div>

        {/* 🔴 危險區域：清空 Groups */}
        <div className="bg-red-50 shadow rounded-lg p-6 border-2 border-red-200">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2"><AlertTriangle/> 危險操作區</h3>
                    <p className="text-sm text-red-600 mt-1">如果發布錯誤，可以在這裡一鍵清空前台 Groups 的所有資料，然後重新發布。</p>
                </div>
                <button 
                    onClick={handleClearGroups} 
                    disabled={loading || groupsCount === 0}
                    className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-colors ${
                        loading || groupsCount === 0
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    🔥 清空 Groups ({groupsCount})
                </button>
            </div>
        </div>

        <div className="bg-black text-green-400 p-4 rounded-lg shadow h-64 overflow-y-auto font-mono text-xs leading-5">
            {logs.length === 0 ? "等待操作..." : logs.map((log, i) => <div key={i} className="border-b border-gray-800 pb-1 mb-1 break-all">{log}</div>)}
        </div>
      </div>
    </div>
  );
};

export default ComplexExcelImport;