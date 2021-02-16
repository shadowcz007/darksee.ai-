const path = require('path');
const { ipcRenderer, clipboard, remote } = require('electron');
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


let mainWindow = (remote.getGlobal("_WINS")).mainWindow,
    spiderWindow = (remote.getGlobal("_WINS")).spiderWindow;

const { textTrain, TextModel, initEmbedding } = require("text-multiclass-classification-tfjs");
initEmbedding(null, bert);
const autoTagsModel = new TextModel(_MODEL_AUTOTAGS);

const Db = require("./src/db");
const search = require('./src/search');
window.search = search;

document.getElementById("info").innerText = `知识卡数量${Db.size()}`;


/**
 * 知识模型
 */
class KnowledgeModel {
    //相似度排序
    async bertSimilar(arg) {
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
    bertInit(text) {
        bert.predictAndStore(text);
    }

    //训练打标模型
    async trainTextAutoTags(dataset) {
        if (!dataset) return
            //自动更新到本地
        this.model = await textTrain.start(dataset, _MODEL_AUTOTAGS)
    };

    //自动打标
    async autoTags(text) {
        let res = await autoTagsModel.predict(text, 8);
        return res
    };
}

const kmodel = new KnowledgeModel();


const EditorJS = require('@editorjs/editorjs');
const Paragraph = require('@editorjs/paragraph');
const Header = require('@editorjs/header');
const Alert = require('editorjs-alert');
const Checklist = require('@editorjs/checklist');
const SimpleImage = require('@editorjs/simple-image');
const Table = require('editorjs-table');

const KnowledgeCard = require("./src/editorjs-knowledge-card");
KnowledgeCard.prototype.onSearchBtnEvent = function(e) {
    console.log(e)
}


const Pagination = require('./src/editorjs-pagination');

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
        knowledgeCard: {
            class: KnowledgeCard,
            inlineToolbar: true
        },
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

    },
    data: pagination.load(),
    onReady: () => {
        console.log('Editor.js is ready to work!')
    },
    onChange: (e) => {
        console.log('Now I know that Editor\'s content changed!', e);

    }
});



let saveKs = [];

class Knowledge {
    constructor(datas) {
            //存储spider到 的知识卡片id
            this.knowledgeCardDataset = {};

            this.datas = datas || [];
            this.time = (new Date()).getTime();
            this.running = false;
            this.timeout = 1000;
            // this.saveBatch();
        }
        //保存知识卡片
    save(arg) {
        return new Promise((resolve, reject) => {
            const { text, tags, urls, images, id, from } = arg;
            let createTime = (new Date()).getTime();
            let data = { tags, text, images, urls, createTime };
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
            kmodel.autoTags(text).then((predictTags) => {
                data.tags.push({
                    value: predictTags,
                    type: 1
                });

                this.knowledgeCardDataset[data.id] = data;

                //存储到数据库
                Db.add(data);
                if ((Object.keys(this.knowledgeCardDataset)).length % 100 === 0) Db.export();
                resolve(data);
            });
        })
    }
    add(topic) {
        this.datas.push(topic);
        // this.running = false;
        this.saveBatch();
    }
    saveBatch() {
        if (this.datas.length == 0) return;
        if (this.running == true) return setTimeout(() => { this.saveBatch(); }, this.timeout);;
        // if (this.datas.length < 10) return;
        let topic = this.datas.pop();
        if (topic) {
            this.running = true;
            this.save(topic).then(data => {
                editor.blocks.insert('knowledgeCard', data);
                if ((new Date()).getTime() - this.time < this.timeout) {
                    setTimeout(() => {
                        this.saveBatch();
                    }, this.timeout);
                } else {
                    this.saveBatch();
                };
                this.running = false;
                this.time = (new Date()).getTime();
            });
        }
    };
}


//知识，控制处理频率
const kg = new Knowledge();

