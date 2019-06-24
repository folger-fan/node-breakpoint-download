const createDownloadTask = require("../index");
const assert = require("assert");
const fse = require("fs-extra");
const path = require("path");
const tmpdir = path.join(__dirname, "down");
// async function test() {
//   let task = await nbd({
//     url:
//       "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/win64.exe",
//     md5: "40ee500a223b75cab21f7101680e4550",
//     filename: "test1.exe",
//     tmpdir: "D:\\downtest"
//   });
//   task.emit("start");
//   let st;
//   task
//     .on("totalSize", function({ totalSize }) {
//       console.log("get total size", totalSize);
//     })
//     .on("progress", function({ percent }) {
//       //   console.log("on progress", percent);
//     })
//     .on("end", function({ filepath }) {
//       console.log("on end", filepath);
//       clearInterval(st);
//     })
//     .on("error", function(err) {
//       console.log("on error", err);
//       clearInterval(st);
//     })
//     .on("abort", function() {
//       console.log("on abort");
//     });

//   st = setInterval(function() {
//     task.emit("stop");
//     task.emit("start");
//   }, 2000);
// }

// test();

describe("断点下载测试", function() {
  fse.emptyDirSync(tmpdir);
  it("end事件", function(done) {
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/package.json",
      filename: "test1.json",
      tmpdir
    }).then(function(task) {
      task
        .on("end", function({ filepath }) {
          let testjson = require(filepath);
          assert.equal(testjson.name, "breakpoint-download");
          done();
        })
        .on("error", function(err) {
          done(err);
        })
        .emit("start");
    });
  });
  it("progress事件", function(done) {
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/package.json",
      filename: "test2.json",
      tmpdir
    }).then(function(task) {
      task
        .once("progress", function({ percent, totalSize, localSize }) {
          assert.equal(typeof percent, "number");
          assert.equal(typeof totalSize, "number");
          assert.equal(typeof localSize, "number");
          done();
        })
        .on("error", function(err) {
          done(err);
        })
        .emit("start");
    });
  });

  it("response事件", function(done) {
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/package.json",
      filename: "test3.json",
      tmpdir
    }).then(function(task) {
      task
        .on("response", function() {
          done();
        })
        .on("error", function(err) {
          done(err);
        })
        .emit("start");
    });
  });

  it("totalSize事件", function(done) {
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/package.json",
      filename: "test4.json",
      tmpdir
    }).then(function(task) {
      task
        .on("end", function() {})
        .on("totalSize", function({ totalSize }) {
          assert.equal(totalSize, 466);
          done();
        })
        .on("error", function(err) {
          done(err);
        })
        .emit("start");
    });
  });

  it("abort事件", function(done) {
    this.timeout(100000);
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/package.json",
      filename: "test5.json",
      tmpdir
    }).then(function(task) {
      task
        .on("abort", function() {
          done();
        })
        .on("error", function(err) {
          done(err);
        })
        .on("response", function() {
          task.emit("stop");
        })
        .emit("start");
    });
  });
  it("error事件", function(done) {
    this.timeout(100000);
    createDownloadTask({
      url: "http://a.c.com/test.json",
      filename: "test5.json",
      tmpdir
    }).then(function(task) {
      task
        .on("error", function(err) {
          done();
        })
        .emit("start");
    });
  });
  it("中断与连续加载", function(done) {
    this.timeout(100000);
    createDownloadTask({
      url:
        "https://folger-1251685788.cos.ap-guangzhou.myqcloud.com/blog/breakpoint/downloadtest.txt",
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
          done();
        })
        .on("error", function(err) {
          console.log("on error", err);
          clearInterval(st);
          done(err);
        })
        .on("abort", function() {
          console.log("on abort");
        });

      st = setInterval(function() {
        task.emit("stop");
        task.emit("start");
      }, 2000);
    });
  });
});
