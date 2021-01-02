import '../img/icon-128.png'
import '../img/icon-34.png'
import '../img/default.png'

import { Corpus } from "./lib/tiny-tfidf";
 


const pinyin = require("pinyin");
const JSZip = require("jszip");
// window.JSZip=JSZip;
import titles from "./base/titles";
import mbaHighlight from "./base/mba-highlight";
import baikeHighlight from "./base/baike-highlight";

import { Segment, useDefault, cnPOSTag, enPOSTag } from './lib/segmentit.js';
import FlexSearch from './lib/flexsearch.min.js';
import md5 from './lib/md5.js';

const segmentit = useDefault(new Segment());

//import ml5 from './lib/ml5.min.js';


//let word2Vec =null;

let searchIndex = null,
    __findResult = [],
    __targetId = null;

//initSearch();

//数据
//tag标准
let tagsForArticleStructure = ["标题", "案例", "金句", "开头", "结尾", "营销", "数据", "历史", "访谈","定义","观点"],
    tagsForKnowledge = ['推荐', '开源项目', 'UI', '城市设计', '建筑', '建筑环境', '建筑设计', '建筑立面', '未来城市',
        '论文', '课程', '人工智能辅助设计', '视频', '视频', '游戏', '因果关系',
        '归因', '数据科学', '端智能', '前端智能', '虚拟偶像', '艺术', '体育', '舞蹈', '摄影', '法律', '美食',
        '工具', '智能设计', '构图', '布局', '设计', '色彩', '字体', '社交', '生物黑客', '教育', '职业规划',
        '面试', 'AR', 'VR', '谷歌', '设计', '宁静技术', '三维重建', '智能产品'
    ];




const insertTargetSites = [{
    reg: new RegExp('.*yuque\.antfin\-inc\.com.*\/edit'),
    name: '语雀'
}, {
    reg: new RegExp('.*shimo.im\/docs\/.*'),
    name: '石墨文档'
}];

const HighlightTargetSites = {
    "wiki.mbalib.com": mbaHighlight,
    "baike.baidu.com": baikeHighlight
};

//匹配是否是-标注-目标网站
function checkIsHighlightTargetSites(host) {
    return HighlightTargetSites[host];
};

//匹配是否是-写作-目标网站
function checkIsInsertTargetSites(url) {
    // console.log(url)
    // if(url.match("chrome-extension://"))return '插件' 
    for (let index = 0; index < insertTargetSites.length; index++) {
        const s = insertTargetSites[index];
        if (url.match(s.reg)) {
            return s.name;
        }
    };
}



//console.log(md5)
function checkIsPunctuation(text) {
    // console.log(text)
    let res = segmentit.doSegment(text, {
        stripPunctuation: false
    });
    // console.log(res)
    res = Array.from(res, r => {
        if (r.p == 2048) {
            return 0
        } else {
            return r.w.length
        };
    });
    return res;
};

//字典加载
async function updateKnowledgeToDict(tags) {
    tags = tags || await getTopicTagsUserDefine();
    let kDict = Array.from(tags, t => {
        return `${t}|0x0008|100000`
    }).join("\n");
    segmentit.loadDict(kDict);
}

//分词
function segment(text) {
    // console.log(segmentByWord(text))
    let res = segmentit.doSegment(text, {
        stripPunctuation: true
    });
    res = Array.from(res, r => r.w);
    return res;
};


//转拼音
function text2pinyin(text) {
    return pinyin(text, { style: pinyin.STYLE_TONE2 });
};

//建立素材池
//默认按照拼音排序
//0 拼音 1 中文分词
function initRank(docs,byType=0) {
    //要用拼音或英文来计算
    let corpus = new Corpus(
        Array.from(docs, d => d.id),
        Array.from(docs, d => byType==0?d.words:d.wordsZh)
    );
    // print top terms for document 3
    //console.log(corpus.getTopTermsForDocument("document3"));
    return corpus
};

//排序
// 0 表示按拼音排序，1 按中文排序
function rankPyOrZh(tag="", corpus=null, docs={},byType=0) {
    //console.log("tag:",tag)
    let res = corpus.getResultsForQuery(byType==0?text2pinyin(tag).join(""):tag);
    let maxScore=0;

    res = Array.from(res, r => {
        let id = r[0],
            score = r[1];
        let doc=docs[id];
        //console.log(doc)
        doc.displayText = displayText(doc.text);
        doc.score = score;
        if(score>maxScore){
            maxScore=score;
        }
        return doc
    });

    res=Array.from(res,r=>{
        
        if(maxScore>0){
            r.score=r.score/maxScore;
        }
        
        return r;
    });

    return res
};

