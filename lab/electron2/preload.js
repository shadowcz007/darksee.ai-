const { ipcRenderer } = require('electron');

const Selection = require('./src/selection');
const Spider = require('./src/spider');

const xhrProxy = require('./src/xhr_proxy.js');
xhrProxy.addHandler(function(xhr) {
    let data = {};
    let url = xhr.responseURL;
    if (url.match('https://api.zsxq.com/v2/groups/') && url.match("/topics?")) {
        console.log(JSON.parse(xhr.response))
    }

});

// console.log(Selection)
let ps = [];

window.addEventListener('DOMContentLoaded', () => {
    document.body.setAttribute("contenteditable", true);

    let spider = new Spider();
    // console.log(spider)
    let selection = new Selection({
        backgroundColor: 'crimson',
        iconColor: '#fff',
        callback: (text, selection) => {
            // console.log(selection)
            let tags = spider.getTags(text);
            // console.log(tags)
            ipcRenderer.send('save-knowledge', {
                tags: tags,
                text: text,
                url: window.location.href,
                title: document.title.trim()
            });
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
});