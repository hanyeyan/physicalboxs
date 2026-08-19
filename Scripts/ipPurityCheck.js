/*
IP纯度检测 for Loon
使用 ippure.com 官方API检测节点出口IP纯度

[Script]
  generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js, timeout=15, tag=IP纯度检测

修改记录:
  2026-08-19 初始版本
  2026-08-19 修复empty content
  2026-08-19 改用 ippure.com 官方API
*/

var nodeName = "当前节点";

// 获取节点名
if ($environment && $environment.params && $environment.params.node) {
    nodeName = $environment.params.node;
}

// 构造请求
var req = {
    url: "https://my.ippure.com/v1/info",
    timeout: 10,
    headers: {
        "User-Agent": "Mozilla/5.0"
    }
};

// node-check模式下指定节点
if ($environment && $environment.params && $environment.params.node) {
    req.node = $environment.params.node;
}

$httpClient.get(req, function(error, response, body) {
    if (error || !body) {
        return finish("<b style='color:red'>❌ 请求失败</b><br>" + (error || "无响应"), nodeName);
    }

    var info;
    try { info = JSON.parse(body); }
    catch (e) {
        return finish("<b style='color:red'>❌ 数据解析失败</b><br>" + body, nodeName);
    }

    if (!info || !info.ip) {
        return finish("<b style='color:red'>❌ 无有效数据</b>", nodeName);
    }

    // ---- 提取字段 ----
    var ip = info.ip;
    var asn = info.asn;
    var org = info.asOrganization || "未知";
    var country = info.country || "未知";
    var region = info.region || "";
    var city = info.city || "未知";
    var fraudScore = info.fraudScore || 0;
    var isResidential = info.isResidential || false;
    var isBroadcast = info.isBroadcast || false;
    var timezone = info.timezone || "";

    // ---- 纯度判断 ----
    var pure = true;
    var category = "";
    var scoreColor = "#10b981";
    var scoreText = "低风险";

    if (fraudScore >= 51) {
        pure = false;
        scoreColor = "#ef4444";
        scoreText = "高风险";
    } else if (fraudScore >= 21) {
        pure = false;
        scoreColor = "#f59e0b";
        scoreText = "中风险";
    }

    if (isResidential) {
        category = "住宅IP";
        if (fraudScore <= 20) {
            pure = true;
            scoreText = "纯净";
            scoreColor = "#10b981";
        }
    } else if (isBroadcast) {
        category = "广播IP";
        pure = false;
    } else {
        category = "非住宅IP";
        pure = false;
    }

    // ---- 输出 ----
    var icon = pure ? "✅" : "⚠️";
    var mainColor = pure ? "#10b981" : "#f59e0b";

    var html = "";
    html += "<div style='text-align:center;font-family:-apple-system;padding:8px;'>";
    html += "<b style='color:" + mainColor + ";font-size:18px;'>" + icon + " " + scoreText + "</b>";
    html += "<br><br>";
    html += "<b style='color:#666'>📍 IP</b><br>" + ip + "<br><br>";
    html += "<b style='color:#666'>🏷️ 类型</b><br><font color='" + mainColor + "'>" + category + "</font><br><br>";
    html += "<b style='color:#666'>🎯 欺诈分数</b><br><font color='" + scoreColor + ";font-weight:bold;'>" + fraudScore + "/100 " + scoreText + "</font><br><br>";
    html += "<b style='color:#666'>🗺️ 位置</b><br>" + escapeHtml(country) + " " + escapeHtml(region) + " " + escapeHtml(city) + "<br><br>";
    html += "<b style='color:#666'>🏢 AS组织</b><br>" + escapeHtml(org) + "<br><br>";
    if (asn) {
        html += "<b style='color:#666'>🔢 ASN</b><br>AS" + asn + "<br><br>";
    }
    if (timezone) {
        html += "<b style='color:#666'>🕐 时区</b><br>" + escapeHtml(timezone) + "<br><br>";
    }
    html += "<hr style='border:1px solid #eee;margin:8px 0;'>";
    html += "<font color='#6959CD'><b>节点</b> ➟ " + escapeHtml(nodeName) + "</font>";
    html += "</div>";

    finish(html, nodeName);
});

// HTML转义
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

// 统一输出
function finish(html, node) {
    $done({
        title: "   IP纯度检测",
        htmlMessage: html
    });
}
