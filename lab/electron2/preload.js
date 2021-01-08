// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const ME = require("medium-editor");
window.ME = ME;
const { ipcRenderer } = require('electron');

let ps = [];

window.addEventListener('DOMContentLoaded', () => {
    var HighlighterButton = ME.MediumEditor.extensions.button.extend({
        name: 'highlighter',
        tagNames: ['mark'],
        contentDefault: '<b>H</b>',
        contentFA: '<i class="fa fa-paint-brush"></i>',
        aria: 'Highlight',
        action: 'highlight',

        init: function() {
            // this.classApplier = rangy.createClassApplier('highlight', {
            //     elementTagName: 'mark',
            //     normalize: true
            // });

            this.button = this.document.createElement('button');
            this.button.classList.add('medium-editor-action');
            this.button.innerHTML = '<i class="fa fa-paint-brush"></i>';
            this.button.title = 'Highlight';

            this.on(this.button, 'click', this.handleClick.bind(this));
        },

        getButton: function() {
            return this.button;
        },

        handleClick: function(event) {
            this.classApplier.toggleSelection();
            this.base.checkContentChanged();
        },

        isAlreadyApplied: function(node) {
            return node.nodeName.toLowerCase() === 'mark';
        },

        isActive: function() {
            return this.button.classList.contains('medium-editor-button-active');
        },

        setInactive: function() {
            this.button.classList.remove('medium-editor-button-active');
        },

        setActive: function() {
            this.button.classList.add('medium-editor-button-active');
        }
    });

    var editor = new ME.MediumEditor('body', {
        spellcheck: false,
        toolbar: {
            buttons: ['underline']
        },
        buttonLabels: 'fontawesome',
        extensions: {
            'highlighter': new HighlighterButton()
        }
    });
    // let t = (new Date()).getTime();
    // let elements = ((Array.from(document.querySelectorAll("p"), p => p))
    //     .concat(Array.from(document.querySelectorAll("h2"), p => p))).concat(Array.from(document.querySelectorAll("span"), p => p));
    // //console.log(document.body.innerText, window.location.hostname);
    // ps = Array.from(elements, (p, i) => {
    //     let id = `${t}_x${i}`;
    //     p.setAttribute("bert-id", id);
    //     p.style.cursor = 'pointer';
    //     p.addEventListener("mouseover", e => {
    //         e.preventDefault();
    //         if (p.innerText.trim() == "") return;
    //         p.style.outline = '1px solid yellow';
    //     });
    //     p.addEventListener("mouseout", e => {
    //         e.preventDefault();
    //         //if (p.innerText.trim() == "") return;
    //         p.style.outline = 'none';
    //     })
    //     p.addEventListener("click", e => {
    //         e.preventDefault();
    //         if (p.innerText.trim() == "") return;
    //         if (window.location.protocol != "file:") ipcRenderer.send('save-knowledge', {
    //             text: p.innerText.trim(),
    //             url: window.location.href,
    //             title: document.title.trim()
    //         });
    //         // if (window.location.protocol != "file:") ipcRenderer.send('bert-similar', {
    //         //     target: p.innerText.trim(),
    //         //     texts: Array.from(ps, t => { return { id: t.id, text: t.text } })
    //         // });
    //         // Array.from(elements, s => s.style.backgroundColor = "transparent");
    //     });

    //     if (p.innerText.trim() != "" && window.location.protocol != "file:") {
    //         ipcRenderer.send('bert-init', {
    //             text: p.innerText.trim()
    //         });
    //     };

    //     return {
    //         text: p.innerText.trim(),
    //         id: id,
    //         element: p
    //     }
    // });

});

ipcRenderer.on('bert-similar-reply', (event, arg) => {
    console.log(event, arg)
    let res = arg.result.slice(0, 5);
    ps.forEach(p => {
        res.forEach(r => {
            if (p.id === r.id) {
                p.element.style.backgroundColor = `rgba(255,255,0,${r.score})`;
                //p.element.setAttribute("data-similar-score", r.score);
            };
        })
    })
})