//加和
function addVecs(texts){
    if(texts&&texts.length>0){
        let firstTensor=texts[0];
        for (let index = 0; index < texts.length; index++) {
            const t = texts[index];
            firstTensor=ml5.tf.add(firstTensor, t);
        };
        firstTensor=firstTensor.dataSync();
        return firstTensor;
    }else{
        return [];
    }
}

//按word2vec排序
async function rankByWord2vec(text="",docs={}){
    if(!word2Vec) await doRequestLoadModel();

    let texts=text.split(" ");
    //console.log(texts,word2Vec)
    texts=Array.from(texts,t=>word2Vec.model[t]?word2Vec.model[t].dataSync():null);
    texts=texts.filter(t=>t);

    //加和
    texts=addVecs(texts);

    //
    let res=[];
    let maxScore=0;
    //ml5.tf.add([23],[32]).dataSync()
    for (const id in docs) {
        if (docs.hasOwnProperty(id)) {
            let doc = docs[id];
            doc.wordsZh=doc.wordsZh.split(" ");
            console.log(doc.wordsZh)
            doc.wordsZh=Array.from(doc.wordsZh,t=>word2Vec.model[t]?word2Vec.model[t].dataSync():null);
            doc.wordsZh=doc.wordsZh.filter(t=>t);
            
            //加和
            doc.wordsZh=addVecs(doc.wordsZh);
            doc.score = ml5.tf.util.distSquared(texts, doc.wordsZh);
            //console.log(text,doc.score,doc.text)
            if(doc.score>maxScore){
                maxScore=doc.score;
            };
            res.push(doc);
        }
    };

    res=Array.from(res,r=>{
        if(maxScore>0){
            r.score=r.score/maxScore;
        };
        r.score=1-r.score;
        return r
    });

    //console.log(ml5)
    return res
}

//三种排序方法的集合
async function rank(text, corpusPy,corpusZh, docs){
    //alert(text)
    //text是分过词的结果 ，已空格隔开

    //拼音排序
    let docsList=rankPyOrZh(text,corpusPy,docs,0);
    docsList=Array.from(docsList,doc=>{
        doc.scorePy=doc.score;
        return doc;
    });
    //中文排序
    docsList=rankPyOrZh(text,corpusZh,docs,1);
    docsList=Array.from(docsList,doc=>{
        doc.scoreZh=doc.score;
        return doc;
    });

    //word2vec排序
    // docsList=await rankByWord2vec(text,docs);
    // docsList=Array.from(docsList,doc=>{
    //     doc.scoreVec=doc.score;
    //     doc.score=((doc.scorePy||0)+(doc.scoreZh||0)+(doc.scoreVec||0))/3
    //     return doc;
    // });

    //排序
    docsList=docsList.sort((b,a)=>{
        return a.score-b.score
    });
    return docsList
}

//精排数据转化
function docs2maps(docs = []) {
    let maps = {};
    docs = Array.from(docs, d => {
        d.words = text2pinyin(segment(d.text).join(" ")).join("");
        d.wordsZh = segment(d.text).join(" ");
        maps[d.id] = d;
        return d;
    })
    return {
        docs,
        maps
    }
};


//根据查询词搜索相似的知识
function autoFindKnowledge(text, data) {
    let result = 0;
    //console.log(result)
    if (data.docs.length == 0) return result;
    let corpus = initRank(data.docs);

    //分词
    let q = (segment(text)).join(" ").trim();
    //console.log(q.replace(/\d+|\s/ig,'').trim(),'===',q)
    if (q.replace(/\d+|\s/ig, '').trim() != "") {
        //rank里会转拼音
        result = rankPyOrZh(q, corpus, data.maps);
        result = Array.from(result, r => {
            return r.score
        });
        if (result.length > 0) {
            result = result.reduce((prev, curr) => {
                return prev + curr
            });
        } else {
            result = 0;
        }
        //console.log("result:",result);
    };

    return result;
};


// 计算当前文档的主题词
async function getTopicTags(text) {
    let userTags = await getTopicTagsUserDefine();

    text = text.trim();
    let tags = {};
    segmentit.doSegment(text).map(i => {
        //console.log(i.w,enPOSTag(i.p))
        //只要名词 n ns nz nr
        if (("n ns nz nr".split(" ")).includes(enPOSTag(i.p)) && i.w.length > 1) {
            if (!tags[i.w]) {
                tags[i.w] = 0;
            };
            //console.log(userTags.includes(i.w))
            let score = userTags.includes(i.w) ? 10 : 1;
            tags[i.w] += score;
        }
    });
    //.filter(t=>!!t);
    return tags
};

