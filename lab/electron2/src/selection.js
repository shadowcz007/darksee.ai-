/**
 *  image={
            title: title,
            url:url
        }

    text

 */
class Selection {
    constructor(options) {
        this.menu = {
            bgcolor: options.backgroundColor || '#333',
            iconcolor: options.iconColor || '#fff',
            callback: options.callback === undefined ? menu.callback : options.callback
        }

        this.icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" enable-background="new 0 0 24 24" width="24" height="24" class="selection__icon"><path d="M18 6v-6h-18v18h6v6h18v-18h-6zm-12 10h-4v-14h14v4h-10v10zm16 6h-14v-14h14v14z"/></svg>';

        this.selection = '';
        this.text = '';

        this._icons = {};
        this.arrowsize = 5;
        this.buttonmargin = 7 * 2;
        this.iconsize = 24 + this.buttonmargin;
        this.top = 0;
        this.left = 0;

        this.initIconStyle();
        this.initImages();
        this.attachEvents();
    }

    initIconStyle() {
        const style = document.createElement('style');
        style.innerHTML = `.selection__icon{fill:${this.menu.iconcolor};}`;
        document.body.appendChild(style);
    }

    /**
     * 图片的监听
     */
    initImages() {
        Array.from(document.images, img => {
            img.addEventListener("mouseover", e => {
                e.stopPropagation();
                img.style.outline = '1px solid yellow';
                let url = (window.location.hostname === "mp.weixin.qq.com") ? img.getAttribute('data-src') : img.src
                this.image = {
                    title: img.alt + "#" + window.getSelection().toString().trim(),
                    url: url
                };
            });
            img.addEventListener("mouseout", e => {
                e.stopPropagation();
                img.style.outline = 'none';
                this.image = null;
            });
            // img.addEventListener("click", e => {
            //     e.stopPropagation();

            // })
        })
    }

    attachEvents() {
        let that = this;

        function hasSelection() {
            return !!window.getSelection().toString();
        }

        function hasTooltipDrawn() {
            return !!document.querySelector('.selection');
        }

        window.addEventListener(
            'mouseup',
            function() {
                setTimeout(function mouseTimeout() {
                    if (hasTooltipDrawn()) {
                        if (hasSelection()) {
                            that.selection = window.getSelection();
                            that.text = that.selection.toString();
                            that.moveTooltip();
                            return;
                        } else {
                            document.querySelector('.selection').remove();
                        }
                    }
                    if (hasSelection()) {
                        that.selection = window.getSelection();
                        that.text = that.selection.toString();
                        that.drawTooltip();
                    }
                }, 10);
            },
            false
        );
    }

    moveTooltip() {
        this.setTooltipPosition();
        let tooltip = document.querySelector('.selection');
        tooltip.style.top = `${this.top}px`;
        tooltip.style.left = `${this.left}px`;
    }

    setTooltipPosition() {
        const position = this.selection.getRangeAt(0).getBoundingClientRect();
        const DOCUMENT_SCROLL_TOP =
            window.pageXOffset || document.documentElement.scrollTop || document.body.scrollTop;
        //console.log(position)
        this.top = position.height * 0.5 + position.top + DOCUMENT_SCROLL_TOP - this.iconsize - this.arrowsize;
        this.left = position.left + (position.width - this.iconsize) * 0.5;
    }

    drawTooltip() {
        let that = this;
        that.setTooltipPosition();

        const div = document.createElement('div');
        div.className = 'selection';
        div.style =
            'line-height:0;' +
            'position:absolute;' +
            'background-color:' +
            that.menu.bgcolor +
            ';' +
            'border-radius:20px;' +
            'top:' +
            that.top +
            'px;' +
            'left:' +
            that.left +
            'px;' +
            'transition:all .2s ease-in-out;' +
            'box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);' +
            'z-index:99999;';

        div.appendChild(
            that.createButton(that.icon, function() {
                if (that.menu.callback) that.menu.callback(that.text, that.image);
            })
        );

        const arrow = document.createElement('div');
        arrow.style =
            'position:absolute;' +
            'border-left:' +
            that.arrowsize +
            'px solid transparent;' +
            'border-right:' +
            that.arrowsize +
            'px solid transparent;' +
            'border-top:' +
            that.arrowsize +
            'px solid ' +
            that.menu.bgcolor +
            ';' +
            'bottom:-' +
            (that.arrowsize - 1) +
            'px;' +
            'left:' +
            (that.iconsize / 2 - that.arrowsize) +
            'px;' +
            'width:0;' +
            'height:0;';

        div.appendChild(arrow);

        document.body.appendChild(div);
        // console.log("-----select------")
    }

    createButton(icon, clickFn) {
        const btn = document.createElement('div');
        btn.style = 'display:inline-block;' + 'margin:7px;' + 'cursor:pointer;' + 'transition:all .2s ease-in-out;';
        btn.innerHTML = icon;
        btn.onclick = clickFn;
        btn.addEventListener("mouseover", e => {
            btn.style.transform = 'scale(1.2)';
        });
        btn.addEventListener("mouseout", e => {
            btn.style.transform = 'scale(1)';
        });
        return btn;
    }
};

module.exports = Selection;