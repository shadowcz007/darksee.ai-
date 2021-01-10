// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, clipboard, dialog } = require('electron')
const path = require('path');
const fs = require("fs");
const isUrl = require("is-url");


// const tf = require("@tensorflow/tfjs-node")
//     // console.log(tf)
const { Bert } = require('bert');
const bert = new Bert({
    modelLocalPath: path.join(__dirname, 'model/bert_zh_L-12_H-768_A-12_2')
});

bert.init();


let mainWindow, spiderWindow;
let width, height;
let appIcon = null;
let spiderUrl = null;

ipcMain.on('open-url', (event, arg) => {
    //console.log(arg) // 
    openUrl(arg.url);
    //event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('bert-similar', async(event, arg) => {
    //console.log(arg) // 
    const { target, texts } = arg;

    let res = await bert.textsRank(target, Array.from(texts, t => t.text));
    let newTexts = [];
    // console.log(res)
    Array.from(res, r => {
        // console.log(r, texts)
        newTexts.push({
            text: texts[r.index].text,
            id: texts[r.index].id,
            score: r.score
        })
    });
    spiderWindow.webContents.send('bert-similar-reply', { result: newTexts });
});

ipcMain.on('bert-init', async(event, arg) => {
    //console.log(arg) // 
    const { text } = arg;
    bert.predictAndStore(text);
});

ipcMain.on('save-knowledge', (e, arg) => {
    const { text, url, title, tags, urls, images, id } = arg;
    let vector = bert.predictAndStore(text);
    // let tags = ['t1', 't2']
    let createTime = (new Date()).getTime();
    mainWindow.webContents.send('save-knowledge', { data: { tags, text, url, title, images, urls, vector, createTime } });
});

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 860,
        height: parseInt(height * 0.8),
        x: 50,
        y: parseInt(height * 0.1),
        show: false,
        webPreferences: {
            //preload: path.join(__dirname, 'preload.js'),
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
            preload: path.join(__dirname, 'preload.js'),
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
        { label: 'Item1', type: 'radio' },
        { label: 'Item2', type: 'radio' }
    ]);

    // Make a change to the context menu
    contextMenu.items[1].checked = false;
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