//用户自定义的主题词
async function getTopicTagsUserDefine() {
    let tags = (await getAllTags()).tagsForKnowledge;
    return tags;
}


//获取所有标签
async function getAllTags() {
    let tags = await storageGet("tags");
    // let tags=localStorage.getItem("tags");
    if (tags) {
        tags = JSON.parse(tags);
    } else {
        tags = { tagsForArticleStructure, tagsForKnowledge };
    }
    return tags
}

//更新知识标签
async function addKnowledgeTag(tag) {
    if (!tag || (tag && tag.trim() == "")) return false;
    tag = tag.trim();
    let tags = await getAllTags();
    let kts = tags.tagsForKnowledge;

    let isNew = false;
    if (kts.includes(tag) == false) {
        kts.push(tag);
        await addTagsToStorage(tags.tagsForArticleStructure, kts);
        await updateKnowledgeToDict(kts);
        isNew = true;
    };

    return isNew
}



//获取结构tags
async function getStructureTags() {
    let tags = (await getAllTags()).tagsForArticleStructure;
    return tags;
}

//统计标签对应的知识库素材数量
async function getStructureTagsAndCount(){
    let tags=await getStructureTags();
    let ds=await getData();
    let ntags={};
    Array.from(tags,t=>{
        ntags[t]=0;
    });
    Array.from(ds.docs,doc=>{
        let t=doc.type;
        if(doc.type=="默认"||!doc.type){
            t="默认";
        };
        if(ntags[t]==undefined){
            ntags[t]=0;
        };
        ntags[t]++;
    });
    return ntags;
}


//标签排序
function tagsRank(tags) {
    let res = [];
    for (var key in tags) {
        if (tags[key] > 1) {
            res.push({ tag: key, score: tags[key] });
        }
    };
    return res.sort((b, a) => a.score - b.score);
}




// console.log(searchIndex)


//新增素材
//ref 来源
//userName 收集者
function update(id, text, ref, userName) {
    console.log(userName)
        // let words=segment(text);
        // console.log('--new--',words);
    try {
        searchIndex.remove(searchIndex.find(id));
    } catch (error) {

    };
    ref = ref || {};
    searchIndex.add({
        id: id,
        text: text,
        hotScore: 0,
        createDate: (new Date()).getTime(),
        updateDate: (new Date()).getTime(),
        ref: ref,
        userName: userName
    });
};


//更新数据
function updateHotScore(id) {
    let doc = searchIndex.find(id);
    if (doc) {
        let hotScore = doc.hotScore + 1;
        doc.updateDate = (new Date()).getTime();
        searchIndex.update({...doc, hotScore })
    };
    // console.log(searchIndex.find(id))
};
//更新数据
function updateType(id, type) {
    let doc = searchIndex.find(id);
    if (doc) {
        console.log(doc)
        doc.type = type;
        searchIndex.update(doc);
    };
}
//更新数据
function updateText(id, newText) {
    let doc = searchIndex.find(id);
    if (doc) {
        doc.text = newText;
        doc.updateDate = (new Date()).getTime();
        searchIndex.update(doc);
    };
};

//根据标点切文字
function sliceText(i, ps, text) {
    if (ps[ps.length - i] <= 1) {
        text = text.slice(0, text.length - 1);
        text = sliceText(i + 1, ps, text);
    };
    return text;
};

//删除素材
function removeData(id) {
    console.log(id)
    return searchIndex.remove(searchIndex.find(id));
    //console.log(searchIndex,id,searchIndex.find(id))
};


//推荐素材
async function searchFind(text = null, type = null, page = 0) {
    //text = text || type;
    var results = searchIndex.search({
        field: ["text", "type"],
        where: type ? {
            "type": type
        } : null,
        query: text || type,
        limit: 15,
        page: page.toString(),
        suggest: true
    });
    // console.log(results, text, type)
    let docs = Array.from(results.result.sort(sortByHotScore), (t, i) => {
        t.displayText = displayText(t.text);
        t.searchIndex = i;
        if(t.text.trim()!=(text?text.trim():"")){
            return t
        };
        // t.displayText=t.text.length>44?t.text.slice(0,44)+"...":t.text;
        //return t;
    });
    docs=docs.filter(f=>{return !!f});
    
    if (text) {
        //二次排序
        text = segment(text).join(" ");

        let data = docs2maps(docs);
        
        //按拼音
        let corpusByPy = initRank(data.docs,0),
            corpusByZh = initRank(data.docs,1);
        
        docs = await rank(text, corpusByPy,corpusByZh, data.maps);
        console.log(docs)
    }

    return {
        docs: docs,
        next: results.next
    };
};

