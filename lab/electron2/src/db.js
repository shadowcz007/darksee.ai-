const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const hash = require('object-hash');
const adapter = new FileSync('db.json')
const db = low(adapter)



// // Add a post
// db.get('posts')
//   .push({ id: 1, title: 'lowdb is awesome'})
//   .write()

// // Set a user using Lodash shorthand syntax
// db.set('user.name', 'typicode')
//   .write()

// // Increment count
// db.update('count', n => n + 1)
//   .write()

window.db = db;

class Db {
    constructor() {
        // Set some defaults (required if your JSON file is empty)
        db.defaults({
                knowledges: []
            })
            .write()
        this.key = "knowledges";
    }

    check(data) {
        //校验数据
        // id: t.topic_id,
        // text: string,
        // tags: tags, {value,type}
        // urls: urls,
        // images: imagesBase

        delete data.id;

        data.id = hash(data);

        if (!data.createTime) data = Object.assign(data, { createTime: (new Date()).getTime() })
            //createTime
        return data;
    }

    size() {
        return db.get(this.key)
            .size()
            .value()
    }

    get(id) {
        return db.get(this.key)
            .find({ id: id })
            .value()
    }

    add(data = {}) {
        //校验
        data = this.check(data);
        // if (!data.id) return;
        if (this.get(data.id)) return;
        db.get(this.key)
            .push(data)
            .write();
    }

    all() {
        let res = [];
        db.get(this.key).each(e => res.push(e)).value();
        return res
    }

}



module.exports = new Db();