import "../css/custom.css";
import "../css/options.css";

import { Corpus } from "./lib/tiny-tfidf";
 
import ml5 from './lib/ml5.min.js';
//window.Corpus=Corpus;
//import './base/hm';



import moment, { fn } from './lib/moment-with-locales.min.js';
// console.log(moment)
moment.locale('zh-cn'); // zh-cn

let bg = chrome.extension.getBackgroundPage();
let countTime = 0,
    isRunInit = false;


//TODO 支持分页
async function create(docs) {
    //var bg = chrome.extension.getBackgroundPage();
    //console.log(bg)
    let exportDom = document.getElementById("export");
    let html = document.createDocumentFragment();
    //console.log(docs)
    if (docs) {
        let tagsForArticleStructure = await bg.getStructureTags();
        //console.log(await bg.getTopicTagsUserDefine())
        Array.from(docs, d => {
                    //console.log(d)
                    // let displayText=bg.displayText(d.text);
                    // console.log(d,tagsForArticleStructure)
                    let div = document.createElement("div");
                    div.className = 'suggest_text card';
                    div.setAttribute('data-id', d.id);
                    div.setAttribute('data-updatedate', d.updateDate);
                    div.setAttribute('data-hotscore', d.hotScore);
                    div.setAttribute('data-structure-type', d.type || '默认');

                    div.innerHTML = `<div style="display: flex;
                width: 100%;justify-content: space-between;">
                    <div class="text" data-id="${d.id}" data-text="${d.text}">${d.text}</div>
                    <div class="close"><div>X</div></div>
                </div><br>
                <div style="display: flex;margin: 0px 20px;
                justify-content: space-between;">
                    <span class="score">${d.hotScore}</span>
                    <span class="date">${moment(d.updateDate).fromNow()}</span>
                </div>
                <div class="ref">
                    <img class="favicon" src="${d.ref.favIconUrl||'default.png'}"/>
                    <a class="url" href="${d.ref.url}">${d.ref.title}</a></div>
                <div class="user-name">${d.userName||'-'}</div>
                <div class="button_area" style="margin: 24px 0;justify-content: space-between;">
                        <div class="button search-similar">相似</div>
                        <select class="tType">
                            <option value ="默认" ${!d.type?'selected':''}>默认</option>
                            ${Array.from(tagsForArticleStructure,t=>{
                                return `<option value ="${t}" ${d.type==t?'selected':''}>${t}</option>`
                            }).join("")}
                        </select>
                </div>
                <div class="similar-card">
                </div>
                `;
            let text=div.querySelector('.text');
            //开启编辑
            div.addEventListener("dblclick",(e)=>{
                e.preventDefault();
                //console.log(div)
                text.classList.add("edit");
                text.setAttribute('contenteditable',true);
            });
            
            //相似排序
            let similarDom=div.querySelector('.search-similar');
            similarDom.addEventListener("click",async (e)=>{
                e.preventDefault();
                //console.log(bg.searchFind(d.text));
                let cards=(await bg.searchFind(d.text,d.type=="默认"?null:d.type)).docs;
                if(cards&&cards.length>0){
                    similarDom.setAttribute("data-count",cards.length);
                    similarDom.classList.add("count");
                    createSimilarCards(div,cards);
                }else{
                    alert("暂无")
                }
                
            });
            //类型设置
            div.querySelector('.tType').addEventListener("change",(e)=>{
                e.preventDefault();
                //console.log(d.id,e.target.value)
                chrome.runtime.sendMessage({
                    id:d.id,
                    type: e.target.value
                });
            });
            div.querySelector(".tType").addEventListener("mouseover",e=>{
                //e.preventDefault();
                
                if(autoLabelResult[d.id]){
                    console.log(autoLabelResult[d.id])
                    div.querySelector(".tType").setAttribute("title",autoLabelResult[d.id]);
                };
            });
            //删除
            div.querySelector('.close').addEventListener('click',e=>{
                e.preventDefault();
                div.remove();
                
                let count=parseInt(exportDom.getAttribute("data-count"));
                exportDom.setAttribute("data-count",count-1);
                if(count>1){
                    exportDom.classList.add("count");
                }else{
                    exportDom.classList.remove("count");
                };
                
                //console.log(d.id)
                chrome.runtime.sendMessage({
                    id:d.id,
                    remove:true
                },async(response)=>{
                    if(response==0){
                        await initMainDom();
                    }
                });

            });
            //跳转原链接
            div.querySelector('.url').addEventListener('click',e=>{
                e.preventDefault();
                chrome.tabs.create({
                    url:e.target.href
                })
            });
            html.appendChild(div);
            // console.log(d)
        });
    };
    return html
};


