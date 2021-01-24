//分页
class Pagination {
    constructor(opts) {
        this.dbName = opts.dbName;
        this.version = '';
        this.time = (new Date()).getTime();
        this.blocks = [];
        this.pageNum = 0;
        this.pageSize = 15;
    }
    load() {
        let dt = localStorage.getItem(this.dbName);
        if (dt) {
            dt = JSON.parse(dt);
            // console.log(dt)
            this.blocks = dt.blocks;

            this.version = dt.version;
            this.time = dt.time;
            return dt
        } else {
            return {}
        }
    }
    get(pageNum) {
        // console.log(this.blocks)
        let blocks = this.blocks.slice(pageNum * this.pageSize, (pageNum + 1) * this.pageSize);
        return blocks
    }

}

module.exports = Pagination;