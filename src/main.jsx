// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ⚠️ 注意：這裡不要再引入 HashRouter 或 BrowserRouter 了
// 因為 App.jsx 裡面已經包過一次了

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 直接渲染 App 即可，不需要再包 Router */}
    <App />
  </React.StrictMode>,
)