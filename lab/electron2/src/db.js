const fs = require('fs');
const initSqlJs = require('sql.js/dist/sql-wasm.js');

const _DB_FILE = 'darksee.sqlite';



class Db {
    constructor() {
        initSqlJs().then(SQL => {
            // Load the db
            var filebuffer = fs.readFileSync(_DB_FILE);
            this.db = new SQL.Database(filebuffer);
            // console.log(this.db)
            //this.db.exec('DROP TABLE IF EXISTS knowledge;')
            this.db.exec('CREATE TABLE IF NOT EXISTS knowledge( id text unique,  data json);');
            var res = this.db.exec("SELECT COUNT() FROM knowledge");
            // console.log(res[0].values[0][0])

            // this.get()
        });
    }

    // INSERT INTO knowledge VALUES('fwfwefwefwefweff1', "{da:2}");
    // INSERT INTO knowledge VALUES('fwfwefwefwe3fweff1', "{da:2}");
    // SELECT * FROM knowledge;

    get() {
        let res = this.db.exec('SELECT * FROM knowledge');
        console.log(res[0].values[0][0])
        return res
    }

    add(data = {}) {
        if (!data.id) return;
        // Execute some sql
        //DROP TABLE IF EXISTS knowledge;
        var sqlstr = `INSERT INTO knowledge VALUES('${data.id}','${JSON.stringify(data)}')`;
        // sqlstr += `INSERT INTO hello VALUES (json, ${data})`;
        this.db.run(sqlstr); // Run the query without returning anything

        // var res = this.db.exec("SELECT * FROM knowledge");
        // console.log(res[0].values[0][0])
        //this.export()
    }


    export () {
        var data = this.db.export();
        var buffer = new Buffer(data);
        fs.writeFileSync(_DB_FILE, buffer);
    }
}



module.exports = new Db();