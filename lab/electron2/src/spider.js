// 兼容不同的域名

// const { remote } = require('electron');

// // Modify the user agent for all requests to the following urls.
// const filter = {
//     urls: ['*://api.zsxq.com/v2/*/topics?*']
// }

// remote.session.defaultSession.webRequest.onCompleted(filter, (details) => {
//     console.log(details, details.url)
// })


class Spider {
    constructor() {
        this.hosts = {
            "wx.zsxq.com": this.zsxq
        }
        this.host = window.location.host;
    }
    getTags(text) {
        if (this.hosts[this.host]) return this.hosts[this.host](text);
        return []
    }
    zsxq(text) {
        //wx.zsxq.com
        let ts = text.split("#").filter(t => t);
        // console.log(ts)
        return Array.from(ts, t => {
            let index = text.search(t);
            // console.log(index, text.slice(index, t.length + 1))
            let target = text.slice((index - 1) || 0, index + t.length + 1);
            // console.log(target, target.match(/#/ig))
            if (target && (target.match(/#/ig)).length === 2) return t
        }).filter(t => t);
    }
}

module.exports = Spider;