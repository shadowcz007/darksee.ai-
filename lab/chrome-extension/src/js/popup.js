import "../css/custom.css";
import "../css/popup.css";
// import hello from "./popup/example";

// hello();

// console.log(chrome.browserAction)


window.onload = async function() {
    //if(chrome.runtime.lastError) alert("出错了");
    //if(!chrome.runtime)return alert("出错了");
    await init();
    document.getElementById("loading").classList.add("hide");
}

async function init() {
    let bg = chrome.extension.getBackgroundPage();
    bg.setBadge("");

    let data = await bg.getData();
    let tipDom = document.querySelector("#tip");
    tipDom.innerText = data.docs.length == 0 ? '导入知识' : '管理知识';
    tipDom.setAttribute("data-count", data.docs.length);
    tipDom.addEventListener("click", e => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    //一键收入知识库
    document.getElementById('save').addEventListener('click', e => {
        //主动触发新素材入库
        e.preventDefault();
        //TODO 主动触发新素材入库,通知content 获取
        sendMessageToContentScript({ cmd: 'updateFromContent' }, function(response) {
            // console.log(response);
        });
    });


    //输入
    let findDom = document.querySelector('#find');
    findDom.addEventListener("keyup", e => {
        e.preventDefault();
        let t = findDom.value.trim();
        if (t.length > 0) {
            chrome.runtime.sendMessage({
                find: t,
            }, function(response) {
                //console.log('收到来自后台的回复：' ,response);
                sendMessageToContentScript({
                    isTargetSite: true
                }, r => {
                    console.log('收到来自后台的回复：', response);
                    getFindResult(!!r, true);
                });
            });
        } else {
            localStorage.removeItem("findResult");
            localStorage.removeItem('find');
            getFindResult(false, true);
        }
    });

    sendMessageToContentScript({
        isTargetSite: true
    }, r => {
        getFindResult(!!r);
    });
};

//调取搜索结果
//console.log("---")
function getFindResult(isTarget, isInput) {
    let findResult = localStorage.getItem("findResult"),
        find = localStorage.getItem('find');
    //console.log('findResult',findResult);

    let fDom = document.querySelector('#find_result_count');
    document.querySelector("#find_result").innerHTML = "";
    fDom.classList.add("hide");
    fDom.setAttribute("data-count", 0);

    if (findResult == null || find == null) return;

    findResult = JSON.parse(findResult);

    if (findResult.length > 0) {
        fDom.classList.remove("hide");
        fDom.setAttribute("data-count", findResult.length);
        if (!isInput) document.querySelector('#find').value = find.trim();
    } else {
        suggestTopicTags();
        return document.querySelector("#find_result").innerHTML = "";
    };

    let html = document.createDocumentFragment();
    Array.from(findResult, (t, i) => {
                //console.log(t)

                let div = document.createElement("div");

                //t.text富文本，处理
                div.innerHTML = t.text;
                t.text = div.innerText.trim();

                div.className = 'suggest_text';
                div.innerHTML = `<div>${t.displayText}</div><br>
        <div class="score_area">
        <div class="score" data-tip="相似度">${t.score.toFixed(2)}</div>
        <div class="score" data-tip="有用度">${t.hotScore}</div>
        </div>
        ${isTarget?`<div class="button_area">
            <div class="button">追加</div>
        </div>`:''}`;
        
        html.appendChild(div);
        div.addEventListener('mouseover',(e)=>{
            e.preventDefault();
            resetSuggestTexts();
            div.classList.add("suggest_text_hover");
        });
        div.addEventListener('mouseout',(e)=>{
            e.preventDefault();
            resetSuggestTexts();
        });
        if(div.querySelector('.button')){
            div.querySelector('.button').addEventListener('click',(e)=>{
                e.preventDefault();
                chrome.runtime.sendMessage({insert: t}, function(response) {
                    if(chrome.runtime.lastError) return;
                    //console.log('收到来自后台的回复：',response);
                    //页面里的hotscore更新
                    findResult=updateHotScore(i,findResult,div);
                    updateStatusDom("已插入文档");
                });
            });
        };

        div.addEventListener('click',(e)=>{
            e.preventDefault();
            chrome.runtime.sendMessage({copyToClipboard:t.text}, function(response) {
                if(chrome.runtime.lastError) return;
                
                chrome.runtime.sendMessage({hotScore: true,id:t.id}, function(response) {
                    if(chrome.runtime.lastError) return;
                    //页面里的hotscore更新
                    findResult=updateHotScore(i,findResult,div);
                    updateStatusDom("已复制到剪切板");
                })
            });
        });

    });
    document.querySelector("#find_result").appendChild(html);
};

//ui状态
function updateStatusDom(text){
    let statusDom=document.getElementById("status");
    statusDom.innerText=text?text.trim():"";
}

function updateHotScore(i,findResult,div){
    findResult[i].hotScore++;
    div.querySelector('.score span').innerText=findResult[i].hotScore;
    localStorage.setItem("findResult",JSON.stringify(findResult));
    return findResult
}



function suggestTopicTags(){
    sendMessageToContentScript({cmd:'suggestTopicTags'}, function(response){
        //alert(response);
        chrome.runtime.sendMessage({suggestTopicTags:response}, function(response) {
            if(chrome.runtime.lastError) return;
        });
    });
}


function resetSuggestTexts(){
    Array.from(document.querySelectorAll('.suggest_text'),t=>{
        t.classList.remove("suggest_text_hover");
    });
};
function sendMessageToContentScript(message, callback){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        if(chrome.runtime.lastError)return;
		chrome.tabs.sendMessage(tabs[0].id, message, function(response){
            if(chrome.runtime.lastError)return;
			if(callback) callback(response);
		});
	});
};