//清楚所有标签的选择状态
function clearTagsSelected(element){
    Array.from(document.querySelectorAll(".tag-selected"),c=>{
        c.classList.remove("tag-selected")
    });
    element.classList.add('tag-selected');
    window.scroll(0,document.querySelector('header').getBoundingClientRect().height);
};


async function createSelectTags(tag,isNew){
    let dom=document.getElementById('selected-tags');
    if(isNew==true) dom.innerHTML="";
    let t=createBaseTag(tag);
    let sTags=await bg.getStructureTags();
    Array.from(dom.children,c=>{
        if(sTags.includes(c.innerText)){
            c.remove();
        }
    });
    dom.appendChild(t);
};


function createBaseTag(tag){
    let div=document.createElement('div');
        div.className='tag';
        div.innerText=tag;
    return div;
};




//按类型过滤
function cardRankByStructure(type){
    
}

//按相似度重排
function cardsRank(q,corpus,maps){
    
};


// 相似推荐
function searchSimilar(type,text,res){
};

function createSimilarCard(i,c){
    //console.log(c)
    return `<div class='s-card' data-index="${i}" data-score="${c.score.toFixed(2)}">${c.displayText}</div>`;
}

function createSimilarCards(div,cs){
    let cards=div.querySelector(".similar-card");
    cards.classList.add("similar-card-show");
    cards.innerHTML=Array.from(cs,(c,i)=>{
        return createSimilarCard(i+1,c);
     }).join("");
};

function clearAllContenteditable(){
    let es=document.querySelectorAll('.edit');
    Array.from(es,e=>{
        e.removeAttribute('contenteditable');
        e.className="text";
        e.innerText=e.innerText;
        //console.log(e.innerText)
        //有所修改才更新
        if(e.getAttribute('data-text')!=e.innerText.trim()){
            chrome.runtime.sendMessage({
                id:e.getAttribute('data-id'),
                updateText: e.innerHTML.trim()
            });
        };
    });
};






async function initKnowledgeTags(tags){
    //let tags=await bg.getTopicTags(Array.from(docs,t=>t.text).join(""));
    tags=bg.tagsRank(tags);
    tags=tags.slice(0,15);
    //console.log(tags)
    let ts=document.createDocumentFragment();

    Array.from(tags,async t=>{
        let div=createBaseTag(t.tag);
        div.setAttribute("data-count",parseInt(t.score*0.1));

        div.addEventListener('click',async e=>{
            e.preventDefault();
            clearTagsSelected(e.target);
            createSelectTags(t.tag,true);
            window.docsPage=0;
            window.docsType=null;
            window.knowledgeTag=t.tag;

            let docs= await loadmore();
            if(docs){
                await initLeftDom(docs);
                initRightPosition();
            };
        });
        ts.appendChild(div);
    });
    return ts
};

async function initStructure(){
    let tags=await bg.getStructureTagsAndCount();
    let h=document.createDocumentFragment();
    for (const t in tags) {
        if (tags.hasOwnProperty(t)) {
            const value = tags[t];
            let td=createBaseTag(t);
            td.setAttribute("data-count",value);
            td.addEventListener('click',async e=>{
                e.preventDefault();
                clearTagsSelected(e.target);
                await createSelectTags(t,false);
                window.docsPage=0;
                window.docsType=(t=="默认")?null:t;
                //window.knowledgeTag=null;
                let docs=await loadmore();
                //console.log(docs)
                if(docs){
                    await initLeftDom(docs);
                    initRightPosition();
                };
            });
            h.appendChild(td);
        }
    }
 
    return h;
}