//相似素材
// function searchSimilar(t, text) {
//     var results = searchIndex.search(text, {
//         field: [
//             "text"
//         ],
//         where: {
//             "type": t
//         },
//         limit: 15
//     });
//     console.log(results)
//     let docs = Array.from(results.result.sort(sortByHotScore), (t, i) => {
//         t.displayText = displayText(t.text);
//         t.searchScore = i;
//         // t.displayText=t.text.length>44?t.text.slice(0,44)+"...":t.text;
//         return t;
//     });
//     //console.log('find-------',docs)
//     let data = docs2maps(docs);
//     let corpus = initRank(data.docs);
//     text = segment(text).join(" ");
//     //console.log(rank(text,corpus,data.maps));
//     return rank(text, corpus, data.maps);
// }


//显示的文本做处理，已控制显示的长度 displayText
//中间的空格也去掉 
function displayText(text) {
    text = text.replace(/\n|\s{2}|\<br\>/ig, "");
    let disText = text;
    if (text.length > 150) {
        let len = 50;
        let start = text.slice(0, len),
            end = text.slice(text.length - len, text.length);

        let startPs = checkIsPunctuation(start),
            endPs = checkIsPunctuation(end);

        start = sliceText(1, startPs, start);
        end = end.split("").reverse().join("");
        endPs = endPs.reverse();
        end = sliceText(1, endPs, end);
        end = end.split("").reverse().join("");
        disText = start + "... ..." + end;
    };
    return disText;
};



function sortByHotScore(a, b) {
    return b.hotScore - a.hotScore;
}

//存储数据到本地缓存
async function exportData(canRefresh = false) {
    let docs = searchIndex.export({ index: false, doc: true });
    //docs=JSON.stringify(docs);
    await storageSet("docs", docs);
    //localStorage.setItem("docs",docs);

    //用来联动的,当素材有变动的时候
    if (canRefresh == true) {
        try {
            let port = chrome.runtime.connect({ name: "new-change" });
            port.postMessage(true); //发送消息
            port.disconnect();
        } catch (error) {
            console.log(error)
        };
    };
};

//导入数据到本地缓存
async function importData() {
    let docs = await storageGet("docs");
    //let docs=localStorage.getItem("docs");
    if (docs) {
        docs=JSON.parse(docs)[0];
        for (const key in docs) {
            if (docs.hasOwnProperty(key)) {
                let doc = docs[key];
                doc.type=doc.type=="默认"?null:doc.type;
                try {
                    searchIndex.remove(searchIndex.find(doc.id));
                } catch (error) {};
                searchIndex.add(doc);
            }
        };
        //console.log(typeof(docs),docs)
        //docs=JSON.parse(docs)[0];
        //直接导入有bug
        //searchIndex.import(docs, { index: false, doc: true });
        //searchIndex.initCorpus();
    };
    let tags = await storageGet("tags");
    // localStorage.getItem("tags");
    if (!tags) {
        await addTagsToStorage(tagsForArticleStructure, tagsForKnowledge);
        await updateKnowledgeToDict(tagsForKnowledge);
    };
};


//缓存标签
async function addTagsToStorage(tagsForArticleStructure, tagsForKnowledge) {
    await storageSet("tags", JSON.stringify({
        tagsForArticleStructure,
        tagsForKnowledge
    }));
}


async function storageSet(key, value) {
    let d = {};
    d[key] = value;
    return new Promise(function(resolve, reject) {
        chrome.storage.local.set(d, function() {
            //console.log('Value is set to ',value);
            resolve();
        });
    });
}

async function storageGet(key = "docs") {
    return new Promise(function(resolve, reject) {
        // reject('失败') // 数据处理出错
        chrome.storage.local.get(key, function(result) {
            //console.log('Value currently is ',result[key]);
            // if(typeof(result)=="object"&&Object.keys(result).length==0){
            //     result=
            // }
            resolve(result[key]) // 数据处理完成
        });
    });
};


