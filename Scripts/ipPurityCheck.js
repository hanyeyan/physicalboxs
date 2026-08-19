/*
IP纯度检测 for Loon
检测节点出口IP类型和纯度

[Script]
  generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js, timeout=30, tag=IP纯度检测, img-url=checkmark.shield.fill.system

修改记录:
  2026-08-19 初始版本
  2026-08-19 修复empty content
  2026-08-19 修复timeout: 增加超时时间, 多API源切换
*/

var nodeName = "当前节点";
var targetNode = null;

// 获取节点名
if ($environment && $environment.params && $environment.params.node) {
    nodeName = $environment.params.node;
    targetNode = $environment.params.node;
}

// API源列表 (按优先级排序)
var APIs = [
    {
        name: "ipwho.is",
        url: "https://ipwho.is",
        parse: function (body) {
            var info = JSON.parse(body);
            if (!info || info.success !== true) throw new Error("查询失败");
            return {
                ip: info.ip,
                org: info.connection.org || "未知",
                isp: info.connection.isp || "未知",
                domain: info.connection.domain || "",
                city: info.city || "未知",
                region: info.region || "",
                country: info.country || "未知",
                asn: info.connection.asn || "未知"
            };
        }
    },
    {
        name: "ip-api.com",
        url: "https://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,regionName,city,isp,org,as,orgname",
        parse: function (body) {
            var info = JSON.parse(body);
            if (!info || info.status !== "success") throw new Error(info.message || "查询失败");
            return {
                ip: info.query,
                org: info.orgname || info.org || "未知",
                isp: info.isp || "未知",
                domain: "",
                city: info.city || "未知",
                region: info.regionName || "",
                country: info.country || "未知",
                asn: info.as || "未知"
            };
        }
    }
];

var apiIndex = 0;

// 尝试API
function tryAPI() {
    if (apiIndex >= APIs.length) {
        // 所有API都失败了，用ipify兜底
        return simpleCheck();
    }

    var api = APIs[apiIndex];
    var req = {
        url: api.url,
        timeout: 15,
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json"
        }
    };

    if (targetNode) {
        req.node = targetNode;
    }

    $httpClient.get(req, function (error, response, body) {
        if (error || !body) {
            console.log("API " + api.name + " 失败: " + (error || "无响应"));
            apiIndex++;
            tryAPI();
            return;
        }

        try {
            var info = api.parse(body);
            showResult(info);
        } catch (e) {
            console.log("API " + api.name + " 解析失败: " + e.message);
            apiIndex++;
            tryAPI();
        }
    });
}

// 简单IP检测 (兜底)
function simpleCheck() {
    var req = {
        url: "https://api.ipify.org?format=json",
        timeout: 10,
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    };

    if (targetNode) {
        req.node = targetNode;
    }

    $httpClient.get(req, function (e2, r2, body2) {
        if (e2 || !body2) {
            return finish("<b style='color:red'>❌ 所有API不可用</b><br>请检查节点网络连接", nodeName);
        }

        var ip = "未知";
        try { ip = JSON.parse(body2).ip || "未知"; }
        catch (_) {
            var m = (body2 || "").match(/(\d{1,3}\.){3}\d{1,3}/);
            if (m) ip = m[0];
        }

        if (ip !== "未知") {
            return finish("<b>⚠️ 仅获取到IP:</b> " + ip + "<br><font color='#999'>纯度检测API均不可用</font>", nodeName);
        } else {
            return finish("<b style='color:red'>❌ 节点不可用</b><br>" + (e2 || "网络超时"), nodeName);
        }
    });
}

// 显示结果
function showResult(info) {
    // 纯度判断
    var text = (info.org + " " + info.isp + " " + info.domain).toLowerCase();
    var category = "住宅/ISP";
    var pure = true;

    var rules = [
        ["proxy", "代理/VPN", false], ["vpn", "代理/VPN", false],
        ["tor", "代理/VPN", false], ["anonymous", "代理/VPN", false],
        ["hosting", "数据中心/IDC", false], ["datacenter", "数据中心/IDC", false],
        ["data center", "数据中心/IDC", false], ["cloud", "数据中心/IDC", false],
        ["vps", "数据中心/IDC", false], ["dedicated", "数据中心/IDC", false],
        ["rack", "数据中心/IDC", false], ["idc", "数据中心/IDC", false],
        ["digitalocean", "数据中心/IDC", false], ["linode", "数据中心/IDC", false],
        ["aws", "数据中心/IDC", false], ["azure", "数据中心/IDC", false],
        ["google", "数据中心/IDC", false], ["hetzner", "数据中心/IDC", false],
        ["ovh", "数据中心/IDC", false], ["leaseweb", "数据中心/IDC", false],
        ["mobile", "移动网络", true], ["cellular", "移动网络", true],
        ["telecom", "电信网络", true], ["education", "教育网", true],
        ["edu", "教育网", true], ["government", "政府网", true],
        ["gov", "政府网", true], ["military", "军事网", true],
        ["research", "研究机构", true], ["academic", "学术机构", true]
    ];

    for (var i = 0; i < rules.length; i++) {
        if (text.indexOf(rules[i][0]) !== -1) {
            category = rules[i][1];
            pure = rules[i][2];
            break;
        }
    }

    // 输出
    var icon = pure ? "✅" : "⚠️";
    var color = pure ? "#10b981" : "#f59e0b";

    var html = "";
    html += "<div style='text-align:center;font-family:-apple-system;padding:10px;'>";
    html += "<b style='color:" + color + ";font-size:18px;'>" + icon + " " + (pure ? "纯净" : "非纯净") + "</b>";
    html += "<br><br>";
    html += "<b style='color:#666'>📍 IP</b><br>" + info.ip + "<br><br>";
    html += "<b style='color:#666'>🏷️ 类型</b><br><font color='" + color + "'>" + category + "</font><br><br>";
    html += "<b style='color:#666'>🗺️ 位置</b><br>" + escapeHtml(info.country) + " " + escapeHtml(info.region) + " " + escapeHtml(info.city) + "<br><br>";
    html += "<b style='color:#666'>🏢 组织</b><br>" + escapeHtml(info.org) + "<br><br>";
    html += "<b style='color:#666'>🌐 ISP</b><br>" + escapeHtml(info.isp) + "<br><br>";
    if (info.asn && info.asn !== "未知") {
        html += "<b style='color:#666'>🔢 ASN</b><br>" + escapeHtml(info.asn) + "<br><br>";
    }
    html += "<hr style='border:1px solid #eee;margin:10px 0;'>";
    html += "<font color='#6959CD'><b>节点</b> ➟ " + escapeHtml(nodeName) + "</font>";
    html += "</div>";

    finish(html, nodeName);
}

// HTML转义
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (c) {
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

// 启动
tryAPI();