function initRestoreDom(){
  let restoreDom=document.getElementById("restore");
  restoreDom.classList.add("hide");
};

function initExportDom(count=0){
    let exportDom = document.getElementById("export");
    //alert(count)
    if(count==0){
        exportDom.classList.add("hide");
        // blankDom.classList.add("hide");
    }else{
        exportDom.classList.remove("hide");
        exportDom.setAttribute("data-count",count);
        // blankDom.classList.remove("hide");
    } 
    
};

async function initFirstUserDom(){
    console.log("initFirstUserDom")
    let firstUserDom=document.getElementById("first-user"),
    startDom=document.getElementById("start");
    //console.log(await bg.storageGet("userStatus"))
    if(await bg.storageGet("userStatus")=="first"){
        
        if(!startDom.getAttribute("data-evenet")){
            startDom.addEventListener("click",startDomClickEvent);
            startDom.setAttribute("data-evenet",true);
        };
        

        async function startDomClickEvent(e){
            e.preventDefault();
            let un=await bg.storageGet("userName");
            if(!un){
                alert("请输入名称")
            }else{
                if(await bg.storageGet("userStatus")=="first"){
                    //localStorage.setItem("userStatus","start");
                    await bg.storageSet("userStatus", "start");
                    if(firstUserDom) firstUserDom.remove();
                    await initMainDom();
                    initRightDom();
                    chrome.runtime.sendMessage({
                       userName:un
                    });
                }
            };
        };

        if(!document.getElementById('user-name').getAttribute("data-evenet")){
            document.getElementById('user-name').addEventListener('keyup',userNameKeyupEvent);
            document.getElementById('user-name').setAttribute("data-evenet",true);
        };

        async function userNameKeyupEvent(e){
            e.preventDefault();
            let un=e.target.value.trim();
            await bg.storageSet("userName", un);
            //localStorage.setItem("userName",un);
            document.querySelector('header h4').setAttribute("user-name",un);
            document.querySelector('header h4').addEventListener("dblclick",e=>{
                e.preventDefault();
                console.log("修改名字")
            });
        }
        return;
    }else{
        if(firstUserDom) firstUserDom.remove();
    };
};

async function initLeftDom(docs){
    let leftDom=document.querySelector('#left');
    leftDom.innerHTML="";

    //TODO分页
    console.log('TODO分页'+docs.length)
    //window.docsPage=0;
    leftDom.appendChild(
            await create(docs)
            );
    // leftDom.style.width
    }



async function initRightDom(){
    let tagsForKnowledgePannel=document.getElementById('tags-for-knowledge-pannel');
    let tagsForStructurePannel=document.getElementById('tags-for-article-structure-pannel');
    
    tagsForKnowledgePannel.innerHTML="";
    tagsForStructurePannel.innerHTML="";

    let dataAll=await bg.getData();
    let tags=await bg.getTopicTags(Array.from(dataAll.docs,t=>t.text).join(""));
    //知识tags
    tagsForKnowledgePannel.appendChild(
            await initKnowledgeTags(tags)
            );

    //结构tags
    tagsForStructurePannel.appendChild(
            await initStructure()
            );

    //自动打标
    await autoLabel();

};


//标点特征
function getPointFeature(text){
    let ps=["，","。","！","？","、"];
    ps=Array.from(ps,p=>{
        var regex = new RegExp(p, 'g'); // 使用g表示整个字符串都要bai匹配
        var result =text.match(regex);
        var count = !result ? 0 : result.length;
        return count;
    });
    return ps;
}