//TODO 
async function getDataByPage(page = 1, limit = 15, sortBy = "updateDate") {
    //let docs = await storageGet('docs');
    let userName = await storageGet('userName');
    let docs = await searchSortByPage(page, limit, sortBy);
    // console.log(type)
    let newDocs = [];
    if (docs) {
        for (let index = 0; index < docs.length; index++) {
            const doc = docs[index];
            doc.words = text2pinyin(segment(doc.text).join(" ")).join("");
            newDocs.push(doc);
        };
    };
    //docs用于排序之类的，data用于导出数据，username就是知识库收集者
    return { docs: newDocs, maps: docs, data: docs, userName: userName, next: newDocs.length == 15 ? (page + 1) : null };

}

//分页
//docs.slice((page - 1) * limit, (page - 1) * limit + limit);
async function searchSortByPage(page = 1, limit = 15, sortBy = "updateDate") {
    if (searchIndex == null) {
        await initSearch();
    };
    let docs = searchIndex.sort(sortBy);
    //console.log(docs)
    return Array.from(docs.slice((page - 1) * limit, (page - 1) * limit + limit), d => {
        return d;
    });
};

//增加一个全局排序
FlexSearch.prototype.sort = function(key) {
    if (this.sortKey == key && this.length == this.sortData.length) {
        return this.sortData;
    };

    this.sortData = this.where({}).sort((a, b) => {
        return b[key] - a[key];
    });

    this.sortKey = key;
    return this.sortData;
};



//词袋生成
// FlexSearch.prototype.initCorpus = function(docs) {
//     docs = docs || this.where({});
//     //要用拼音或英文来计算
//     let corpus = new Corpus(
//         Array.from(docs, d => d.id),
//         Array.from(docs, d => text2pinyin(segment(d.text).join(" ")).join(""))
//     );
//     //this.corpus = corpus;
//     // print top terms for document 3
//     //console.log(corpus.getTopTermsForDocument("document3"));
//     return corpus
// };


//取出所有数据
async function getData(sortBy = "updateDate") {
    //let docs=localStorage.getItem('docs');
    let docs = await storageGet('docs');
    let userName = await storageGet('userName');
    let newDocs = [];
    if (docs) {
        docs = JSON.parse(docs)[0];
        for (const key in docs) {
            if (docs.hasOwnProperty(key)) {
                const doc = docs[key];
                doc.words = text2pinyin(segment(doc.text).join(" ")).join("");
                //中文分词结果
                doc.wordsZh = segment(doc.text).join(" ");
                newDocs.push(doc);
            };
        };
    };

    newDocs.sort((a, b) => {
        return b[sortBy] - a[sortBy];
    });

    //docs用于排序之类的，data用于导出数据，username就是知识库收集者
    return { docs: newDocs, maps: docs, data: docs, userName: userName };
};

//下载本地的zip压缩包
async function getDownloadURL() {
    let zip = new JSZip();
    let docs = await storageGet('docs');
    docs = JSON.parse(docs)[0];
    let userName = await storageGet('userName');
    let tags = await getAllTags();

    let t = new Date();
    let timeStamp = t.getFullYear() + "-" + (1 + t.getMonth()) + "-" + (t.getDate());
    let filename = userName + "_知识库_" + timeStamp + ".zip";
    zip.folder("data")
        .file("docs.json", JSON.stringify(docs))
        .file("tags.json", JSON.stringify(tags));

    zip.file("README.md", `by ${userName} \n ${timeStamp}`);

    let blob = await zip.generateAsync({ type: "blob" })
    return {
        filename: filename,
        url: URL.createObjectURL(blob),
        saveAs: true
    };
};

//读取zip知识包
async function readDataZip(content) {
    var new_zip = new JSZip();
    // more files !
    let zip = await new_zip.loadAsync(content);
    let docs = await zip.folder("data").file("docs.json").async("string");
    docs = JSON.parse(docs);
    let tags = await zip.folder("data").file("tags.json").async("string");
    tags = JSON.parse(tags);
    // console.log(docs,tags)
    return { docs, tags }
}



function checkContentIsNew(id) {
    let doc = searchIndex.find(id);
    let isNew = !doc;
    return isNew;
};

//从剪切板获取数据
function getClipboardData() {
    var pasteNode = document.getElementById('paste');
    pasteNode.value = '';
    pasteNode.focus();
    pasteNode.selectionStart = pasteNode.selectionEnd = 0;
    if (!document.execCommand('paste')) {
        // TODO(mihaip): error handling
        console.log('Couldn\'t paste into pasteNode');
        return;
    }
    return pasteNode.value;
};

//拷贝至剪切板
//拷贝至剪切板
function copyToClipboard(text) {
    // console.log("拷贝",text)
    var t = document.getElementById("copy");
    t.value = text.trim();
    t.select(); // 选择对象
    document.execCommand("copy");
}

