/**
 * xhr_proxy.js
 * 通过劫持原生XMLHttpRequest实现对页面ajax请求的监听
 */
const READY_STATE_CHANGE = 'readystatechange';
let gHandlerList = [], //截获请求的处理函数列表
    gIsInited = false; //是否已经初始化
let T_RSC_HANDLERS = Symbol('readyStateChangeHandler');
let initProxy = function() {
    if (gIsInited) return;
    gIsInited = true;

    //这里先缓存一份原生的XMLHttpRequest类
    let winXMLHttpRequest = window.XMLHttpRequest;

    //用于替换原生XMLHttpRequest的类，继承自XMLHttpRequest
    let ProxyXHR = class extends winXMLHttpRequest {
            constructor() {
                    super(...arguments);
                    //readystatechange
                    //数组中第0个为页面中调用xhr.onreadystatechange的回调函数
                    //其他的为页面中调用addEventListener('readystatechange')时的回调函数
                    this[T_RSC_HANDLERS] = [null];
                    //调用原生XMLHttpRequest的addEventListener，添加对readystatechange事件的监听
                    super.addEventListener(READY_STATE_CHANGE, async() => {
                        if (this.readyState == 4 && gHandlerList.length) { //只有4的时候会回调proxyHandler
                            try {
                                //调用注册的handler
                                await gHandlerList.map(proxyHandler => proxyHandler.call(this, this));
                            } catch (e) {
                                //TODO 这里可以替换为其他的错误处理逻辑
                                console.error(e);
                            }
                        }
                        //调用页面中注册的回调函数，保证页面中逻辑正常
                        // console.log(arguments)
                        this[T_RSC_HANDLERS].forEach(handler => handler && handler.apply(this, arguments));
                    });
                }
                /**
                 * 重写addEventListener函数，对readystatechange事件做特殊处理
                 */
            addEventListener(type, handler) {
                    if (type == READY_STATE_CHANGE) {
                        this[T_RSC_HANDLERS].push(handler);
                    } else {
                        return super.addEventListener(...arguments);
                    }
                }
                /**
                 * 重写removeEventListener函数，对readystatechange事件做特殊处理
                 */
            removeEventListener(type, handler) {
                    if (type == READY_STATE_CHANGE) {
                        this[T_RSC_HANDLERS] = this[T_RSC_HANDLERS].filter(i => i !== handler);
                    } else {
                        return super.removeEventListener(...arguments);
                    }
                }
                /**
                 * 重写onreadystatechange属性的setter
                 */
            set onreadystatechange(val) {
                    this[T_RSC_HANDLERS][0] = val;
                }
                /**
                 * 重写onreadystatechange属性的getter
                 */
            get onreadystatechange() {
                return this[T_RSC_HANDLERS][0] || null;
            }

        }
        //覆盖原生的XMLHttpRequest
    window.XMLHttpRequest = ProxyXHR;
}

/**
 * 增加一个handler
 * 当xhr.readyState == 4时，回调handler，handler中，可以通过xhr.responseText获取请求返回内容
 * @param {function} handler function(xhr){}
 */
let addHandler = function(handler) {
        initProxy();
        gHandlerList.push(handler);
    }
    /**
     * 移除指定的handler
     * @param {function} handler 调用addHandler时添加的handler
     */
let removeHandler = function(handler) {
    gHandlerList = gHandlerList.filter(h => h !== handler);
};


module.exports = {
    addHandler,
    removeHandler
}



// // 通过劫持原生XMLHttpRequest实现对页面ajax请求的监听
// function XhrProxy() {

//     this.xhrList = [
//         "getPersonalView", // 个人信息
//     ];

//     // 添加方法
//     this.addHandler = function (handler) {
//         initProxy();
//         gHandlerList.push(handler);
//     }
//     // 去除方法
//     this.removeHandler = function (handler) {
//         gHandlerList = gHandlerList.filter(h => h !== handler);
//     }

//     let gHandlerList = [],  //截获请求的处理函数列表
//         gIsInited = false;  //是否已经初始化
//     let initProxy = function () {
//         if (gIsInited) return;
//         gIsInited = true;

