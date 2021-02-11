// const css = require('viewerjs/dist/viewer.css');
const Viewer = require('viewerjs')
const path = require("path"),
    fs = require("fs");
let viewerCss = fs.readFileSync(path.join(__dirname, "../node_modules/viewerjs/dist/viewer.css"));
viewerCss = window.URL.createObjectURL(new Blob([viewerCss], { type: "text/css" }));


const _createTagsInput = require("./tags");
// console.log(viewerCss)


class KnowledgeCard {

    constructor({ config, data }) {
        this.data = data;
        this.cssHead = '.codex-editor .editorjs-knowledge-card';
        this._initCss();


        if ((Array.from(document.head.querySelectorAll("link"), n => n.href).filter(f => f == viewerCss)).length == 0) {
            let link = document.createElement("link");
            link.href = viewerCss
            link.setAttribute("type", "text/css")
            link.setAttribute("rel", "stylesheet")
            document.head.appendChild(link)
        }

    }

    static get toolbox() {
        return {
            title: 'Knowledge',
            icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 30zm0 52l-43-30-56 30-81-67-66 39v23c0 19 15 34 34 34h178c17 0 31-13 34-29zM79 0h178c44 0 79 35 79 79v118c0 44-35 79-79 79H79c-44 0-79-35-79-79V79C0 35 35 0 79 0z"/></svg>'
        };
    }

    render() {

        let div = document.createElement("div");
        div.className = 'editorjs-knowledge-card';

        if (!this.data) return div;

        let { text, images, urls, tags } = this.data;


        if (text) {
            let textDom = document.createElement("p");
            textDom.className = `text`;
            textDom.setAttribute("contenteditable", true);
            textDom.innerText = text || '';
            div.appendChild(textDom);
        };

        if (images) {
            let imagesDom = document.createElement('div');
            imagesDom.className = "images";
            imagesDom.appendChild(this._createImages(images));
            this.gallery = new Viewer(imagesDom);
            div.appendChild(imagesDom);
        };

        if (urls) {
            Array.from(urls || [], u => {
                let url = document.createElement("h5");
                url.className = `title`;
                url.innerText = u.title
                url.setAttribute('data-url', u.url);
                div.appendChild(url);
            });
        }

        let { div: tagsInput, tagify } = _createTagsInput(tags);
        div.appendChild(
            tagsInput
        );

        this.tagify = tagify;

        return div;
    }

    _createButton() {
        let btn = document.createElement('button');
        btn.innerText = "💡";
        btn.addEventListener('click', this.onSearchBtnEvent);
        return btn
    }

    _createImages(images) {
            let div = document.createDocumentFragment();
            let imgs = images || [];
            // console.log(imgs)
            Array.from(imgs, img => {
                let im = new Image();
                im.src = img.url || img.base64;
                im.title = img.title || "IMG";
                im.className = "image";
                div.appendChild(im);
            });
            return div
        }
        // _createTagsInput(tagsObj) {
        //         let div = document.createElement("div");
        //         div.className = "tags";
        //         let input = document.createElement("input");
        //         input.setAttribute("placeholder", 'ffff');
        //         input.className = "customLook";
        //         // input.value = tags;
        //         let button = document.createElement("button");
        //         button.innerText = "+";
        //         div.appendChild(input);
        //         div.appendChild(button);

    //         let tagify = new Tagify(input, {
    //             callbacks: {
    //                 "invalid": onInvalidTag,
    //             },
    //             dropdown: {
    //                 position: 'text',
    //                 enabled: 1
    //             }
    //         });

    //         if (tagsObj) {
    //             //有标签，只显示
    //             tagify.addTags(Array.from(tagsObj, t => {
    //                 return {
    //                     value: t.value,
    //                     color: t.type == 0 ? "blue" : "gray"
    //                 }
    //             }))
    //         } else {
    //             //没标签，是搜索工具
    //             div.append(this._createButton());
    //         }

    //         button.addEventListener("click", onAddButtonClick)

    //         function onAddButtonClick() {
    //             tagify.addEmptyTag()
    //         }

    //         function onInvalidTag(e) {
    //             console.log("invalid", e.detail)
    //         }

    //         this.tagify = tagify;

    //         return div

    //     }
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
            // console.log(id)
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
            margin:24px 0;
        `);

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
            outline:none;
        margin-bottom: 28px;`);

        this._addCssRule(`${this.cssHead} .image`,
            `width:100%;
             max-width:120px;
             cursor: pointer;
             margin:8px;
            `);

        this._addCssRule(`${this.cssHead} .image:hover`,
            `box-shadow:#a7caef 0px 4px 8px 0px;
            transform: scale(1.05);
            `);

        this._addCssRule(`${this.cssHead} .images`,
            `margin:18px;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            max-width: 420px;
            justify-content: space-between;
            align-items: center;`);

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
            margin-top: 0;
            cursor: pointer;`);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag[color=gray]`, `
            --tag-bg                  : red;
        `);

        this._addCssRule(`${this.cssHead} .customLook .tagify__tag > div`, `
            border-radius: 25px;`);
        this._addCssRule(`${this.cssHead} .customLook .tagify__tag >div > *`, `
            white-space: nowrap;`);

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
        // let tags = blockContent.querySelectorAll("tag");
        let tags = Array.from(this.tagify.value, v => {
                return {
                    value: v.value.trim(),
                    type: v.color == 'blue' ? 0 : 1
                }
            })
            // console.log(tags)
            // tags = Array.from(tags, t => t.innerText.trim());
        let {
            createTime,
            urls,
            images,
            id
        } = this.data;

        let text = blockContent.querySelector(".text").innerText.trim();

        return {
            text,
            createTime,
            tags,
            id,
            urls: urls,
            images: images
        }
    }

};
module.exports = KnowledgeCard;