const FlexSearch = require("flexsearch");
const { load, cut } = require('@node-rs/jieba')
load();

const Db = require('./db');
// console.log(FlexSearch)
class Search {
    constructor() {

        let data = Db.all();
        this.index = FlexSearch.create({
            encode: false,
            tokenize: function(str) {

                // 提取中文
                let zhs = str.replace(/[\x00-\x7F]/g, "").split("");

                // 提取词
                let words = cut(str, false);

                // 提取英文
                let ens = Array.from(words, t => {
                    t = t.trim();
                    if (t.match(/[\x00-\x7F]/g) && t.length > 1) {
                        return t.toLocaleLowerCase();
                    }
                }).filter(f => f);

                // console.log(words)
                return [...words, ens, ...zhs]
            }
        });

        data.forEach(d => {

            let indexText = d.text + " " + Array.from(d.tags, t => t.value).join(" ") + " " +
                Array.from(d.urls, t => t.title).join(" ");
            console.log(indexText)
            this.index.add(d.id, indexText);

        })
    }
    find(text) {
        return new Promise((resolve, reject) => {
            this.index.search(text, function(result) {
                resolve(Array.from(result, id => Db.get(id)));
            });
        })

    }
}





module.exports = new Search();