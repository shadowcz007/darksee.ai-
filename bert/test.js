// const tf = require('@tensorflow/tfjs-node');
// const use = require('@tensorflow-models/universal-sentence-encoder');

// tf.node.getMetaGraphsFromSavedModel('./model/universal-sentence-encoder-multilingual-qa_3').then(r => {
//     console.log(r)
// })
// tf.node.loadSavedModel('./model/universal-sentence-encoder-multilingual-qa_3', ['serve'], 'default').then(model => {
//     console.log(model)
// });

const { Bert, Clusters } = require('./main');

let bert = new Bert();
let clusters = new Clusters();

bert.init().then(async() => {
    let ws = `www。baidu.com
    你是谁
    我是谁
    他是谁
    我是你妈
    我是你爸
    他是你的朋友
    我不知道是谁
    今天天气不错
    外面下大雨了
    在这篇文章中，我们使用 Elasticsearch 和 BERT 实现了搜索引擎。虽然 BERT 的执行速度存在问题，但是像这样将 BERT 作为一个独立的容器来处理很容易扩展，所以我认为这个问题是可以解决的。我希望这篇文章对你有用。
    英文原文：https://towardsdatascience.com/elasticsearch-meets-bert-building-search-engine-with-elasticsearch-and-bert-9e74bf5b4cf2
    本文地址：https://www.6aiq.com/article/1594084088157
    真可怜`.split("\n");

    ws = Array.from(ws, w => w.trim());

    let scores = await bert.textsRank("你爸妈是谁？", ws);
    console.log(scores);
    let cs = clusters.kmeans(4, bert.vectors);
    let classes = {};
    for (let index = 0; index < cs.length; index++) {
        const c = cs[index];
        if (!classes[c]) {
            classes[c] = [];
        };
        classes[c].push(ws[index]);
    }
    console.log(classes)
});