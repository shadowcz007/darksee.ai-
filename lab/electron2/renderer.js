const path = require('path');
const clipboardy = require('clipboardy');
const isUrl = require("is-url");


const { ipcRenderer } = require('electron');


const EditorJS = require('@editorjs/editorjs');
const Paragraph = require('@editorjs/paragraph');
const Header = require('@editorjs/header');
const Alert = require('editorjs-alert');
const Checklist = require('@editorjs/checklist');
const SimpleImage = require('@editorjs/simple-image');
const Table = require('editorjs-table');
const AnyButton = require('editorjs-button');


class Test {

    constructor({ config, data }) {
        this.data = data;
    }

    render() {
        let div = document.createElement("div");
        let title = document.createElement("h5");
        let text = document.createElement("p");

        let input = document.createElement("input");
        input.setAttribute("placeholder", 'ffff');
        div.appendChild(title);
        div.appendChild(text);

        div.appendChild(input);
        title.innerText = this.data && this.data.title ? this.data.title : '';
        text.innerText = this.data && this.data.text ? this.data.text : '';
        div.setAttribute('data-url', this.data && this.data.url ? this.data.url : '');
        div.setAttribute('data-vector', this.data && this.data.vector ? this.data.vector : '');
        return div;
    }
    save(blockContent) {
        console.log(blockContent)
        return {
            title: blockContent,
            text: "",
            url: "",
            createTime: "",
            vector: ""
        }
    }

}

const editor = new EditorJS({
    /**
     * Id of Element that should contain Editor instance
     */
    placeholder: 'Let`s write an awesome story!',
    holder: 'container',
    tools: {
        test: Test,
        header: {
            class: Header,
            shortcut: 'CMD+SHIFT+H',
            config: {
                placeholder: 'Enter a header',
                levels: [2, 3, 4],
                defaultLevel: 3
            }
        },
        paragraph: {
            class: Paragraph,
            inlineToolbar: true,
        },
        alert: {
            class: Alert,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+A',
            config: {
                defaultType: 'primary',
                messagePlaceholder: 'Enter something',
            },
        },
        checklist: {
            class: Checklist,
            inlineToolbar: true,
        },
        image: SimpleImage,
        table: {
            class: Table,
            inlineToolbar: true,
            config: {
                rows: 2,
                cols: 3,
            },
        },
        anyButton: {
            class: AnyButton,
            inlineToolbar: false,
            config: {
                css: {
                    "btnColor": "btn--gray",
                }
            }
        },
    },
    onReady: () => {
        console.log('Editor.js is ready to work!')
    }
});


ipcRenderer.on('save-knowledge', (event, arg) => {
    // editor.blocks.insert("paragraph", arg.data);
    editor.blocks.insert('test', arg.data);
    console.log(arg)
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
    if (isUrl(url)) ipcRenderer.send('open-url', { url: url });
    return isUrl(url)
};

document.querySelector("#get-clipboard").addEventListener("click", e => {
    e.preventDefault();
    let url = clipboardy.readSync();
    openUrl(url);
})