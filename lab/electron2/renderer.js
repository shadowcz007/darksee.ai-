const path = require('path');
const clipboardy = require('clipboardy');
const isUrl = require("is-url");


const { ipcRenderer } = require('electron');

const Tagify = require("@yaireo/tagify");
// console.log(Tagify)

const EditorJS = require('@editorjs/editorjs');
const Paragraph = require('@editorjs/paragraph');
const Header = require('@editorjs/header');
const Alert = require('editorjs-alert');
const Checklist = require('@editorjs/checklist');
const SimpleImage = require('@editorjs/simple-image');
const Table = require('editorjs-table');
const AnyButton = require('editorjs-button');


class KnowledgeCard {

    constructor({ config, data }) {
        this.data = data;
        this.cssHead = '.codex-editor .editorjs-knowledge-card';
        this._initCss();
    }

    render() {
        let div = document.createElement("div");
        div.className = 'editorjs-knowledge-card';
        let title = document.createElement("h5");
        title.className = `title`;
        let text = document.createElement("p");
        text.className = `text`;

        div.appendChild(title);
        div.appendChild(text);

        let tagDiv = this._createTagsInput(this.data ? this.data.tags : null);
        div.appendChild(tagDiv);

        title.innerText = this.data && this.data.title ? this.data.title : '';
        text.innerText = this.data && this.data.text ? this.data.text : '';
        div.setAttribute('data-url', this.data && this.data.url ? this.data.url : '');
        div.setAttribute('data-vector', this.data && this.data.vector ? this.data.vector : '');

        return div;
    }
    _createTagsInput(tags) {
            //console.log(tags)
            let div = document.createElement("div");
            div.className = "tags";
            let input = document.createElement("input");
            input.setAttribute("placeholder", 'ffff');
            input.className = "customLook";
            input.value = tags;
            let button = document.createElement("button");
            button.innerText = "+";
            div.appendChild(input);
            div.appendChild(button);

            let tagify = new Tagify(input, {
                whitelist: ['124'],
                callbacks: {
                    "invalid": onInvalidTag
                },
                dropdown: {
                    position: 'text',
                    enabled: 1 // show suggestions dropdown after 1 typed character
                }
            });
            button.addEventListener("click", onAddButtonClick)

            function onAddButtonClick() {
                tagify.addEmptyTag()
            }

            function onInvalidTag(e) {
                console.log("invalid", e.detail)
            }



            return div

        }
        /*
         * 动态添加 CSS 样式
         * @param selector {string} 选择器
         * @param rules    {string} CSS样式规则
         * @param index    {number} 插入规则的位置, 靠后的规则会覆盖靠前的，默认在后面插入
         */
    _addCssRule(selector, rules, index) {
        let that = this;
        index = index || 0;
        // 创建 stylesheet 对象
        var sheet = (() => {
            let id = `${that.cssHead.replace(/\s|\./ig,'')}_style`;
            console.log(id)
            let style = document.head.querySelector(`#${id}`);
            if (!style) {
                style = document.createElement('style');
                style.type = 'text/css';
                style.id = id;
                document.head.appendChild(style);
            };
            return style.sheet;
        })();
        sheet.insertRule(selector + "{" + rules + "}", index);
    };

    _initCss() {

        let id = `${this.cssHead.replace(/\s|\./ig,'')}_style`;
        //console.log(id)
        let style = document.head.querySelector(`#${id}`);

        if (style) return;

        this._addCssRule(`${this.cssHead}`, `
            padding: 12px 24px;
            background-color: #f9f9f9;
            font-family: monospace;
            font-weight: 300;
        `);

        this._addCssRule(`${this.cssHead} .title`,
            `font-size: 12px;
        color: #ababab;
        font-weight: 300;`);

        this._addCssRule(`${this.cssHead} .text`,
            `font-size: 14px;
        margin-bottom: 28px;`);


        this._addCssRule(`${this.cssHead} .customLook`, `
            --tag-bg                  : #0052BF;
            --tag-hover               : #CE0078;
            --tag-text-color          : #FFF;
            --tags-border-color       : silver;
            --tag-text-color--edit    : #111;
            --tag-remove-bg           : var(--tag-hover);
            --tag-pad                 : .6em 1em;
            --tag-inset-shadow-size   : 1.3em;
            --tag-remove-btn-bg--hover: black;

            display: inline-block;
            min-width: 0;
            border: none;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag`, `
            margin-top: 0;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag > div`, `
            border-radius: 25px;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag:only-of-type .tagify__tag__removeBtn`, `
            display: none;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag__removeBtn`, `
            opacity: 0;
            transform: translateX(-6px) scale(.5);
            margin-left: -3ch;
            transition: .12s;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag:hover .tagify__tag__removeBtn`, `
            transform: none;
            opacity: 1;
            margin-left: -1ch;`);
        this._addCssRule(`${this.cssHead} .customLook + button`, `
            color: #0052BF;
            font: bold 1.4em/1.65 Arial;
            border: 0;
            background: none;
            box-shadow: 0 0 0 2px inset currentColor;
            border-radius: 50%;
            width: 1.65em;
            height: 1.65em;
            cursor: pointer;
            outline: none;
            transition: .1s ease-out;
            margin: 0 0 0 5px;
            vertical-align: top;`);
        this._addCssRule(`${this.cssHead} .customLook + button:hover`, `
            box-shadow: 0 0 0 5px inset currentColor;`);
        this._addCssRule(`${this.cssHead} .customLook .tagify__input`, `
        display: none;`);
    }
    save(blockContent) {
        let tags = blockContent.querySelectorAll("tag");
        tags = Array.from(tags, t => t.innerText.trim());
        let { title, text, url, createTime, vector } = this.data;
        // console.log(tags.innerText)
        return {
            title,
            text,
            url,
            createTime,
            vector,
            tags
        }
    }

};





const editor = new EditorJS({
    /**
     * Id of Element that should contain Editor instance
     */
    placeholder: 'Let`s write an awesome story!',
    holder: 'container',
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
    data: (() => {
        let dt = localStorage.getItem("knowledgeCard");
        console.log(dt)
        if (dt) {
            dt = JSON.parse(dt);
            return dt
        } else {
            return {}
        }
    })(),
    onReady: () => {
        console.log('Editor.js is ready to work!')
    }
});


ipcRenderer.on('save-knowledge', (event, arg) => {
    // editor.blocks.insert("paragraph", arg.data);
    editor.blocks.insert('knowledgeCard', arg.data);
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
});

document.querySelector("#save-all").addEventListener("click", async e => {
    e.preventDefault();
    let res = await editor.save();
    localStorage.setItem("knowledgeCard", JSON.stringify(res));
    console.log(res)
})