//创建id，把文本中的标点 空格去掉
//console.log(segmentit.doSegment('一人得道，鸡犬升天').map(i => `${i.w} <${cnPOSTag(i.p)}> <${enPOSTag(i.p)}>`))
function createTextId(text) {
    text = text.trim();
    let nt = segmentit.doSegment(text).map(i => {
        if (enPOSTag(i.p) === 'w') {
            i.w = "";
        };
        return i.w
    }).join("").toLowerCase();
    // console.log(nt)
    let id = md5(nt);
    return id
}

function sendMessageToContentScript(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
            if (callback) callback(response);
        });
    });
};


async function doRequestUpdate(reqUpdate) {
    let userName = await storageGet('userName');
    //新入库素材数量
    let newCount = 0;
    //新的素材入库 ,取文本的md5 

    for (let i = 0; i < reqUpdate.length; i++) {
        let { id, text, ref } = reqUpdate[i];
        text = text.trim();
        id = createTextId(text);
        console.log('doRequestUpdate', reqUpdate.length, checkContentIsNew(id), text, userName)
        if (text && text !== "" && checkContentIsNew(id)) {
            await update(id, text, ref, userName);
            newCount++;
        };
    };
    // Array.from(reqUpdate,content=>{

    // });

    await exportData(true);
    if (newCount > 0) setBadge('NEW');
    //通知popup更新
    let views = chrome.extension.getViews({ type: 'popup' });
    if (views.length > 0) {
        views[0].document.getElementById('find_result_count').innerText = `新增${newCount}条，库存${searchIndex.length}条`;
    };

    return {
        count: newCount,
        text: '已更新索引'
    }
};

async function doRequestFind(reqFind) {
    //setBadge("🔍");
    let findResult =await searchFind(reqFind);
    findResult = findResult.docs;
    //__targetId=request.targetId;
    //console.log(findResult)
    let num = findResult.length;

    if (num > 0) {
        if (num > 9) {
            num = "10+"
        } else {
            num = num.toString();
        };
        setBadge(num, true);
        localStorage.setItem("findResult", JSON.stringify(findResult));
        localStorage.setItem("find", reqFind);
    } else {
        setBadge("");
        localStorage.removeItem("findResult");
        localStorage.removeItem("find");
    }

    //
    //console.log('baidu-title:', await titles(reqFind));

    return findResult;
}

function doRequestReset() {
    // __findResult=null;
    // __targetId=null;
    localStorage.setItem("findResult", null);
    chrome.browserAction.setBadgeText({ text: "" });
    return true
};

async function doRequestSuggestTopicTags(tags) {
    await getTopicTags(tags);
    return true;
};

//插入
async function doRequestInsert(doc) {
    sendMessageToContentScript({ insert: doc }, async(response) => {
        console.log('来自content的回复：', response);
        updateHotScore(doc.id);
        await exportData(true);
    });
};

//拷贝
async function doRequestHotScore(id) {
    updateHotScore(id);
    await exportData(true);
};

async function doRequestSuggestType(id, t) {
    updateType(id, t);
    await exportData();
}

async function doRequestSuggestUpdateText(id, text) {
    updateText(id, text);
    await exportData();
}

async function doRequestRemove(id) {
    let r = removeData(id);
    //console.log(r)
    await exportData();
    return r.length
}


//TODO 导入知识点暂未支持
async function doRequestImport(imData) {
    //导入知识点
    let tags = imData.tags;
    let tagsForArticleStructure = tags.tagsForArticleStructure,
        tagsForKnowledge = tags.tagsForKnowledge;

    //检查哪些已经有的
    let oldTags = await getAllTags();
    //
    Array.from(tagsForArticleStructure, t => {
        if (oldTags.tagsForArticleStructure.includes(t) == false) {
            oldTags.tagsForArticleStructure.push(t);
        }
    });

    Array.from(tagsForKnowledge, t => {
        if (oldTags.tagsForKnowledge.includes(t) == false) {
            oldTags.tagsForKnowledge.push(t);
        }
    });

    await addTagsToStorage(oldTags.tagsForArticleStructure, oldTags.tagsForKnowledge);
    await updateKnowledgeToDict(oldTags.tagsForKnowledge);


    //TODO done
    let bk = await backup();
    //console.log(bk)
    try {
        //增量，而不是替换
        bk = bk ? bk[0] : {};
        let docs = imData.docs;
        for (let key in docs) {
            let doc = docs[key];
            doc.type=doc.type=="默认"?null:doc.type;
            if (!bk[key]) {
                searchIndex.add(doc);
            };
        };
        await exportData();
        console.log("import success",searchIndex)
        return "success";
    } catch (error) {
        console.log('导入失败：', error)
        await restore();
        return 'error';
    };
};

