const FlexSearch = require("flexsearch");
const Db = require('./db');
// console.log(FlexSearch)
class Search {
    constructor() {
        let data = Db.all();
        this.index = FlexSearch.create();
        data.forEach(d => {
            // console.log(d)
            this.index.add(d.id, d.text + " " + Array.from(d.tags, t => t.value).join(" ") + " " +
                Array.from(d.urls, t => t.title).join(" "))
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