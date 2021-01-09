// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path');
const fs = require("fs");


// const tf = require("@tensorflow/tfjs-node")
//     // console.log(tf)
const { Bert } = require('bert');
const bert = new Bert({
    modelLocalPath: path.join(__dirname, 'model/bert_zh_L-12_H-768_A-12_2')
});

bert.init();


let mainWindow, spiderWindow;
let width, height;

ipcMain.on('open-url', (event, arg) => {
    console.log(arg) // 
    if (!spiderWindow || (spiderWindow && spiderWindow.isDestroyed())) createSpiderWindow();
    spiderWindow.loadURL(arg.url);
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
    const { text, url, title } = arg;
    let vector = bert.predictAndStore(text);
    let tags = ['t1', 't2']
    let createTime = (new Date()).getTime();
    mainWindow.webContents.send('save-knowledge', { data: { tags, text, url, title, vector, createTime } });
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
        closable: true,
        parent: mainWindow,
        modal: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    var size = screen.getPrimaryDisplay().workAreaSize;
    width = size.width;
    height = size.height;

    createWindow();

    app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.