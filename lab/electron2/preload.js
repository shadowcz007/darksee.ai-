// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron');


window.addEventListener('DOMContentLoaded', () => {
    console.log(document.body.innerText)
    ipcRenderer.send('bert-similar', { text: document.body.innerText })
})