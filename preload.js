// preload.js - 预加载脚本
// 在渲染进程加载之前执行，可以安全地暴露特定的 Node.js 功能

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 获取应用版本
    getVersion: () => process.versions.electron,
    
    // 获取平台信息
    getPlatform: () => process.platform,
    
    // 判断是否在 Electron 环境中运行
    isElectron: true
});

// 当 DOM 加载完成时
window.addEventListener('DOMContentLoaded', () => {
    console.log('AI协同工作台 - Electron 版本:', process.versions.electron);
    console.log('Node.js 版本:', process.versions.node);
    console.log('Chrome 版本:', process.versions.chrome);
});
