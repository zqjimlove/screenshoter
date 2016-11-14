declare let phantom;
declare var require;

class ScreenShot {
    public url: string;
    public filepath: string;
    public debug: boolean = false;
    public page: any = require('webpage').create();
    private requests: any = {};
    private requestCount: number = 0;
    private maxRenderBodyPartHeight: number = 32500;
    private config: any;
    private cb: Function;
    constructor() {
        this.bindEvent();

    }
    public setConfig(config) {
        this.config = config;
        this.page.viewportSize = {
            width: this.config.size.width || 1920,
            height: this.config.size.height || 1000
        }
        this.page.settings.userAgent = this.config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36';
    }
    public open(url, filepath, cb) {
        this.cb = cb;
        this.url = url;
        this.filepath = filepath;
        this.page.open(url, status => {
            if (status === 'success') {
                this.log('success load');

                //没有背景色设置为白色
                this.page.evaluate(function () {
                    if (window.getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)')
                        document.body.style.backgroundColor = '#fff'
                });

                this.pageViewLoadDone();

            } else {
                this.error('Error:' + url + " open error!");
            }
        })
    }
    pageRestFixedBackground() {
        this.page.evaluate(function () {
            var allNodes = document.all;
            for (var i = 0, j = allNodes.length; i < j; i++) {
                var node: any = allNodes[i];
                if (window.getComputedStyle(node).backgroundAttachment === 'fixed') {

                    node.style.backgroundAttachment = 'scroll';
                    node.style.backgroundRepeat = 'repeat';
                }
            }
        })
    }
    pageViewLoadDone() {
        this.log('pageViewLoadDone')
        try {
            waitFor(() => { return this.pageCheckAllRequestDone() }, () => {
                this.log('pageViewLoadDone--done')
                if (this.pageCanScrollDown()) {
                    this.pageScrollDown('pageViewLoadDone');
                } else {
                    this.pageScreenshot();
                }
            }, 250)
        } catch (e) {
            console.error(e.message)
        }
    }
    pageCanScrollDown() {
        this.log('pageCanScrollDown')
        return this.page.evaluate(function (maxHeight) {
            return (window.document.body.scrollTop + window.innerHeight < maxHeight) && ((window.document.body.scrollTop + window.innerHeight) < document.body.scrollHeight);
        }, this.maxRenderBodyPartHeight)
    }
    pageScrollDown(command) {
        this.log('scrollDown');
        this.page.evaluate(function (_command) {
            window.document.body.scrollTop += (window.innerHeight * .7);
            setTimeout(function () {
                console.log('command:' + _command);
            }, 200);
        }, command)
    }
    pageCheckAllRequestDone() {
        this.log('pageCheckAllRequestDone')

        if (this.debug) {
            for (var key in this.requests) {
                this.log(`Wait for ${this.requests[key]}`);
            }
        }
        return this.requestCount < 1;
    }
    pageGetOffsetHeight() {
        return this.page.evaluate(function () {
            return document.body.offsetHeight;
        })
    }
    pageScreenshot() {
        this.log('pageScreenshot');
        this.page.evaluate(function () {
            window.document.body.scrollTop = 0;
        });
        this.pageRestFixedBackground();
        setTimeout(() => {
            let bodyHeight = this.pageGetOffsetHeight();
            let files = [];
            this.log('Body height:' + bodyHeight);
            // if (bodyHeight > this.maxRenderBodyPartHeight) {
            //     let top = 0;
            //     let partIndex = 0;
            //     let fileName = this.filepath.substr(0, this.filepath.lastIndexOf('.'));
            //     let fileType = this.filepath.substr(this.filepath.lastIndexOf('.') + 1, this.filepath.length);
            //     while (top < (bodyHeight - this.maxRenderBodyPartHeight)) {
            //         top = this.maxRenderBodyPartHeight * partIndex;
            //         this.page.clipRect = {
            //             top: top,
            //             left: 0,
            //             width: this.page.viewportSize.width,
            //             height: Math.min(this.maxRenderBodyPartHeight, bodyHeight - top)
            //         };
            //         console.log(JSON.stringify(this.page.clipRect), partIndex);
            //         let file = `${fileName}_${partIndex}.${fileType}`;
            //         // files.push(file);
            //         files.push({
            //             filepath: file,
            //             top: this.page.clipRect.top,
            //             height: this.page.clipRect.height,
            //             width: this.page.viewportSize.width,
            //         });
            //         this.page.render(file, {
            //             format: this.config.format || 'jpeg',
            //             quality: this.config.quality || 70
            //         });
            //         ++partIndex;
            //     }
            // } else {
            //     files.push({
            //         filepath: this.filepath,
            //         top: 0
            //     });
            //     this.page.render(this.filepath);
            // }
            this.page.clipRect = {
                top: 0,
                left: 0,
                width: this.page.viewportSize.width,
                height: Math.min(this.maxRenderBodyPartHeight, bodyHeight)
            };
            files.push(this.filepath);
            this.page.render(this.filepath);
            this.cb(files);
        }, 250);
    }
    bindEvent() {
        //监听console，发起命令
        this.page.onConsoleMessage = msg => {
            if (msg.substring(0, 8) === 'command:') {
                var command = msg.substring(8, msg.lenght);
                if (this[command]) {
                    this[command]();
                } else {
                    this.error(`Error: command not found "${command}"`)
                }
            } else {
                this.log(msg);
            }
        }

        //监听发起请求
        this.page.onResourceRequested = (request) => {
            this.requests[request.id] = request.url;
            ++this.requestCount;
        };

        //监听请求respond
        this.page.onResourceReceived = (response) => {
            if (response.stage === 'end') {
                delete this.requests[response.id];
                --this.requestCount;
            }
        };
    }
    log(log) {
        this.debug && console.log(log)
    }
    error(log) {
        console.error(log)
    }
}


function waitFor(testFx: Function, onReady: Function, waitTimeMillis = 250, maxtimeOutMillis = 30000) {
    var start = new Date().getTime(),
        condition = testFx(),
        interval = setInterval(function () {
            if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
                condition = (testFx());
            } else {
                clearInterval(interval);
                if (!condition) {
                    onReady(false);
                } else {
                    onReady(true);
                }
            }
        }, waitTimeMillis);
};

export default ScreenShot;