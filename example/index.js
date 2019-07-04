const path = require('path')
const createDownloadTask = require("../index");
const tmpdir = path.join(__dirname, "down");
createDownloadTask({
    url:
      "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/downloadtest.txt",//50M
    md5: "c8c3085051e21d57e13d6544b7bbb832",
    filename: "test1.txt",
    tmpdir
  }).then(function(task) {
    task.emit("start");
    let st;
    task
      .on("totalSize", function({ totalSize }) {
        // console.log("get total size", totalSize);
      })
      .on("progress", function({ percent }) {
        // console.log("on progress", percent);
      })
      .on("end", function({ filepath }) {
        console.log("on end", filepath);
        clearInterval(st);
      })
      .on("error", function(err) {
        console.log("on error", err);
        clearInterval(st);
      })
      .on("abort", function() {
        console.log("on abort");
      });

    st = setInterval(function() {
      task.emit("stop");
      task.emit("start");
    }, 2000);
  });