const Tagify = require("@yaireo/tagify");
// console.log(Tagify)


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
        text.setAttribute("contenteditable", true);

        let images = document.createElement('div');
        images.className = "images";
        images.appendChild(this._createImages());

        div.appendChild(title);
        div.appendChild(text);
        div.appendChild(images);

        let tagDiv = this._createTagsInput(this.data ? this.data.tags : null);
        div.appendChild(tagDiv);

        title.innerText = this.data && this.data.title ? this.data.title : '';
        text.innerText = this.data && this.data.text ? this.data.text : '';
        div.setAttribute('data-url', this.data && this.data.url ? this.data.url : '');
        div.setAttribute('data-vector', this.data && this.data.vector ? this.data.vector : '');

        return div;
    }
    _createImages() {
        let div = document.createDocumentFragment();
        let imgs = this.data && this.data.images ? this.data.images : [];
        // if (!!imgs) { console.log(imgs) }
        Array.from(imgs, img => {
            let im = new Image();
            im.src = img.url || img.base64;
            im.className = "image";
            div.appendChild(im);
        });
        return div
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
        margin-bottom: 28px;`);

        this._addCssRule(`${this.cssHead} .image`,
            `width:100%;
            `);

        this._addCssRule(`${this.cssHead} .images`,
            `margin:18px`);

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
        let tags = blockContent.querySelectorAll("tag");
        tags = Array.from(tags, t => t.innerText.trim());
        let {
            title,
            text,
            url,
            createTime,
            vector,
            urls,
            images
        } = this.data;
        // console.log(tags.innerText)
        text = blockContent.querySelector(".text").innerText.trim();
        return {
            title,
            text,
            url,
            createTime,
            vector,
            tags,
            urls: urls,
            images: images
        }
    }

};
module.exports = KnowledgeCard;