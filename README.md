## LeanEngine Sniper

这个中间件会统计 express 程序被访问的各路由的响应代码、响应时间，以及程序所调用的 LeanCloud API 的名称、响应结果（成功或失败）、响应时间，帮助你监控和诊断 LeanEngine 应用遇到的性能问题。

**安装依赖**：

    npm install --save leanengine-sniper

**在你的 express 程序中添加中间件**：

    var sniper = require('leanengine-sniper');
    var AV = require('leanengine');
    var app = express();
    app.use(sniper({AV: AV}));

等它收集一段时间数据，就可以打开你的站点下的 `/__lcSniper` 查看统计图表了，basicAuth 的账号是 appId，密码是 masterKey.

数据会储存在你的应用云储存中的 `LeanEngineReponseLog5Min` 和 `LeanEngineCloudAPI5Min` 这两个 Class 中，你的程序（每个实例）每五分钟会分别上传一条记录到这两张表，这意味着每个 LeanEngine 应用实例每个月会因为统计调用情况而消耗 17k 次 api 调用。

**定义自己的 URL 分组或忽略规则**：

你可以给 sniper 传一个 rules 参数，定义一些处理 URL 的规则：

    app.use(sniper({
      AV: AV,
      rules: [
        {match: /^GET \/(js|css).+/, rewrite: 'GET /$1'}, // 将例如 /js/jquery.js 的 URL 重写为 /js
        {match: /^GET \/public/, ignore: true}            // 忽略 GET /public 开头的 URL
      ]
    }));

**sniper 的更多选项**：

* specialStatusCodes, 数字数组，为了记录合适大小的数据，默认只会单独记录几个常见的 statusCode, 你可以覆盖默认的值。