//收集知识，接受
ipcRenderer.on('save-knowledge', (event, arg) => {
    mainWindow = mainWindow || (remote.getGlobal("_WINS")).mainWindow;
    spiderWindow = spiderWindow || (remote.getGlobal("_WINS")).spiderWindow;
    mainWindow.show();
    spiderWindow.hide();
    kg.add(arg);
});

// ipcRenderer.on('open-file', (event, arg) => {
//     // console.log(arg)
//     remote.dialog.showOpenDialog({
//         title: '打开',
//         filters: [
//             { name: '文件', extensions: ['pdf', 'jpg', 'png', 'gif'] }
//         ],
//         buttonLabel: '确定',
//         properties: ['openFile'],
//         message: '打开文件'
//     }).then(result => {
//         // console.log(result.canceled)
//         if(result.filePaths.length>0){

//         }
//     }).catch(err => {
//         console.log(err)
//     })
// });


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





class GUI {
    constructor() {
        this.searchInput = document.querySelector('#search-input');
        this.addBtn = document.querySelector('#add-btn');
        this.newBtn = document.querySelector('#new-btn');
        this.saveBtn = document.querySelector("#save-all-btn");
        this.trainBtn = document.querySelector("#train-btn");

        this.publicBtn = document.querySelector('#public-btn');

        // document.querySelector("#get-clipboard")

        this.keyword = null;

        this.init();
    }
    init() {

        this.addClickEvent(this.addBtn, e => this.searchKnowledgeAndInsert());

        this.addClickEvent(this.newBtn, e => {
            if (this.keyword) editor.clear();
            this.searchKnowledgeAndInsert();
        });

        this.addClickEvent(this.saveBtn, e => this.saveKnowledgeSet());

        this.addClickEvent(this.trainBtn, e => this.train());

        this.addClickEvent(this.publicBtn, e => this.public());

    }

    public() {
        let data = editor.save();
        console.log(data)
    }

    getKeyword() {
        this.keyword = this.searchInput.value.trim();
        console.log(this.keyword)
    }

    openFromClipboard() {
        let url = clipboard.readText();
        this.openUrl(url.trim());
    }
    openUrl(url) {
        ipcRenderer.send('open-url', { url: url });
    }

    async train() {
            let data = Db.all();
            // let res = await editor.save();
            // let blocks = res.blocks.filter(b => b.type == "knowledgeCard");
            // // console.log(blocks)
            let dataset = [];
            Array.from(data, d => {
                d.tags.forEach(t => {
                    if (t.type === 0) dataset.push({
                        label: t.value,
                        text: d.text.replace(/\s|\n/ig, "")
                    })
                })
            })
            console.log(dataset)
            kmodel.trainTextAutoTags(dataset);
            // ipcRenderer.send('train-text-auto-tags', { dataset: dataset });
        }
        //保存知识卡
    saveKnowledgeCard() {

        }
        //保存知识集合
    async saveKnowledgeSet() {
            // TODO dialog.save file
            let res = await editor.save();
            localStorage.setItem("knowledgeCard", JSON.stringify(res));
            console.log(res)
        }
        //搜索知识
    searchKnowledgeAndInsert() {
        this.getKeyword();
        if (this.keyword) {
            search.find(this.keyword).then(res => {
                console.log(res)
                Array.from(res, r => {
                    editor.blocks.insert('knowledgeCard', r);
                });
            });
        }
    }
    addClickEvent(dom, fn, event = 'click') {
        dom.addEventListener(event, e => {
            e.stopPropagation();
            e.preventDefault();
            fn(e);
        });
    }
}

const gui = new GUI();


const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const init = async() => {

    const server = new Hapi.Server({
        port: 3000,
        routes: {
            files: {
                relativeTo: path.join(__dirname, 'src')
            }
        }
    });

    await server.register(Inert);

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true
            }
        }
    });

    await server.start();

    console.log('Server running at:', server.info.uri);
};

init();