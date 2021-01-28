const { ipcRenderer, remote } = require('electron');
const Jimp = require('jimp');

const mainWin = remote.getGlobal("mainWindow");

const Selection = require('./selection');
const Spider = require('./spider');

// const Gif = require('./gif');

const xhrProxy = require('./xhr_proxy.js');
//记录星球的话题id
let topicIds = {};
xhrProxy.addHandler(async function(xhr) {
    let data = null;
    let url = xhr.responseURL;
    if (url.match('https://api.zsxq.com/v2/groups/') && url.match("/topics?")) {
        data = JSON.parse(xhr.response);
        // let nds = [];
        for (let index = 0; index < data.resp_data.topics.length; index++) {
            let t = data.resp_data.topics[index];
            if (!topicIds[t.topic_id]) {
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
                        tags.push({
                            value: title.slice(1, title.length - 1),
                            type: 0
                        });
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
                    let { type, data: base64 } = await getBase64Async(images2[im].url),
                        title = images2[im].title;
                    // console.log(base64)

                    imagesBase.push({
                        title: title,
                        type: type,
                        base64: base64
                    })
                }
                // console.log(imagesBase)
                // nds.push({
                //     id: t.topic_id,
                //     text: div.innerText.trim(),
                //     tags: tags,
                //     urls: urls,
                //     images: imagesBase
                // });
                topicIds[t.topic_id] = {
                    id: t.topic_id,
                    text: div.innerText.trim(),
                    tags: tags,
                    urls: urls,
                    images: imagesBase
                };
            }

        }

        // data = nds;
    };

    // Array.from(data || [], d => {
    //     ipcRenderer.send('save-knowledge', {
    //         from: window.location.hostname,
    //         tags: d.tags,
    //         text: d.text,
    //         url: d.urls && d.urls.length > 0 ? d.urls[0].url : null,
    //         title: d.urls && d.urls.length > 0 ? d.urls[0].title : null,
    //         urls: d.urls,
    //         images: d.images
    //     });
    // });
    // console.log(topicIds)
    if (document.querySelector('.darksee_spider_window_button')) {
        document.querySelector('.darksee_spider_window_button').innerText = `收集${getTopicNum()}`;
    }
});

function getTopicNum() {
    let topicIdsArray = [];
    for (const id in topicIds) {
        if (!topicIds[id].isSave) topicIdsArray.push(1);
    };
    return topicIdsArray.length
}

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
            // let tags = spider.getTags(text);
            // console.log(tags)
            ipcRenderer.send('save-knowledge', {
                tags: [],
                text: text,
                url: window.location.href,
                title: document.title.trim()
            });
        }
    });

    if (!document.querySelector('.darksee_spider_window_button')) {
        let win = remote.getCurrentWindow();
        win.webContents.insertCSS(`
        .darksee_spider_window_button {
                cursor: pointer;
                background: #0052BF;
                color: white;
                border-radius: 44px;
                height: 44px;
                width: 98px;
                outline: none;
                border: none;
                justify-content: center;
                display: flex;
                align-items: center;
                bottom: 8px;
                right: 8px;
                position: fixed;
                z-index:9999999;
                user-select: none;
            }
            
        .darksee_spider_window_button:hover {
                box-shadow: 1px 1px 4px #707684ad;
                background: #CE0078
            }
        `);
        win.webContents.executeJavaScript(`${executeJavaScript()}`)

    }

    function executeJavaScript() {
        let div = document.createElement('div');
        div.className = 'darksee_spider_window_button';
        div.innerText = "收集";
        div.setAttribute("contenteditable", false);
        // let topicsForSave = [];
        div.addEventListener('click', e => {
            for (const id in topicIds) {
                let topic = topicIds[id];
                if (!topic.isSave) {
                    topicIds[id].isSave = true;
                    ipcRenderer.sendTo(mainWin.webContents.id, 'save-knowledge', topic);
                }
            };
            document.querySelector('.darksee_spider_window_button').innerText = `收集${getTopicNum()}`;
        });



        document.body.appendChild(div);
    }




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
                    //console.log(image.bitmap)
                    fetchImage(src).then(buffer => {
                        resolve({
                                type: image._originalMime,
                                data: "data:image/gif;base64," + arrayBufferToBase64(buffer)
                            })
                            // let g = new Gif();
                            // g.start(buff);
                            // resolve(blob);
                    })

                } else {
                    image.getBase64Async(image._originalMime).then((base64) => {
                        resolve({
                                type: image._originalMime,
                                data: base64
                            })
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


function arrayBufferToBase64(buffer) {
    //第一步，将ArrayBuffer转为二进制字符串
    var binary = '';
    var bytes = new Uint8Array(buffer);
    for (var len = bytes.byteLength, i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    //将二进制字符串转为base64字符串
    return window.btoa(binary);
}