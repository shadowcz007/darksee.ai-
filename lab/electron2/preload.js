const { ipcRenderer } = require('electron');
const Jimp = require('jimp');
const decodeGif = require("decode-gif");
const fs = require("fs"),
    path = require("path")
window.decodeGif = decodeGif

const Selection = require('./src/selection');
const Spider = require('./src/spider');

const xhrProxy = require('./src/xhr_proxy.js');
xhrProxy.addHandler(async function(xhr) {
    let data = null;
    let url = xhr.responseURL;
    if (url.match('https://api.zsxq.com/v2/groups/') && url.match("/topics?")) {
        data = JSON.parse(xhr.response);
        let nds = [];
        for (let index = 0; index < data.resp_data.topics.length; index++) {
            let t = data.resp_data.topics[index];
            // console.log(t.talk)
            let text = t.talk.text;
            let div = document.createElement("div");
            div.innerHTML = text;
            let tags = [];
            let urls = [];
            let images = t.talk.images || [];
            Array.from(div.querySelectorAll('e'), e => {
                // console.log(e)
                let title = decodeURIComponent(e.getAttribute("title")).trim();

                e.setAttribute("title", title);
                if (e.getAttribute("type") === "hashtag") {
                    tags.push(title.slice(1, title.length - 1));
                };
                if (e.getAttribute("type") === "web") {
                    urls.push({
                        title: title,
                        url: e.getAttribute('href')
                    })
                };
                let span = document.createElement("span");
                span.innerText = title;
                e.insertBefore(span, e.children.length > 0 ? e.children[0] : null);


                //console.log(e)
            });
            // console.log(div)

            //images的处理
            let images2 = Array.from(images, img => img.large);
            // console.log(images2)
            let imagesBase = [];
            for (let im = 0; im < images2.length; im++) {
                let base64 = await getBase64Async(images2[im].url),
                    title = images2[im].title;

                imagesBase.push({
                    title: title,
                    base64: base64
                })
            }
            // console.log(imagesBase)
            nds.push({
                id: t.topic_id,
                text: div.innerText.trim(),
                tags: tags,
                urls: urls,
                images: imagesBase
            });

        }

        data = nds;
    };

    Array.from(data || [], d => {
        ipcRenderer.send('save-knowledge', {
            from: window.location.hostname,
            tags: d.tags,
            text: d.text,
            url: d.urls && d.urls.length > 0 ? d.urls[0].url : null,
            title: d.urls && d.urls.length > 0 ? d.urls[0].title : null,
            urls: d.urls,
            images: d.images
        });
    });


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

async function fetchImage(url) {
    return new Promise((resolve, reject) => {

        fetch(url, {
            method: 'get',
            responseType: 'arraybuffer'
        }).then(res => {
            return res.arrayBuffer();
        }).then(arraybuffer => {
            resolve(arraybuffer);
        })
    })

}




async function getBase64Async(src) {

    return new Promise((resolve, reject) => {
        Jimp.read({
                url: src
            })
            .then(image => {
                // console.log(image)
                //TODO gif 有bug

                if (image._originalMime == "image/gif") {
                    // let fp = path.join(__dirname, "_" + (new Date()).getTime() + ".gif");
                    // image.writeAsync(fp).then(() => {
                    //     let base64 = decodeGif(fs.readFileSync(fp));
                    //     resolve(base64)
                    // });
                    console.log(image.bitmap)
                    fetchImage(src).then(b => {
                        console.log(b)
                        resolve(decodeGif(b));
                    })

                } else {
                    image.getBase64Async(image._originalMime).then((base64) => {
                        resolve(base64)
                            // console.log(base64)
                    });
                }


            })
            .catch(err => {
                // Handle an exception.
                reject();
            });
    });
}