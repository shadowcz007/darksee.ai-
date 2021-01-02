//import EventEmitter from 'events'

// import { Segment, useDefault, cnPOSTag, enPOSTag } from './lib/segmentit.js';
// import FlexSearch from './lib/flexsearch.min.js';
// const segmentit = useDefault(new Segment());
// const searchIndex = new FlexSearch();
// console.log(FlexSearch)
// segmentit.doSegment('一人得道，鸡犬升天',{
//     stripPunctuation: true
//   }).map(i => {
//     console.log(i,cnPOSTag(i.p),enPOSTag(i.p))
// });




// let bg = chrome.extension.getBackgroundPage();


//整理入库
function updateContent(callback) {
    let contents = (Array.from(document.querySelectorAll('*[data-lake-id]'), (element) => {
        let id = element.getAttribute('data-lake-id'),
            text = element.innerText.trim();
        if (text && text.length > 0) {
            return {
                id: id,
                text: text,
                ref: {
                    url: window.location.href,
                    title: document.title,
                    favIconUrl: ""
                }
            }
        }
    })).filter(t => !!t);

    chrome.runtime.sendMessage({ update: contents }, function(response) {
        callback(response);
    });
};



//新增一条记录到知识库
function newText(text, callback) {
    let dict = {
        id: (new Date()).getTime().toString(),
        text: text,
        ref: {
            url: window.location.href,
            title: document.title,
            favIconUrl: ""
        }
    };
    //console.log([dict])
    chrome.runtime.sendMessage({ update: [dict] }, function(response) {
        callback(response);
    });
};


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension");
    if (request.insert) {
        //console.log('插入文档:',request.insert);
        insertText(request.insert.text);
        //document.querySelector('*[data-lake-id="'+request.targetId+'"]').innerText+='\n'+request.insert.text;
    } else if (request.isTargetSite) {
        isInsertTargetSite((r) => {
            sendResponse(r);
        });
    }
    // sendResponse('我收到了你的消息！');
    return true;
});


//TODO 暂只支持从前往后的划选，从后往前的暂不支持
function insertText(text) {
    let select = document.getSelection();
    var s = select.focusNode.textContent.slice(0, document.getSelection().focusOffset);
    var e = document.getSelection().focusNode.textContent.slice(document.getSelection().focusOffset, document.getSelection().focusNode.textContent.length);

    document.getSelection().focusNode.textContent = s + "<span style='border-left: 4px solid #03A9F4;border-radius: 12px;padding: 0 8px;border-right: 4px solid #2196F3;'>" + text + "</span>" + e;

    document.getSelection().focusNode.parentElement.innerHTML = document.getSelection().focusNode.parentElement.innerText;

}


function findParentElementId(element) {
    let id = element.getAttribute('data-lake-id');
    if (!id && element.parentElement) {
        id = findParentElementId(element.parentElement);
    };
    return id;
};



//绑定划选时间，用于调取知识
function bindSelect() {
    //console.log("-----运行-----bindSelect")
    //划选
    //let countTime=(new Date()).getTime();

    document.addEventListener("mouseup", e => {
        e.preventDefault();

        let s = document.getSelection();

        //非划选 只是点击的时候 不执行
        if (s.isCollapsed == true) return;
        //console.log("监听",s.focusNode)
        let t = null;

        if (s.focusNode && s.focusNode.data) {
            t = s.focusNode.data.slice(s.anchorOffset, s.extentOffset).trim();
        };

        if (!t && s.baseNode && s.baseNode.data) {
            t = s.baseNode.data.trim();
        };

        //console.log(t);
        if (t && t.length > 1) {
            chrome.runtime.sendMessage({
                find: t,
                //targetId:targetId
            }, function(response) {
                //console.log('收到来自后台的回复：' ,response);
            });
        };

    });
    //  document.onselectionchange = () => {
    //      //console.log((new Date()).getTime(),countTime)
    //     //  if((new Date()).getTime()-countTime<6000) return console.log("----暂不搜索-----");
    //     //  countTime=(new Date()).getTime();
    //     isSelecting=true;
    //     chrome.runtime.sendMessage({
    //         reset:true
    //     }, function(response) {
    //         console.log('收到来自后台的回复：' ,response);
    //     });
    //  };
};

