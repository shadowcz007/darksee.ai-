const path = require('path');
const { ipcRenderer, clipboard } = require('electron');
const hash = require('object-hash');

// window.tfjs = require('@tensorflow/tfjs')
const _MODEL_AUTOTAGS = path.join(__dirname, "model/auto-tags.json");
const _MODEL_BERT = path.join(__dirname, 'model/bert_zh_L-12_H-768_A-12_2');
// console.log(_MODEL_BERT)
const { Bert } = require('bert');
const bert = new Bert({
    modelLocalPath: _MODEL_BERT
});
bert.init();


const { textTrain, TextModel, initEmbedding } = require("text-multiclass-classification-tfjs");
initEmbedding(null, bert);
const autoTagsModel = new TextModel(_MODEL_AUTOTAGS);

const Db = require("./src/db");



//相似度排序
async function bertSimilar(arg) {
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
    return newTexts
        //spiderWindow.webContents.send('bert-similar-reply', { result: newTexts });
}
//提前预测
function bertInit(arg) {
    //console.log(arg) // 
    const { text } = arg;
    bert.predictAndStore(text);
}



//训练打标模型
async function trainTextAutoTags(arg) {
    let dataset = arg.dataset;
    let model = await textTrain.start(dataset, _MODEL_AUTOTAGS)
    mainWindow.webContents.send('train-text-auto-tags-result', { model: model });
};


//自动打标
async function autoTags(arg) {
    //console.log(arg)
    let res = await autoTagsModel.predict(arg.text);
    // event.send
};


const EditorJS = require('@editorjs/editorjs');
const Paragraph = require('@editorjs/paragraph');
const Header = require('@editorjs/header');
const Alert = require('editorjs-alert');
const Checklist = require('@editorjs/checklist');
const SimpleImage = require('@editorjs/simple-image');
const Table = require('editorjs-table');
const AnyButton = require('editorjs-button');

const KnowledgeCard = require("./src/editorjs-knowledge-card");
// console.log(KnowledgeCard)
const Pagination = require('./src/editorjs-pagination');
const { rejects } = require('assert');

let pagination = new Pagination({
    dbName: 'knowledgeCard'
});

const editor = new EditorJS({
    /**
     * Id of Element that should contain Editor instance
     */
    placeholder: '属于你的知识库',
    holder: 'container',
    autofocus: true,
    tools: {
        knowledgeCard: KnowledgeCard,
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
    data: pagination.load(),
    onReady: () => {
        console.log('Editor.js is ready to work!')
    },
    onChange: () => { console.log('Now I know that Editor\'s content changed!') }
});


let saveKs = [];

class Knowledge {
    constructor(datas) {
            //存储spider到 的知识卡片id
            this.knowledgeCardDataset = {};

            this.datas = datas || [];
            this.time = (new Date()).getTime();
            this.running = false;
            // this.saveKnowledgeBatch();
        }
        //保存知识卡片
    save(arg) {
        return new Promise((resolve, reject) => {
            const { text, url, title, tags, urls, images, id, from } = arg;
            let createTime = (new Date()).getTime();
            let data = { tags, text, url, title, images, urls, createTime };
            data.id = hash(data);
            if (this.knowledgeCardDataset[data.id]) return;
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
            autoTagsModel.predict(text).then((predictTags) => {
                // console.log(predictTags)
                data.tags.push({
                    value: predictTags,
                    type: 1
                });
                // };
                // if (!isTargetHostNames[from]) return;
                this.knowledgeCardDataset[data.id] = data;
                //data.vector = bert.predictAndStore(text);
                // let tags = ['t1', 't2']
                //存储到数据库
                // Db.add(data);
                if ((Object.keys(this.knowledgeCardDataset)).length % 100 === 0) Db.export();
                resolve(data);
            });
        })
    }
    add(topic) {
        this.datas.push(topic);
        // this.running = false;
        this.saveKnowledgeBatch();
    }
    saveKnowledgeBatch() {
        if (this.datas.length == 0) return;
        if (this.running == true) return setTimeout(() => { this.saveKnowledgeBatch(); }, 500);;
        // if (this.datas.length < 10) return;
        let topic = this.datas.pop();
        if (topic) {
            this.running = true;
            this.save(topic).then(data => {
                editor.blocks.insert('knowledgeCard', data);
                if ((new Date()).getTime() - this.time < 500) {
                    setTimeout(() => {
                        this.saveKnowledgeBatch();
                    }, 500);
                } else {
                    this.saveKnowledgeBatch();
                };
                this.running = false;
                this.time = (new Date()).getTime();
            });
        }
    };
}

const kg = new Knowledge();

ipcRenderer.on('save-knowledge', (event, arg) => {
    // console.log(arg)
    kg.add(arg);
});
ipcRenderer.on('save-knowledge-ready', (event, arg) => {
    // editor.blocks.insert("paragraph", arg.data);
    //editor.blocks.insert('knowledgeCard', arg.data);
    console.log(arg)
});

ipcRenderer.on('train-text-auto-tags-result', (event, arg) => {
    // editor.blocks.insert("paragraph", arg.data);
    //editor.blocks.insert('knowledgeCard', arg.data);
    console.log(arg)
});
window._test = function(text) {
        ipcRenderer.send('test', { text: text });
    }
    // window.Scrollbar = Scrollbar;



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

// document.addEventListener('paste', async(event) => {
//     var isChrome = false;
//     if (event.clipboardData || event.originalEvent) {
//         //某些chrome版本使用的是event.originalEvent
//         var clipboardData = (event.clipboardData || event.originalEvent.clipboardData);
//         if (clipboardData.items) {
//             // for chrome
//             var items = clipboardData.items,
//                 len = items.length,
//                 blob = null;
//             isChrome = true;
//             for (var i = 0; i < len; i++) {

//                 if ((items[i].kind == 'string') &&
//                     (items[i].type.match('^text/plain'))) {
//                     items[i].getAsString(function(s) {
//                         openUrl(s)
//                     })
//                 } else if ((items[i].kind == 'string') &&
//                     (items[i].type.match('^text/html'))) {
//                     // Drag data item is HTML
//                     console.log("... Drop: HTML");
//                 } else if ((items[i].kind == 'string') &&
//                     (items[i].type.match('^text/uri-list'))) {
//                     // Drag data item is URI
//                     console.log("... Drop: URI");
//                 } else if ((items[i].kind == 'file') &&
//                     (items[i].type.match('^image/'))) {
//                     // Drag data item is an image file
//                     //图像
//                     blob = items[i].getAsFile();
//                     console.log("... Drop: File ", blob);
//                 }
//             };

//         }
//     }
// });

// function openUrl(url) {
//     ipcRenderer.send('open-url', { url: url });
// };

// document.querySelector("#get-clipboard").addEventListener("click", e => {
//     e.preventDefault();
//     let url = clipboard.readText();
//     openUrl(url);
// });

document.querySelector("#save-all").addEventListener("click", async e => {
    e.preventDefault();
    let res = await editor.save();
    localStorage.setItem("knowledgeCard", JSON.stringify(res));
    console.log(res)
})

document.querySelector("#train").addEventListener("click", async e => {
    e.preventDefault();
    let res = await editor.save();
    let blocks = res.blocks.filter(b => b.type == "knowledgeCard");
    // console.log(blocks)
    let dataset = [];
    Array.from(blocks, b => {
        b.data.tags.forEach(t => {
            dataset.push({
                label: t.value,
                text: b.data.text.replace(/\s|\n/ig, "")
            })
        })
    })
    console.log(dataset)
    ipcRenderer.send('train-text-auto-tags', { dataset: dataset });
});