async function doRequestRestore() {
    await restore();
    return "success";
}

async function doRequestUserName(un) {
    await storageSet("userName", un);
    return 'success'
}



//自动发现知识---- 有一个阈值 ，可以交给用户控制
async function doRequestHighlight(host, html) {
    let threshold = 1000;
    let data = await getData();

    let div = document.createElement("div");
    div.innerHTML = html;
    //console.log(div)
    let fun = checkIsHighlightTargetSites(host);
    let texts;
    if (fun) {
        texts = fun(div);
        for (let index = 0; index < texts.length; index++) {
            const text = texts[index];
            let score = autoFindKnowledge(text.text, data);
            // console.log(score)
            texts[index].score = score;
        }
        texts = texts.sort((a, b) => {
            return b.score - a.score
        });
        let maxScore = texts[0].score;
        if (maxScore > 0) {
            // 符合你的知识库的知识
            texts = Array.from(texts, t => {

                if (t.score >= threshold) {
                    //调试用的
                    t.oldScore = t.score;
                    t.score = t.score / maxScore;
                    if (t.score > 0.5) return t;
                }

            }).filter(f => { return !!f });
        } else {
            texts = null;
        }
        //console.log(texts)
    };

    // if(texts&&texts.length>0){

    //     getCurrentTabId(tabId=>{
    //         chrome.tabs.insertCSS(tabId, {file: '../css/highlight.css'});
    //     });

    // };

    return texts
}



async function doRequestInsertTargetSite(url) {
    return checkIsInsertTargetSites(url)
}

async function doRequestLoadModel(t){
    if(!word2Vec){
        word2Vec=1;
        return new Promise(function(resolve, reject) {
            word2Vec = ml5.word2vec('wordvecs.json', ()=>{
                // When the model is loaded
                console.log('Model Loaded!');
                console.log(word2Vec);
                resolve('success');
            });
        });
    }else{
        return 'success';
    }  
}

// 获取当前选项卡ID
function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    initSearch();

    if (request.update) {
        doRequestUpdate(request.update).then(sendResponse);
        return true;
    } else if (request.find) {
        doRequestFind(request.find).then(sendResponse);
        return true;
    } else if (request.reset) {
        doRequestReset();
        sendResponse();
    } else if (request.suggestTopicTags) {
        //根据主题词推荐素材
        doRequestSuggestTopicTags(request.suggestTopicTags).then(sendResponse);
        return true;
    } else if (request.insert) {
        //记录文案被使用的次数
        doRequestInsert(request.insert).then(sendResponse);
        return true;
    } else if (request.hotScore) {
        doRequestHotScore(request.id);
        sendResponse(true);
    } else if (request.type) {
        //更新素材的类型
        doRequestSuggestType(request.id, request.type).then(sendResponse);
        return true;
    } else if (request.updateText) {
        //在options页面,修改素材
        doRequestSuggestUpdateText(request.id, request.updateText).then(sendResponse);
        return true;
    } else if (request.remove) {
        doRequestRemove(request.id).then(sendResponse);
        return true;
    } else if (request.import) {
        //TODO done
        doRequestImport(request.import).then(sendResponse);
        return true;
    } else if (request.restore) {
        //复原数据
        doRequestRestore().then(sendResponse);
        return true;
    } else if (request.setBadge) {
        setBadge(request.setBadge);
        sendResponse(true);
    } else if (request.getClipboardData) {
        //console.log("request.getClipboardData",getClipboardData())
        sendResponse(getClipboardData());
    } else if (request.copyToClipboard) {
        copyToClipboard(request.copyToClipboard);
        sendResponse(true);
    } else if (request.userName) {
        doRequestUserName(request.userName).then(sendResponse);
        return true;
    } else if (request.highlight) {
        doRequestHighlight(request.highlight, request.html).then(sendResponse);
        return true;
    } else if (request.isTargetSite) {
        doRequestInsertTargetSite(request.isTargetSite).then(sendResponse);
        return true;
    }else if(request.loadModel){
        //doRequestLoadModel(request.loadModel).then(sendResponse);
        //return true;
    }
    // console.log(request, sender, sendResponse);
    // sendResponse('--已更新索引- ' +searchIndex.length);
});

