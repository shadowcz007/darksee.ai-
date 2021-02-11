// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require("fs");
const isUrl = require("is-url");
const packageJson = require("./package.json");

//平台
const _IS_MAC = process.platform === 'darwin';


//全局变量
global._WINS = {};
global._READ_WINS = [];

const _PRELOAD_JS = path.join(__dirname, 'src/preload.js');
const _READ_HTML = path.join(__dirname, "src/read.html");
const _K_HTML = path.join(__dirname, "src/knowledge.html");

let appIcon = null;
let spiderUrl = null;


const config = {
    mainWindow: {
        width: 800,
        height: 600,
        minHeight: 400,
        minWidth: 500,
        align: 'topLeft',
        autosize: true,
        title: "实验",
        show: true,
        closable: true,
        resizable: true,
        titleBarStyle: "default",
        html: 'index.html'
    },
    spiderWindow: {
        width: 800,
        height: 600,
        minHeight: 400,
        minWidth: 500,
        align: 'topRight',
        autosize: true,
        title: "预览",
        show: false,
        closable: false,
        resizable: true,
        titleBarStyle: "hiddenInset",
        preload: _PRELOAD_JS
    },
    readWindow: {
        width: 800,
        height: 600,
        minHeight: 400,
        minWidth: 500,
        align: 'topLeft',
        title: "阅读",
        show: false,
        closable: true,
        resizable: true,
        titleBarStyle: "default",
        preload: _PRELOAD_JS
            // html: _READ_HTML
    },
    knowledgeWindow: {
        width: 800,
        height: 600,
        minHeight: 400,
        minWidth: 500,
        align: 'topLeft',
        title: "阅读",
        show: false,
        closable: true,
        resizable: true,
        titleBarStyle: "default",
        html: _K_HTML
    }
}


ipcMain.on('open-url', (event, arg) => {
    openUrl(arg.url);
});


function createWindow(opts, workAreaSize) {
    // 创建GUI窗口
    const win = new BrowserWindow({
        width: opts.autosize === true ? parseInt(workAreaSize.width * 0.9) : opts.width,
        height: opts.autosize === true ? workAreaSize.height : opts.height,
        minHeight: opts.minHeight,
        minWidth: opts.minWidth,
        x: opts.align == "topRight" ? workAreaSize.width - opts.width : 0,
        y: 0,
        title: opts.title || "-",
        show: false,
        closable: opts.closable,
        resizable: opts.resizable,
        titleBarStyle: opts.titleBarStyle,
        webPreferences: {
            preload: opts.preload || "",
            //开启nodejs支持
            nodeIntegration: true,
            //开启AI功能
            experimentalFeatures: true,
            //开启渲染进程调用remote
            enableRemoteModule: true
        }
    });

    // 加载xxx.html
    if (opts.html && opts.html.match("https://")) {
        win.loadURL(opts.html);
    } else if (opts.html) {
        win.loadFile(opts.html);
    }

    // 打开调试工具
    if (process.env.NODE_ENV === 'development') win.webContents.openDevTools();
    // console.log(opts)
    win.webContents.once("dom-ready", () => {
        opts.show === true ? win.show() : null;
        opts.executeJavaScript ? win.webContents.executeJavaScript(opts.executeJavaScript, false) : null;
    });
    win.on("closed", () => {
        for (const key in global._WINS) {
            global._WINS[key].destroy()
        };
        app.quit();
    });
    // global._WINS[key] = win;
    return win;
};


function initWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    config.mainWindow.height = workAreaSize.height;
    config.mainWindow.width = parseInt(workAreaSize.width * 0.8);
    for (const key in config) {
        if (!global._WINS[key]) global._WINS[key] = createWindow(config[key], workAreaSize);
    };
};



function openUrl(url) {
    if (isUrl(url) && url != spiderUrl) {
        let isOpen = dialog.showMessageBoxSync(global._WINS.mainWindow, {
            type: "question",
            message: "是否打开新网站\n" + url,
            buttons: ["是", "否"]
        });
        if (isOpen === 0) {
            global._WINS.spiderWindow.loadURL(url);
            global._WINS.spiderWindow.webContents.once("dom-ready", () => {
                global._WINS.spiderWindow.show();
            });
            global._WINS.mainWindow.hide();
            spiderUrl = url;
        };
        clipboard.clear();
    };

    if (isUrl(url) && url === global._WINS.spiderWindow.getURL()) {
        let isOpen = dialog.showMessageBoxSync(global._WINS.mainWindow, {
            type: "question",
            message: "是否打开网站\n" + url,
            buttons: ["是", "否"]
        });
        if (isOpen === 0) {
            global._WINS.spiderWindow.show();
            global._WINS.mainWindow.hide();
        }

    }

}

