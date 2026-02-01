// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // <--- CHỈ GIỮ LẠI DÒNG NÀY

// XÓA dòng này nếu có để tránh xung đột:
// import '../style/globals.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)