//备份
async function backup() {
    let docs = await storageGet("docs");
    // let docs=localStorage.getItem('docs');
    if (docs) {
        await storageSet('docs_bk', docs)
            // localStorage.setItem();
        return JSON.parse(docs)
    };
};
//复原
async function restore() {
    let docs = await storageGet("docs_bk");
    //let docs=localStorage.getItem('docs_bk');
    //localStorage.setItem('docs',docs);
    await storageSet('docs', docs)
    await importData();
}


function setBadge(text, isInfinite) {
    if (text.trim() != "") {
        text = text.toString();
        chrome.browserAction.setBadgeText({ text: text });
        chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
        if (!isInfinite) {
            setTimeout(() => {
                setBadge('');
            }, 5000);
        }
    } else {
        text = text.toString();
        chrome.browserAction.setBadgeText({ text: text });
        chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 0] });
    };
};


//初始化搜索
//增加标签
async function initSearch() {
    if (searchIndex == null) {
        searchIndex = new FlexSearch({
            encode: false,
            tokenize: function(str) {
                return segment(str);
                // return str.replace(/[\x00-\x7F]/g, "").split("");
            },
            depth: 3,
            doc: {
                id: "id",
                field: ["text", "type"],
                tag: ["type", "knowledge"]
            },
        });
        await importData();
    }
};

//返回素材数量
async function getDataLength(){
    if (searchIndex == null) {
        await initSearch();
    };
    return searchIndex.length
}

chrome.runtime.onStartup.addListener(function(){
    console.log("----onStartup----")
});
//当插件安装的时候
chrome.runtime.onInstalled.addListener(async function() {
   // console.log(searchIndex)
    console.log("----onInstalled----")
    //if (searchIndex != null) return;
    searchIndex=null;
    //初始化
    await initSearch();

    //await importData();

    //右键菜单
    Array.from([{
        id: 'add-knowledge',
        title: '+ %s',
        contexts: ['selection'],
        visible: true
    }], m => {
        chrome.contextMenus.create(m);
    });

    chrome.contextMenus.onClicked.addListener(async function(info, tab) {
        if (info.menuItemId == 'add-knowledge') {
            let text = info.selectionText.trim();
            let id = createTextId(text);
            //console.log(info,tab,info.selectionText)
            if (text && text !== "" && checkContentIsNew(id)) {
                await doRequestUpdate([{
                    id: id,
                    text: text,
                    ref: { favIconUrl: tab.favIconUrl, title: tab.title, url: tab.url }
                }]);
            };
            //chrome.tabs.create({url: 'https://www.baidu.com/s?ie=utf-8&wd=' + encodeURI(info.selectionText)});
        };
        // if (info.menuItemId == 'add-new-tag') {
        //     let text = info.selectionText.trim();
        //     await addKnowledgeTag(text);
        // }
    });

    //alert("安装成功,请重启chrome浏览器");
    if(!(await storageGet('userName'))){
        await storageSet("userStatus", "first");
        //console.log(searchIndex)
        if (confirm("安装成功，请重启chrome浏览器后，查看使用指南")) {
            chrome.runtime.openOptionsPage();
        } else {
            //alert("再见啦！");
            
        }
    }else{
        chrome.runtime.openOptionsPage();
    };

    

    
});




//书签创建的时候
chrome.bookmarks.onCreated.addListener(function() {
    //alert("书签创建")
});


//需要暴露的方法
window.checkIsHighlightTargetSites = checkIsHighlightTargetSites;
window.checkIsInsertTargetSites = checkIsInsertTargetSites;

window.displayText = displayText;

window.getAllTags = getAllTags;
window.getTopicTags = getTopicTags;
window.getStructureTags = getStructureTags;
window.getStructureTagsAndCount=getStructureTagsAndCount;
window.getTopicTagsUserDefine = getTopicTagsUserDefine;

window.tagsRank = tagsRank;
window.text2pinyin = text2pinyin;
window.initRank = initRank;
window.docs2maps = docs2maps;

window.rank = rank;
window.segment = segment;
window.setBadge = setBadge;

window.getData = getData;
window.getDataByPage = getDataByPage;
window.getDownloadURL = getDownloadURL;
window.readDataZip = readDataZip;
window.storageGet = storageGet;
window.storageSet = storageSet;
window.searchIndex = function(){
    return searchIndex
};
// window.word2Vec = function(){
//     return word2Vec
// };

window.getDataLength=getDataLength;
window.getClipboardData = getClipboardData;

window.searchFind = searchFind;
// window.searchSimilar = searchSimilar;

window.importData = importData;