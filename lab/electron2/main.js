// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require("fs");
const isUrl = require("is-url");

let mainWindow, spiderWindow;
let width, height;
let appIcon = null;
let spiderUrl = null;

global.mainWindow = null;

ipcMain.on('open-url', (event, arg) => {
    openUrl(arg.url);
});

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 960,
        minWidth: 800,
        minHeight: 600,
        height: parseInt(height * 0.8),
        x: 50,
        y: parseInt(height * 0.1),
        show: false,
        webPreferences: {
            //preload: path.join(__dirname, 'src/preload.js'),
            nodeIntegration: true,
            webSecurity: false,
            // worldSafeExecuteJavaScript: true
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
    mainWindow.webContents.once("dom-ready", (event) => {
        // console.log(event)
        mainWindow.show(true);
    });

    global.mainWindow = mainWindow;
};


function createSpiderWindow() {
    // Create the browser window.
    spiderWindow = new BrowserWindow({
        width: parseInt(width - 960),
        height: parseInt(height * 0.8),
        x: 960,
        y: parseInt(height * 0.1),
        //show: false,
        // closable: true,
        // parent: mainWindow,
        // modal: false,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            webSecurity: false,
            //nodeIntegration: true,
            //worldSafeExecuteJavaScript: true
        }
    });

    // and load the index.html of the app.
    //spiderWindow.loadFile('index.html')
    spiderWindow.webContents.once("dom-ready", (event) => {
        //注入js
        //     spiderWindow.webContents.executeJavaScript(`${selection};
        //    `);
    });
    spiderWindow.webContents.once('did-finish-load', () => {

    })
}

function openUrl(url) {
    console.log(url)
    if (isUrl(url) && url != spiderUrl) {
        let isOpen = dialog.showMessageBoxSync(mainWindow, {
            type: "question",
            message: "是否打开新网站\n" + url,
            buttons: ["是", "否"]
        });
        if (isOpen === 0) {
            if (!spiderWindow || (spiderWindow && spiderWindow.isDestroyed())) createSpiderWindow();
            spiderWindow.loadURL(url);
            spiderUrl = url;
        };
        clipboard.clear();
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createAppIcon();

    var size = screen.getPrimaryDisplay().workAreaSize;
    width = size.width;
    height = size.height;

    createWindow();
    app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
});

app.on('browser-window-focus', (event, window) => {
    // console.log(event, window)
    appIcon.popUpContextMenu();
    let url = clipboard.readText();
    openUrl(url);
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit()
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.