//         //这里先缓存一份原生的XMLHttpRequest类
//         let winXMLHttpRequest = window.XMLHttpRequest;

//         //用于替换原生XMLHttpRequest的类，继承自XMLHttpRequest
//         let ProxyXHR = class extends winXMLHttpRequest {
//             constructor() {
//                 super(...arguments);
//                 //调用原生XMLHttpRequest的addEventListener，添加对readystatechange事件的监听
//                 super.addEventListener('readystatechange', async () => {
//                     if (this.readyState == 4 && gHandlerList.length) {
//                         try {
//                             //调用注册的handler
//                             await gHandlerList.map(proxyHandler => proxyHandler.call(this, this));
//                         }
//                         catch (e) {
//                             //其他的错误处理逻辑
//                             console.error(e);
//                         }
//                     }
//                 });
//             }
//         }
//         //覆盖原生的XMLHttpRequest
//         window.XMLHttpRequest = ProxyXHR;
//     }
// }
// // 发送数据到渲染进程 xhr
// let xhrProxy = new XhrProxy();
// xhrProxy.addHandler(function (xhr) {
//     from(xhrProxy.xhrList).pipe(filter(item => xhr.responseURL.includes(item))).subscribe(item => {
//         // 接口成功
//         var data = JSON.parse(xhr.response);
//         if (0 === data.code) {
//             from(remote.BrowserWindow.getAllWindows()).subscribe(i => {
//                 remote.BrowserWindow.fromId(i.id).webContents.send('send-xhr-data', item, {}, JSON.stringify(data.data));
//             });
//         }
//     });
// });

// // 通过劫持原生fetch实现对页面ajax请求的监听
// function FetchProxy() {

//     this.addHandler = function (handler) {
//         initProxy();
//         gHandlerList.push(handler);
//     }

//     this.removeHandler = function (handler) {
//         gHandlerList = gHandlerList.filter(h => h !== handler);
//     }

//     this.fetchList = [
//         "getPersonalView", // 个人信息
//         "trend", // 我的店铺趋势
//         "overview", // 我的点铺数据
//         "list", // 竞品列表
//         "getCoreIndexes", // 关键指标对比
//         "getCoreTrend", // 曲线图数据
//         "getKeywords", // 入店关键词
//         "getFlowSource", // 入店来源
//         "getSourceTrend", // 入店来源趋势
//         "getSingleMonitoredInfo", // 竞争商品信息
//         "getShopCate", // 店铺分类信息
//     ]

//     let gHandlerList = [],  //截获请求的处理函数列表
//         gIsInited = false;  //是否已经初始化
//     let initProxy = function () {
//         if (gIsInited) return;
//         gIsInited = true;
//         var winFetch = window.fetch;
//         window.fetch = function (url, opts) {
//             return new Promise((resolve, reject) => {
//                 winFetch(url, opts).then(
//                     (res) => {
//                         try {
//                             let params = (opts && opts.hasOwnProperty("params")) ? opts.params : qs.parse(url.split("?")[1]);
//                             gHandlerList.map(proxyHandler => proxyHandler.call(this, params, res));
//                         }
//                         catch (e) {
//                             console.error(e);
//                         }
//                         resolve(res);
//                     },
//                     (err) => {
//                         reject(err)
//                     }
//                 )
//             })
//         }
//     }
// }
// // 发送数据到渲染进程 fetch
// let fetchProxy = new FetchProxy();
// fetchProxy.addHandler(function (params, res) {
//     from(fetchProxy.fetchList).pipe(filter(item => res.clone().url.includes(item))).subscribe(item => {
//         // 接口成功
//         res.clone().json().then(result => {
//             result.content && (result = result.content);
//             if (0 === result.code) {
//                 from(remote.BrowserWindow.getAllWindows()).subscribe(i => {
//                     remote.BrowserWindow.fromId(i.id).webContents.send('send-xhr-data', item, params, result.data);
//                 });
//             }
//         });
//     });
// });