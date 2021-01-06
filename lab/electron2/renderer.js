const path = require('path');
const { ipcRenderer } = require('electron');

const EditorJS = require('@editorjs/editorjs');

const editor = new EditorJS({
    /**
     * Id of Element that should contain Editor instance
     */
    holder: 'container'
});


// (function() {
//     const amdLoader = require("monaco-editor/min/vs/loader");
//     const amdRequire = amdLoader.require;
//     const amdDefine = amdLoader.require.define;


//     function uriFromPath(_path) {
//         var pathName = path.resolve(_path).replace(/\\/g, '/');
//         if (pathName.length > 0 && pathName.charAt(0) !== '/') {
//             pathName = '/' + pathName;
//         }
//         // console.log(pathName)
//         return encodeURI('file://' + pathName);
//     }

//     amdRequire.config({
//         baseUrl: uriFromPath(path.join(__dirname, 'node_modules/monaco-editor/min'))
//     });
//     // console.log(amdRequire)
//     // workaround monaco-css not understanding the environment
//     self.module = undefined;

//     amdRequire(['vs/editor/editor.main'], function() {
//         var editor = monaco.editor.create(document.getElementById('container'), {
//             value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
//             language: 'javascript',
//             theme: "vs-dark"
//         });
//     });
// })();

document.addEventListener('paste', async(event) => {
    var isChrome = false;
    if (event.clipboardData || event.originalEvent) {
        //某些chrome版本使用的是event.originalEvent
        var clipboardData = (event.clipboardData || event.originalEvent.clipboardData);
        if (clipboardData.items) {
            // for chrome
            var items = clipboardData.items,
                len = items.length,
                blob = null;
            isChrome = true;
            for (var i = 0; i < len; i++) {

                if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/plain'))) {
                    items[i].getAsString(function(s) {
                        openUrl(s)
                    })
                } else if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/html'))) {
                    // Drag data item is HTML
                    console.log("... Drop: HTML");
                } else if ((items[i].kind == 'string') &&
                    (items[i].type.match('^text/uri-list'))) {
                    // Drag data item is URI
                    console.log("... Drop: URI");
                } else if ((items[i].kind == 'file') &&
                    (items[i].type.match('^image/'))) {
                    // Drag data item is an image file
                    //图像
                    blob = items[i].getAsFile();
                    console.log("... Drop: File ", blob);
                }
            };

        }
    }
});

function openUrl(url) {
    ipcRenderer.send('open-url', { url: url })
}