//判断页面的域名，调取对应的高亮功能
function isHighlightSite() {
    let host = window.location.host;

    chrome.runtime.sendMessage({
        highlight: host,
        html: document.body.innerHTML
    }, function(response) {
        console.log('isHighlightSite', response);
        if (response && response.length > 0) {

            chrome.runtime.sendMessage({
                setBadge: 'KD',
            }, function(response) {
                //console.log('收到来自后台的回复：' ,response);
            });

            // alert(`发现${response.length}条`);
            let texts = Array.from(document.body.querySelectorAll(response[0].query), t => { return t });
            for (let index = 0; index < response.length; index++) {
                const element = response[index];
                // texts[element.id].classList.add('auto-knowledge-find-result');
                // texts[element.id].setAttribute("auto-knowledge-score",element.score);
                texts[element.id].removeEventListener('click', add2Knowledge);
                texts[element.id].addEventListener("click", add2Knowledge);
                texts[element.id].style.backgroundColor = `rgba(255,255,0,0.3)`;
                texts[element.id].style.cursor = `copy`;
            }
        }

    });

};

//进库
function add2Knowledge(e) {
    e.preventDefault();
    let t = e.target.innerText.trim();
    console.log(t)
    newText(t, res => {
        console.log(res);
    });
};

//是否写作的目标网站
function isInsertTargetSite(callback) {
    // console.log(window.location.protocol == "chrome-extension:")
    if (window.location.protocol == "chrome-extension:") return callback(true);
    chrome.runtime.sendMessage({
        isTargetSite: window.location.href,
    }, function(response) {
        //console.log('收到来自后台的回复：' ,response);
        if (response) {
            localStorage.setItem("isInsert", response);
        };
        callback(response);
    });

}



function init() {
    //各网页都监控
    //划选
    //TODO bug 发现百度搜索上面划选仅靠focusNode是获取不全的,换成获取剪切板的实现

    // document.onselectionchange = () => {
    //     let s=document.getSelection();
    //     console.log(s)
    //     if(s.focusNode.data){
    //         if(s.anchorOffset<s.extentOffset){
    //             copyText= s.focusNode.data.slice(s.anchorOffset,s.extentOffset).trim();
    //         }else{
    //             copyText= s.focusNode.data.slice(s.extentOffset,s.anchorOffset).trim();
    //         };
    //         // console.log(copyText)
    //     }
    // };
    let runningText = null;
    document.body.addEventListener("keydown", function(e) {
        var keyCode = e.keyCode || e.which || e.charCode;
        var ctrlKey = e.ctrlKey || e.metaKey;
        //console.log('copy------',keyCode)
        if (ctrlKey && keyCode == 67) {
            chrome.runtime.sendMessage({
                getClipboardData: true
            }, function(text) {
                if (text && runningText != text) {
                    runningText = text;
                    newText(text, (r) => {
                        //
                    });
                };
            });
        };
    }, false);


    if (document.querySelector('.lake-content-editor-core')) {

        //由用户主动触发,ctrl(cmd)+s
        document.querySelector('.lake-content-editor-core').addEventListener("keydown", function(e) {
            var keyCode = e.keyCode || e.which || e.charCode;
            var ctrlKey = e.ctrlKey || e.metaKey;
            if (ctrlKey && keyCode == 83) {
                updateContent((res) => {});
            };
        }, false);

        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            //主动触发新素材入库
            if (request.cmd == 'updateFromContent') {
                updateContent((res) => {
                    console.log(res)
                });
            } else {
                //suggestTopicTags
                sendResponse(document.body.innerText.trim());
            }
            return true;
        });

    } else {
        setTimeout(init, 1000);
    };



};

window.onload = function() {
    console.log(window.location)
    if (window.location.protocol != "chrome-extension:") {
        init();
        bindSelect();
        isHighlightSite();
        isInsertTargetSite((r) => {
            //console.log(r);
        });
    }

}