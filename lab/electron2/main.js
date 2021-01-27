// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, clipboard, dialog } = require('electron')
const path = require('path');
const fs = require("fs");
const isUrl = require("is-url");
const hash = require('object-hash');

// const tf = require("@tensorflow/tfjs-node")
const _MODEL_AUTOTAGS = path.join(__dirname, "model/auto-tags.json");
const _MODEL_BERT = path.join(__dirname, 'model/bert_zh_L-12_H-768_A-12_2');

const { Bert } = require('bert');
const bert = new Bert({
    modelLocalPath: _MODEL_BERT
});

bert.init();
//
const { textTrain, TextModel, initEmbedding } = require("text-multiclass-classification-tfjs");
initEmbedding(null, bert);
const autoTagsModel = new TextModel(_MODEL_AUTOTAGS);

const Db = require("./src/db");


let mainWindow, spiderWindow;
let width, height;
let appIcon = null;
let spiderUrl = null;

//存储spider到 的知识卡片id
let knowledgeCardDataset = {};

ipcMain.on('open-url', (event, arg) => {
    //console.log(arg) // 
    openUrl(arg.url);
    //event.reply('asynchronous-reply', 'pong')
});

//相似度计算
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

//提前预测
ipcMain.on('bert-init', async(event, arg) => {
    //console.log(arg) // 
    const { text } = arg;
    bert.predictAndStore(text);
});

//保存知识卡片
ipcMain.on('save-knowledge', async(e, arg) => {
    const { text, url, title, tags, urls, images, id, from } = arg;
    let createTime = (new Date()).getTime();
    let data = { tags, text, url, title, images, urls, createTime };
    data.id = hash(data);
    if (knowledgeCardDataset[data.id]) return;
    // if (!isTargetHostNames[from]) {
    //     let isOpen = dialog.showMessageBoxSync(spiderWindow, {
    //         type: "question",
    //         message: "是否收集",
    //         buttons: ["是", "否"]
    //     });
    //     if (isOpen === 0) {
    //         isTargetHostNames[from] = 1;
    //     } else {
    //         isTargetHostNames[from] = 2;
    //     }
    //     isTargetHostNames[from]++;
    let predictTags = await autoTagsModel.predict(text);
    console.log(predictTags)
        // };
        // if (!isTargetHostNames[from]) return;
    knowledgeCardDataset[data.id] = data;
    //data.vector = bert.predictAndStore(text);
    // let tags = ['t1', 't2']
    // Db.add(data);
    mainWindow.webContents.send('save-knowledge', { data: data });
});

//训练打标模型
ipcMain.on('train-text-auto-tags', async(event, arg) => {
    //console.log(arg)
    let dataset = arg.dataset;
    // console.log('dataset', dataset)
    let model = await textTrain.start(dataset, _MODEL_AUTOTAGS)
        //console.log(model)
    mainWindow.webContents.send('train-text-auto-tags-result', { model: model });
});

//自动打标
ipcMain.on('auto-tags', async(event, arg) => {
    //console.log(arg)
    let res = await autoTagsModel.predict(arg.text);
    // event.send
});

//测试
ipcMain.on('test', async(event, arg) => {
    //console.log(arg)
    let res = await autoTagsModel.predict(arg.text);
    console.log(res)
});


function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 860,
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