function createAppIcon() {
    appIcon = new Tray(path.join(__dirname, "assets/appIcon.png"));
    const contextMenu = Menu.buildFromTemplate([
        { label: '收集', type: 'radio' },
        { label: '调取', type: 'radio' }
    ]);

    // Make a change to the context menu
    contextMenu.items[0].checked = false;
    // Call this again for Linux because we modified the context menu
    appIcon.setContextMenu(contextMenu);
    appIcon.setToolTip('知识引擎');

}


function initMenu() {

    const template = [
        // { role: 'appMenu' }
        ...(_IS_MAC ? [{
            label: packageJson.name,
            submenu: [
                // {
                //     label: '关于',
                //     click: () =>
                //     openAboutWindow({
                //         icon_path: path.join(__dirname, 'logo.png'),
                //         product_name: '知识引擎',
                //         copyright: 'Copyright (c) 2021 shadow',
                //         adjust_window_size: true,
                //         bug_link_text: "反馈bug",
                //         package_json_dir: __dirname,
                //         open_devtools: process.env.NODE_ENV === 'development',
                //         css_path: path.join(__dirname, 'src/style.css'),
                //     }),
                // },
                { type: 'separator' },
                // {
                //     label: '反馈',
                //     click: async() => {
                //         const { shell } = require('electron')
                //         await shell.openExternal('https://electronjs.org')
                //     }
                // },
                // { type: 'separator' },
                // { role: 'hide' },
                // { role: 'hideothers' },
                // { role: 'unhide' },
                // { type: 'separator' },
                { role: 'quit', label: '退出' }
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: '文件',
            submenu: [{
                    label: '打开',
                    accelerator: 'CmdOrCtrl+O',
                    click: openFile
                },
                {
                    label: '新建',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => global._WINS.mainWindow.webContents.send('new-file')
                },
                {
                    label: '另存为',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => global._WINS.mainWindow.webContents.send('save-file')
                },
                { type: 'separator' },
                {
                    label: '管理知识库',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => global._WINS.knowledgeWindow.webContents.send('open')
                },
                { type: 'separator' },
                {
                    label: '发布',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => global._WINS.mainWindow.webContents.send('public-file')
                },
                { type: 'separator' },
                {
                    label: '关闭',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => global._WINS.mainWindow.webContents.send('close-file')
                }
            ]
        },
        //{ role: 'editMenu' },
        {
            //role: 'editMenu',
            label: '编辑',
            submenu: [{
                    label: '撤销',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: '重做',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo'
                },
                {
                    type: 'separator'
                },
                {
                    label: '剪切',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: '拷贝',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: '粘贴',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                {
                    label: '全选',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall'
                },
            ]
        },
        // {
        //     label: '模式',
        //     submenu: modeMenu.items
        // },
        // {
        //     role: 'windowMenu'
        // },
        {
            label: '窗口',
            role: 'window',
            submenu: [{
                label: '最小化',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            }]
        },
        {
            role: 'help',
            label: '帮助',
            submenu: [{
                label: 'Learn More',
                click: async() => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                }
            }]
        }
    ]

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

};

function openFile() {
    // console.log(arg)
    dialog.showOpenDialog({
        title: '打开',
        filters: [
            { name: '文件', extensions: ['pdf', 'jpg', 'png', 'gif'] }
        ],
        buttonLabel: '确定',
        properties: ['openFile'],
        message: '打开文件'
    }).then(result => {
        // console.log(result.canceled)
        if (result.filePaths.length > 0) {
            const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
            let opts = Object.assign(config.readWindow, {
                html: _READ_HTML,
                show: true,
                executeJavaScript: `loadDoc('${result.filePaths[0]}');`
            })
            global._READ_WINS.push(createWindow(opts, workAreaSize));

        }
    }).catch(err => {
        console.log(err)
    })
}



app.whenReady().then(() => {
    createAppIcon();
    initMenu();
    initWindow();
    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) initWindow();
    })
});

app.on('browser-window-focus', (event, window) => {
    //appIcon.popUpContextMenu();
    openUrl(clipboard.readText());
})


app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit()
});