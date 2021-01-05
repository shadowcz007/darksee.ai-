// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// const tf = require("@tensorflow/tfjs-node")
//     // console.log(tf)
const { Bert } = require('bert');
const bert = new Bert({
    modelLocalPath: path.join(__dirname, 'model/bert_zh_L-12_H-768_A-12_2')
});

bert.init();


let mainWindow;

ipcMain.on('open-url', (event, arg) => {
    console.log(arg) // 
    mainWindow.loadURL(arg.url);
    //event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('bert-similar', (event, arg) => {
    console.log(arg.text) // 
    let res = bert.predict(arg.text);
    res = res.dataSync();
    console.log(res)
    event.reply('bert-similar-reply', res);
});





function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
    mainWindow.webContents.once("dom-ready", (event) => {
        console.log(event)
            // mainWindow.webContents.executeJavaScript(`

        // `, true)
        //     .then((result) => {
        //         console.log(result) // Will be the JSON object from the fetch call
        //     })

    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

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