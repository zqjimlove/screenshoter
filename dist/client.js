"use strict";
var config_1 = require("./config");
var screenshot_1 = require("./screenshot");
var Client = (function () {
    function Client() {
        var _this = this;
        this.screenshot = new screenshot_1["default"]();
        this.page = require('webpage').create();
        this.fetchTask();
        this.page.onResourceReceived = function (res) {
            if (res.status !== 200) {
                setTimeout(function () {
                    _this.redo();
                }, 3000);
            }
        };
    }
    Client.prototype.fetchTask = function () {
        var _this = this;
        console.log(("[" + new Date() + "]") + "open:" + config_1["default"].getTaskUrl);
        this.redo = this.fetchTask;
        this.page.open(config_1["default"].getTaskUrl, function (status) {
            if (status === 'success') {
                try {
                    var taskObj = JSON.parse(_this.page.plainText);
                    _this.doTask(taskObj);
                }
                catch (e) {
                    console.log(e.message);
                    _this.refetchTask();
                }
            }
        });
    };
    Client.prototype.refetchTask = function () {
        var _this = this;
        setTimeout(function () {
            _this.fetchTask();
        }, 3000);
    };
    Client.prototype.doTask = function (task) {
        var _this = this;
        this.screenshot.setConfig(task);
        var startTime = Date.now();
        this.screenshot.open(task.url, "" + config_1["default"].savePath + task.md5 + "/" + task.md5 + "." + task.format.toLowerCase(), function (files) {
            _this.taskDoen(task, files);
            console.log("\u5B8C\u6210\u4EFB\u52A1\uFF1A" + task.url + " " + (Date.now() - startTime) / 1000 + "ms");
        });
    };
    Client.prototype.taskDoen = function (task, files) {
        var _this = this;
        console.log("open:" + config_1["default"].callbackUrl);
        this.redo = function () {
            _this.taskDoen(task, files);
        };
        var header = {
            "Content-Type": "application/json"
        };
        var data = {
            id: task.id,
            md5: task.md5,
            dir: "" + config_1["default"].savePath + task.md5 + "/" + task.md5,
            files: files,
            url: task.url
        };
        this.page.open(config_1["default"].callbackUrl, "post", JSON.stringify(data), header, function (status) {
            if (status === 'success') {
                _this.fetchTask();
            }
            else {
                setTimeout(function () {
                    _this.taskDoen(task, files);
                }, 3000);
            }
        });
    };
    return Client;
}());
exports.__esModule = true;
exports["default"] = Client;
