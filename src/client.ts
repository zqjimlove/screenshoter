declare let phantom: any;
declare var require;
import config from "./config";
import Screenshot from "./screenshot";

class Client {
    private screenshot: Screenshot = new Screenshot();
    public page: any = require('webpage').create();
    redo: Function;
    constructor() {
        this.fetchTask();
        this.page.onResourceReceived = res => {
            if (res.status !== 200) {
                setTimeout(() => {
                    this.redo();
                }, 3000)
            }
        }
    }
    fetchTask() {
        console.log(`[${new Date()}]` + "open:" + config.getTaskUrl)
        this.redo = this.fetchTask;
        this.page.open(config.getTaskUrl, (status) => {
            if (status === 'success') {
                try {
                    var taskObj = JSON.parse(this.page.plainText);
                    this.doTask(taskObj);
                } catch (e) {
                    console.log(e.message);
                    this.refetchTask();
                }
            }
        })
    }
    refetchTask() {
        setTimeout(() => {
            this.fetchTask();
        }, 3000);
    }
    doTask(task) {
        // this.screenshot.debug = true;
        this.screenshot.setConfig(task);
        let startTime = Date.now();
        this.screenshot.open(task.url, `${config.savePath}${task.md5}/${task.md5}.${task.format.toLowerCase()}`, (files) => {
            this.taskDoen(task, files);
            console.log(`完成任务：${task.url} ${(Date.now() - startTime) / 1000}ms`);
        });
    }
    taskDoen(task, files) {
        console.log("open:" + config.callbackUrl);

        this.redo = () => {
            this.taskDoen(task, files);
        };

        let header = {
            "Content-Type": "application/json"
        };

        let data = {
            id: task.id,
            md5: task.md5,
            dir: `${config.savePath}${task.md5}/${task.md5}`,
            files: files,
            url: task.url
        }

        this.page.open(config.callbackUrl, "post", JSON.stringify(data), header, (status) => {
            if (status === 'success') {
                this.fetchTask();
            } else {
                setTimeout(() => {
                    this.taskDoen(task, files);
                }, 3000);
            }
        });
    }

}
export default Client;