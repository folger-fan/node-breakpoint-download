const request = require("request");
const md5File = require("md5-file");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const EventEmitter = require("events");
const nodeUtil = require("util");
const temporaryDirectory = require("os").tmpdir();
const lstatPromise = nodeUtil.promisify(fs.lstat);
const removePromise = nodeUtil.promisify(fse.remove);
const pathExistsPromise = nodeUtil.promisify(fse.pathExists);
const ensureDirPromise = nodeUtil.promisify(fse.ensureDir);
//获取响应头信息
function getResHeaders(url) {
  return new Promise(function(resolve, reject) {
    request(
      {
        url,
        method: "GET", //请求方式
        forever: true,
        headers: {
          //请求头
          "Cache-Control": "no-cache",
          Range: "bytes=0-1"
        }
      },
      (err, r) => {
        if (err) {
          reject(err);
        } else {
          resolve(r.headers);
        }
      }
    );
  });
}

async function createDownloadTask({
  url,
  md5,
  filename,
  tmpdir = temporaryDirectory
}) {
  let emitter = new EventEmitter();
  let downStream, fileWrite;
  emitter.on("start", async function() {
    try {
      if (tmpdir !== temporaryDirectory) {
        await ensureDirPromise(tmpdir);
      }
      filename = filename || decodeURIComponent(path.basename(url));
      const destinationPath = path.join(tmpdir, filename);
      let headers = await getResHeaders(url);
      let totalSize = Number(headers["content-range"].split("/")[1]);
      let localSize = 0;
      let acceptRanges = headers["accept-ranges"];
      if (acceptRanges !== "bytes") {
        emitter.emit("error", new Error("资源不支持断点下载"));
        return;
      }
      emitter.emit("totalSize", { totalSize });
      if (await pathExistsPromise(destinationPath)) {
        let stat = await lstatPromise(destinationPath);
        localSize = stat.size;
        if (
          localSize === totalSize &&
          (!md5 || md5File.sync(destinationPath) === md5)
        ) {
          console.log("文件已下载");
          emitter.emit("progress", {
            percent: 100,
            localSize,
            totalSize
          });
          emitter.emit("end", {
            filepath: destinationPath
          });
          return;
        }

        if (localSize > totalSize) {
          await removePromise(destinationPath);
          return;
        }
      }

      if (fileWrite || downStream) {
        console.warn("正在下载请稍后");
        return;
      }
      fileWrite = fs.createWriteStream(destinationPath, {
        flags: "a"
      });
      downStream = request(
        {
          method: "GET",
          url,
          forever: true,
          headers: {
            "Cache-Control": "no-cache",
            Range: `bytes=${localSize}-${totalSize - 1}`
          }
        },
        function() {}
      );
      let ended = false;
      downStream
        .on("data", function(data) {
          fileWrite.write(data, async function() {
            
            localSize += data.length;
            let percent =
              Math.floor((10000 * localSize) / totalSize) / 100 || 0;
            emitter.emit("progress", { percent, localSize, totalSize });
            if (totalSize === localSize) {
              if (fileWrite) {
                fileWrite.end();
                fileWrite = null;
              }
              if (md5 && md5File.sync(destinationPath) !== md5) {
                emitter.emit("error", new Error("文件md5校验错误"));
                if (downStream) {
                  downStream.abort();
                  downStream = null;
                }
                if (fileWrite) {
                  fileWrite.end();
                  fileWrite = null;
                }
                removePromise(destinationPath);
                return;
              }
              ended = true;
              emitter.emit("end", {
                filepath: destinationPath
              });
            }
            if (localSize > totalSize) {
              if (fileWrite) {
                fileWrite.end();
                fileWrite = null;
              }
              emitter.emit("error", new Error("文件大小错误"));
            }
          });
        })
        .on("response", function(response) {
          emitter.emit("response", response.headers);
        })
        .on("abort", function() {
          downStream = null;
          if (fileWrite) {
            fileWrite.end();
            fileWrite = null;
          }
          emitter.emit("abort", new Error("下载中断"));
        })
        .on("error", function(err) {
          console.error(err);
          emitter.emit("error", new Error("下载出错"));
          downStream = null;
          if (fileWrite) {
            fileWrite.end();
            fileWrite = null;
          }
        })
        .on("end", function() {
          if (fileWrite) {
            fileWrite.end();
            fileWrite = null;
          }
          downStream = null;
        });
    } catch (e) {
      console.error(e);
      emitter.emit("error", new Error("程序出错"));
    }
  });
  emitter.on("stop", function() {
    downStream && downStream.abort();
  });

  return emitter;
}

module.exports = createDownloadTask;
