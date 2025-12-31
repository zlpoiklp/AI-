const { app, BrowserWindow, Menu, shell, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时窗口自动关闭
let mainWindow;

// 默认窗口配置
const defaultWindowConfig = {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined
};

// 加载窗口配置
function loadWindowConfig() {
    try {
        const configPath = path.join(app.getPath('userData'), 'window-config.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            return { ...defaultWindowConfig, ...JSON.parse(data) };
        }
    } catch (e) {
        console.error('Failed to load window config:', e);
    }
    return defaultWindowConfig;
}

// 保存窗口配置
function saveWindowConfig() {
    try {
        if (!mainWindow) return;
        const bounds = mainWindow.getBounds();
        const configPath = path.join(app.getPath('userData'), 'window-config.json');
        fs.writeFileSync(configPath, JSON.stringify({
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: mainWindow.isMaximized()
        }));
    } catch (e) {
        console.error('Failed to save window config:', e);
    }
}

function createWindow() {
    const windowConfig = loadWindowConfig();
    
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: windowConfig.width,
        height: windowConfig.height,
        x: windowConfig.x,
        y: windowConfig.y,
        minWidth: 1000,
        minHeight: 600,
        icon: path.join(__dirname, 'icons', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // 允许跨域请求（用于调用各种AI API）
            webSecurity: false
        },
        // 窗口样式
        backgroundColor: '#111827',
        titleBarStyle: 'default',
        show: false, // 先隐藏，等加载完成后显示
        // 确保窗口按钮显示
        frame: true,
        autoHideMenuBar: false
    });
    
    // 如果上次是最大化状态，恢复最大化
    if (windowConfig.isMaximized) {
        mainWindow.maximize();
    }

    // 加载index.html
    mainWindow.loadFile('index.html');

    // 窗口准备好后显示，避免白屏闪烁
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 打开外部链接时使用默认浏览器
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // 窗口关闭前保存配置
    mainWindow.on('close', () => {
        saveWindowConfig();
    });
    
    // 窗口关闭时触发
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // 窗口大小改变时保存（防抖）
    let resizeTimeout;
    mainWindow.on('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(saveWindowConfig, 500);
    });
    
    // 窗口移动时保存（防抖）
    let moveTimeout;
    mainWindow.on('move', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(saveWindowConfig, 500);
    });

    // 创建菜单
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '新建对话',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('newChat()');
                    }
                },
                { type: 'separator' },
                {
                    label: '设置',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('openSettings()');
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '切换侧边栏',
                    accelerator: 'CmdOrCtrl+\\',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('toggleSidebar()');
                    }
                },
                {
                    label: '切换共用背景',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('toggleSharedBg()');
                    }
                },
                { type: 'separator' },
                { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
                { type: 'separator' },
                { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
                { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { type: 'separator' },
                { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        },
        {
            label: '对话',
            submenu: [
                {
                    label: '停止所有回复',
                    accelerator: 'Escape',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('stopAllResponses()');
                    }
                },
                { type: 'separator' },
                {
                    label: '清空当前对话',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('newChat()');
                    }
                },
                {
                    label: '清空所有历史',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('clearAllHistory()');
                    }
                }
            ]
        },
        {
            label: '开发',
            submenu: [
                { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于 AI协同工作台',
                            message: 'AI协同工作台 v1.0.0',
                            detail: '同时调用多个AI模型，进行对比分析和协同工作。\n\n支持：OpenAI、Anthropic、Google、DeepSeek、通义千问、智谱AI、硅基流动、字节豆包、OpenRouter 等服务商。'
                        });
                    }
                }
            ]
        }
    ];

    // macOS 特殊处理
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { label: '关于', role: 'about' },
                { type: 'separator' },
                { label: '服务', role: 'services' },
                { type: 'separator' },
                { label: '隐藏', accelerator: 'Command+H', role: 'hide' },
                { label: '隐藏其他', accelerator: 'Command+Alt+H', role: 'hideOthers' },
                { label: '显示全部', role: 'unhide' },
                { type: 'separator' },
                { label: '退出', accelerator: 'Command+Q', role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Electron 初始化完成后创建窗口
app.whenReady().then(() => {
    createWindow();

    // macOS 点击 dock 图标时重新创建窗口
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('will-quit', () => {
    // 注销所有快捷键
    globalShortcut.unregisterAll();
});