//自动打标
let knnClassifier=ml5.KNNClassifier();
let corpus;
let autoLabelResult={};
//window.autoLabel=autoLabel;
async function autoLabel(){

    //用来准备训练分类模型
    let dataAll=await bg.getData();
    let ids=Array.from(dataAll.docs,doc=>doc.id);
    let texts=Array.from(dataAll.docs,doc=>doc.text);
    let words=Array.from(dataAll.docs,doc=>{
        //doc.words=doc.words.replace(/1/ig,"aa").replace(/2/ig,"bb").replace(/3/ig,"cc").replace(/4/ig,"dd");
        //console.log(doc.wordsZh);
        return doc.wordsZh
    });

    let labels=Array.from(dataAll.docs,doc=>doc.type||"默认");

    corpus=new Corpus(ids,words);
 
    let vectors=Array.from(dataAll.docs,(doc,i)=>corpus.getDocumentVector(doc.id));
    
    let unLabels=[];
    Array.from(vectors,(vector,i)=>{
        // console.log()
        let features=Array.from(vector,v=>v[1]);

        // 长度也作为特征
        //console.log(features.length,words[i].length)
        features.push(words[i].length);
        //标点特征
        features.push(getPointFeature(texts[i]));

        if(labels[i]!="默认") {
            knnClassifier.addExample(features, labels[i])
        }else{
            unLabels.push(i);
        };
    });

    Array.from(unLabels,u=>{
        let features=Array.from(vectors[u],v=>v[1]);
        //长度特征
        features.push(words[u].length);
        //标点特征
        features.push(getPointFeature(texts[u]));

        knnClassifier.classify(features, (err, result) => {
            //console.log(err,result)
            if(result){
                let res=result.confidencesByLabel;
                let types={};
                for (const key in res) {
                    if (res.hasOwnProperty(key)) {
                        const score = res[key];
                        if(score>0){
                            types[key]=score;
                        }
                    }
                };
                autoLabelResult[ids[u]]=JSON.stringify(types,null,2);
            }
            //console.log(ids[u],texts[u],types); // result.label is the predicted label
        });
    });
}

//加载更多
async function loadmore(){
    // window.docsPage++;
    if(window.docsPage==null) return;
    let res={};
    if(window.knowledgeTag){
        //console.log(window.knowledgeTag,window.docsType,window.docsPage)
        res=await bg.searchFind(window.knowledgeTag,window.docsType,window.docsPage);
    }else{
        if(window.docsType==null||window.docsType=="默认"){
            res=await bg.getDataByPage(window.docsPage,15,window.sortKey);
        }else{
            res=await bg.searchFind(window.knowledgeTag,window.docsType,window.docsPage);
        } 
    }

    window.docsPage=res.next;
    //console.log(res)
    return res.docs;
    
};

//控制0素材的时候的提示
async function checkIsBlank(count=0){
    let blankDom=document.getElementById('data-blank');
    //有素材
    if(count>0){
        //非第一次使用
        //第一次使用
        blankDom.classList.add('hide');
    }else{
    //无素材
        if(await bg.storageGet("userStatus")!="first"){
            //非第一次使用
            blankDom.classList.remove('hide');
           
        }else{
            //第一次使用
            blankDom.classList.add('hide');
        }
    }
}

async function initMainDom(data,sortKey){
    data=data||await bg.getDataByPage(1,15,sortKey||'updateDate');
    window.docsPage=data.next;
    
    let mainDom=document.querySelector("main");
    let count=await bg.getDataLength();
    console.log(data,count);
    initExportDom(count);
    checkIsBlank(count);
    if(data.docs&&count>0){
        if(await bg.storageGet("userStatus")!="first"){
            window.knowledgeTag=null;
            await initLeftDom(data.docs);
            mainDom.classList.remove("hide");
        }
    }else{
        mainDom.classList.add("hide");
    }
};

//显示用户名
async function initUserName(){
    let un=await bg.storageGet("userName");
    if(un){
        document.querySelector("header h4").setAttribute("user-name",un);
    }
}


//右侧的标签栏复原
function initRightPosition(){
    let  rightDom=document.getElementById('right');
    rightDom.classList.remove("fixed-top");
    rightDom.style.width="auto";
}

