const md5File = require('md5-file')
const hash = md5File.sync('downloadtest.txt')

console.log(hash)