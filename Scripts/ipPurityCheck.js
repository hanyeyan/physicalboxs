/*
IP纯度检测 for Loon
检测节点出口IP类型和纯度

[Script]
  generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js, timeout=15, tag=IP纯度检测

[Node Check]
  [node-check]
  ipPurity = script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js,type=loon

修改记录:
  2026-08-19 初始版本
  2026-08-19 修复empty content: 去除Env依赖, 直接用$httpClient
*/

var nodeName = "当前节点";

// node-check模式获取节点名
if ($environment && $environment.params && $environment.params.node) {
    nodeName = $environment.params.node;
}

// 构造请求 (不指定node参数则走当前默认线路)
var req = {
    url: "https://ipwho.is",
    timeout: 10,
    headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
};

// node-check模式下指定节点
if ($environment && $environment.params && $environment.params.node) {
    req.node = $environment.params.node;
}

$httpClient.get(req, function (error, response, body) {
    // ---- 失败 → 备用 ----
    if (error || !body) {
        fallback(error, nodeName);
        return;
    }

    // ---- 解析 ----
    var info;
    try { info = JSON.parse(body); }
    catch (e) {
        return finish("<b style='color:red'>数据解析失败</b>", nodeName);
    }

    if (!info || info.success !== true) {
        var msg = info ? (info.message || "查询失败") : "无响应";
        return finish("<b style='color:red'>" + msg + "</b>", nodeName);
    }

    // ---- 提取字段 ----
    var ip = info.ip || "未知";
    var org = info.connection ? info.connection.org : "未知";
    var isp = info.connection ? info.connection.isp : "未知";
    var domain = info.connection ? info.connection.domain : "";
    var city = info.city || "未知";
    var region = info.region ? info.region + " " : "";
    var country = info.country || "未知";
    var asn = info.connection ? info.connection.asn : "未知";

    // ---- 纯度判断 ----
    var text = (org + " " + isp + " " + domain).toLowerCase();
    var category = "住宅/ISP";
    var pure = true;

    var stopWords = [
        ["proxy", "代理/VPN", false], ["vpn", "代理/VPN", false],
        ["tor", "代理/VPN", false], ["anonymous", "代理/VPN", false],
        ["hosting", "数据中心/IDC", false], ["datacenter", "数据中心/IDC", false],
        ["data center", "数据中心/IDC", false], ["cloud", "数据中心/IDC", false],
        ["vps", "数据中心/IDC", false], ["dedicated", "数据中心/IDC", false],
        ["rack", "数据中心/IDC", false], ["idc", "数据中心/IDC", false],
        ["mobile", "移动网络", true], ["cellular", "移动网络", true],
        ["education", "教育网", true], ["edu", "教育网", true],
        ["government", "政府网", true], ["gov", "政府网", true],
        ["military", "军事网", true]
    ];

    for (var i = 0; i < stopWords.length; i++) {
        if (text.indexOf(stopWords[i][0]) !== -1) {
            category = stopWords[i][1];
            pure = stopWords[i][2];
            break;
        }
    }

    // ---- 输出 ----
    var icon = pure ? "✅" : "⚠️";
    var color = pure ? "#10b981" : "#f59e0b";

    var html = "";
    html += "<p style='text-align:center;font-family:-apple-system;'>";
    html += "<b style='color:" + color + ";font-size:large;'>" + icon + " " + (pure ? "纯净" : "非纯净") + "</b>";
    html += "</br></br>";
    html += "<b>📍 IP:</b> " + ip + "</br>";
    html += "<b>🏷️ 类型:</b> <font color='" + color + "'>" + category + "</font></br>";
    html += "<b>🗺️ 位置:</b> " + country + " " + region + city + "</br>";
    html += "<b>🏢 组织:</b> " + org + "</br>";
    html += "<b>🌐 ISP:</b> " + isp + "</br>";
    if (domain) html += "<b>🔗 域名:</b> " + domain + "</br>";
    html += "<b>🔢 ASN:</b> AS" + asn + "</br>";
    html += "<font color='#6959CD'><b>节点</b> ➟ " + nodeName + "</font>";
    html += "</p>";

    finish(html, nodeName);
});

// ---- 统一输出 ----
function finish(html, node) {
    $done({
        title: "      IP纯度检测",
        htmlMessage: html
    });
}

// ---- 备用检测 ----
function fallback(err, node) {
    var fb = { url: "https://api.ipify.org?format=json", timeout: 5 };
    if ($environment && $environment.params && $environment.params.node) {
        fb.node = $environment.params.node;
    }

    $httpClient.get(fb, function (e2, r2, body2) {
        var ip = "未知";
        if (!e2 && body2) {
            try { ip = JSON.parse(body2).ip || "未知"; }
            catch (_) {
                var m = (body2 || "").match(/(\d{1,3}\.){3}\d{1,3}/);
                if (m) ip = m[0];
            }
        }

        var msg;
        if (ip !== "未知") {
            msg = "<b>⚠️ 仅获取到IP:</b> " + ip + "<br>纯度检测API不可用";
        } else {
            msg = "<b style='color:red'>❌ 节点不可用</b><br>" + (err || "网络超时");
        }
        finish(msg, node);
    });
}