async function init(auto=true){
    if(isRunInit==true)return;
    isRunInit=true;

    initRestoreDom();
    initExportDom(await bg.getDataLength());
    await initFirstUserDom();
    initUserName();

    if(auto&&(new Date()).getTime()-countTime<1000) {
        isRunInit=false;
        console.log("---不执行----",(new Date()).getTime()-countTime)
        return
    };
    
    countTime=(new Date()).getTime();
    console.log("-----init-----")
    //let data=await bg.getDataByPage();
    await initMainDom();
    initRightDom();
    isRunInit=false;
};



window.onload= async function(){
    
    await init(false);

    //显示状态切换
    document.addEventListener('visibilitychange',async (e)=>{
        e.preventDefault();
        console.log((new Date()),!document.hidden)
        if(!document.hidden){
           await init();
        }
    });

    document.getElementById('scroll-top').addEventListener('click',e=>{
        e.preventDefault();
        window.scroll(0,0);
    });

    window.addEventListener("scroll",async e=> {
        let leftDom=document.querySelector('#left'),
        rightDom=document.getElementById('right');

        let rRect=rightDom.getBoundingClientRect();
        
        let lRect=(leftDom.getBoundingClientRect());
       // console.log(lRect.height)
        if(lRect.height>window.outerHeight){
            // console.log(lTop,rRect.top,rRect)
            if(rRect.top<0&&lRect.top<0){
                rightDom.classList.add("fixed-top");
                rightDom.style.left=rRect.x+"px";
                rightDom.style.width=rRect.width+"px";
                // console.log(rRect)
            };
            if(rRect.top<=0&&lRect.top>=0){
                initRightPosition();
            }
        };

        let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        let clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
        let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        //console.log(scrollTop,lRect.top)
        if(scrollHeight > clientHeight && scrollTop + clientHeight === scrollHeight) {
            //loadmore();
            let leftDom=document.querySelector('#left');
            let  docs=await loadmore();
            leftDom.appendChild(
                    await create(docs)
                    );
        };
    });

    Array.from(['updateDate','hotScore'],h=>{
        document.getElementById(h).addEventListener('click',async e=>{
            e.preventDefault();
            clearTagsSelected(e.target);
            await createSelectTags(e.target.innerText,true);
            initMainDom(null,h);
            initRightPosition();
            window.sortKey=h;
            window.docsType=null;
            window.knowledgeTag=null;
        });
    });

    document.getElementById("export").addEventListener('click',async (e)=>{
        e.preventDefault();
        let dURL=await bg.getDownloadURL();
        try {
            chrome.downloads.download(dURL, (res) => {
                console.log(res);
            });
        } catch (error) {
            console.log(error)
        }
        
    });

    document.getElementById("import").addEventListener('click',e=>{
        e.preventDefault();
        let input=document.createElement('input');
        input.setAttribute('type','file');
        input.setAttribute('accept','.zip');
        input.click();
        input.addEventListener('change',async e=>{
            e.preventDefault();
            let data=await bg.readDataZip(input.files[0]);
            chrome.runtime.sendMessage({import:data},async function(response) {
                    if(response=='success'){
                        alert("导入成功");
                        document.getElementById("restore").classList.remove("hide");
                        init(false);
                    }else if(response=='error'){
                        alert("导入失败,请检查文件格式");
                    };
                });
        })
    });

    document.getElementById("restore").addEventListener('click',e=>{
        e.preventDefault();
        chrome.runtime.sendMessage({restore:true}, function(response) {
            if(response=='success'){
                alert("恢复成功");
                init(false);
            };
        });
    });
    
    
    document.body.addEventListener('click',e=>{
        e.preventDefault();
        if(!(e.target.parentElement.classList.contains('edit')===true||e.target.classList.contains('edit')==true)){
            clearAllContenteditable();
        };
    });

    if(chrome.runtime.onConnect){
        chrome.runtime.onConnect.addListener(function(port) {
           if(port.name == 'new-change') {
                port.onMessage.addListener(function(msg) {
                    init();
                });
            }
        });
    };
    
    //加载word2vec模型
    // if(chrome.runtime){
    //     chrome.runtime.sendMessage({loadModel:true}, function(response) {
    //         if(response=='success'){
    //             document.getElementById("load-model").innerText="加载成功";
    //         };
    //     });
    // }
}