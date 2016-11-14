"use strict";
var ScreenShot = (function () {
    function ScreenShot() {
        this.debug = false;
        this.page = require('webpage').create();
        this.requests = {};
        this.requestCount = 0;
        this.maxRenderBodyPartHeight = 32500;
        this.bindEvent();
    }
    ScreenShot.prototype.setConfig = function (config) {
        this.config = config;
        this.page.viewportSize = {
            width: this.config.size.width || 1920,
            height: this.config.size.height || 1000
        };
        this.page.settings.userAgent = this.config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36';
    };
    ScreenShot.prototype.open = function (url, filepath, cb) {
        var _this = this;
        this.cb = cb;
        this.url = url;
        this.filepath = filepath;
        this.page.open(url, function (status) {
            if (status === 'success') {
                _this.log('success load');
                _this.page.evaluate(function () {
                    if (window.getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)')
                        document.body.style.backgroundColor = '#fff';
                });
                _this.pageViewLoadDone();
            }
            else {
                _this.error('Error:' + url + " open error!");
            }
        });
    };
    ScreenShot.prototype.pageRestFixedBackground = function () {
        this.page.evaluate(function () {
            var allNodes = document.all;
            for (var i = 0, j = allNodes.length; i < j; i++) {
                var node = allNodes[i];
                if (window.getComputedStyle(node).backgroundAttachment === 'fixed') {
                    node.style.backgroundAttachment = 'scroll';
                    node.style.backgroundRepeat = 'repeat';
                }
            }
        });
    };
    ScreenShot.prototype.pageViewLoadDone = function () {
        var _this = this;
        this.log('pageViewLoadDone');
        try {
            waitFor(function () { return _this.pageCheckAllRequestDone(); }, function () {
                _this.log('pageViewLoadDone--done');
                if (_this.pageCanScrollDown()) {
                    _this.pageScrollDown('pageViewLoadDone');
                }
                else {
                    _this.pageScreenshot();
                }
            }, 250);
        }
        catch (e) {
            console.error(e.message);
        }
    };
    ScreenShot.prototype.pageCanScrollDown = function () {
        this.log('pageCanScrollDown');
        return this.page.evaluate(function (maxHeight) {
            return (window.document.body.scrollTop + window.innerHeight < maxHeight) && ((window.document.body.scrollTop + window.innerHeight) < document.body.scrollHeight);
        }, this.maxRenderBodyPartHeight);
    };
    ScreenShot.prototype.pageScrollDown = function (command) {
        this.log('scrollDown');
        this.page.evaluate(function (_command) {
            window.document.body.scrollTop += (window.innerHeight * .7);
            setTimeout(function () {
                console.log('command:' + _command);
            }, 200);
        }, command);
    };
    ScreenShot.prototype.pageCheckAllRequestDone = function () {
        this.log('pageCheckAllRequestDone');
        if (this.debug) {
            for (var key in this.requests) {
                this.log("Wait for " + this.requests[key]);
            }
        }
        return this.requestCount < 1;
    };
    ScreenShot.prototype.pageGetOffsetHeight = function () {
        return this.page.evaluate(function () {
            return document.body.offsetHeight;
        });
    };
    ScreenShot.prototype.pageScreenshot = function () {
        var _this = this;
        this.log('pageScreenshot');
        this.page.evaluate(function () {
            window.document.body.scrollTop = 0;
        });
        this.pageRestFixedBackground();
        setTimeout(function () {
            var bodyHeight = _this.pageGetOffsetHeight();
            var files = [];
            _this.log('Body height:' + bodyHeight);
            _this.page.clipRect = {
                top: 0,
                left: 0,
                width: _this.page.viewportSize.width,
                height: Math.min(_this.maxRenderBodyPartHeight, bodyHeight)
            };
            files.push(_this.filepath);
            _this.page.render(_this.filepath);
            _this.cb(files);
        }, 250);
    };
    ScreenShot.prototype.bindEvent = function () {
        var _this = this;
        this.page.onConsoleMessage = function (msg) {
            if (msg.substring(0, 8) === 'command:') {
                var command = msg.substring(8, msg.lenght);
                if (_this[command]) {
                    _this[command]();
                }
                else {
                    _this.error("Error: command not found \"" + command + "\"");
                }
            }
            else {
                _this.log(msg);
            }
        };
        this.page.onResourceRequested = function (request) {
            _this.requests[request.id] = request.url;
            ++_this.requestCount;
        };
        this.page.onResourceReceived = function (response) {
            if (response.stage === 'end') {
                delete _this.requests[response.id];
                --_this.requestCount;
            }
        };
    };
    ScreenShot.prototype.log = function (log) {
        this.debug && console.log(log);
    };
    ScreenShot.prototype.error = function (log) {
        console.error(log);
    };
    return ScreenShot;
}());
function waitFor(testFx, onReady, waitTimeMillis, maxtimeOutMillis) {
    if (waitTimeMillis === void 0) { waitTimeMillis = 250; }
    if (maxtimeOutMillis === void 0) { maxtimeOutMillis = 30000; }
    var start = new Date().getTime(), condition = testFx(), interval = setInterval(function () {
        if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
            condition = (testFx());
        }
        else {
            clearInterval(interval);
            if (!condition) {
                onReady(false);
            }
            else {
                onReady(true);
            }
        }
    }, waitTimeMillis);
}
;
exports.__esModule = true;
exports["default"] = ScreenShot;
