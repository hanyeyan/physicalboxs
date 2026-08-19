/*
IP纯度检测 for Loon
检测节点出口IP类型和纯度

[Script]
  generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js, timeout=30, tag=IP纯度检测, img-url=checkmark.shield.fill.system

修改记录:
  2026-08-19 初始版本
  2026-08-19 修复empty content
  2026-08-19 修复timeout: 增加超时时间, 多API源切换
  2026-08-19 修复代理节点请求超时问题, 新增多源API
*/

var nodeName = "当前节点";
var targetNode = null;

// 获取节点名
if ($environment && $environment.params && $environment.params.node) {
    nodeName = $environment.params.node;
    targetNode = $environment.params.node;
}

// 简单API列表 (纯IP获取，可能不经过代理节点)
var simpleAPIs = [
    "https://api.ipify.org?format=json",
    "https://ifconfig.me/ip",
    "https://icanhazip.com",
    "https://api.ip.sb/ip",
    "https://ipv4.icanhazip.com",
    "https://check.torproject.org/api/ip"
];

// 详细API列表 (IP信息查询)
var detailAPIs = [
    {
        url: "https://ipwho.is",
        parse: function(body) {
            var info = JSON.parse(body);
            if (!info || info.success !== true) throw new Error("查询失败");
            return {
                ip: info.ip,
                org: (info.connection && info.connection.org) || "未知",
                isp: (info.connection && info.connection.isp) || "未知",
                domain: (info.connection && info.connection.domain) || "",
                city: info.city || "未知",
                region: info.region || "",
                country: info.country || "未知",
                asn: (info.connection && info.connection.asn) || "未知"
            };
        }
    },
    {
        url: "https://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,regionName,city,isp,org,as,orgname",
        parse: function(body) {
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
];

var simpleIndex = 0;
var detailIndex = 0;

// 先获取简单IP
function getSimpleIP() {
    if (simpleIndex >= simpleAPIs.length) {
        // 所有简单API失败
        return finish("<b style='color:red'>❌ 所有API不可用</b><br>请检查网络连接", nodeName);
    }

    var url = simpleAPIs[simpleIndex];
    console.log("尝试简单API: " + url);

    var req = {
        url: url,
        timeout: 8,
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    };

    $httpClient.get(req, function(error, response, body) {
        if (error || !body) {
            console.log("简单API " + url + " 失败: " + (error || "无响应"));
            simpleIndex++;
            getSimpleIP();
            return;
        }

        var ip = "";
        try {
            if (url.indexOf("ipify") !== -1) {
                ip = JSON.parse(body).ip;
            } else {
                ip = (body || "").trim();
                // 验证是否是IP格式
                if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                    console.log("IP格式错误: " + ip);
                    simpleIndex++;
                    getSimpleIP();
                    return;
                }
            }
        } catch (e) {
            console.log("解析IP失败: " + e.message);
            simpleIndex++;
            getSimpleIP();
            return;
        }

        console.log("简单IP获取成功: " + ip);
        // IP获取成功，再尝试获取详情
        getDetailInfo(ip);
    });
}

// 获取详细信息
function getDetailInfo(ip) {
    if (detailIndex >= detailAPIs.length) {
        // 详细API也都失败，只显示IP
        var html = "<b>⚠️ 仅获取到IP</b><br>" + ip + "<br><br><font color='#999'>详细信息API不可用</font>";
        return finish(html, nodeName);
    }

    var api = detailAPIs[detailIndex];
    console.log("尝试详情API: " + api.url);

    var req = {
        url: api.url,
        timeout: 12,
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Accept": "application/json"
        }
    };

    $httpClient.get(req, function(error, response, body) {
        if (error || !body) {
            console.log("详情API " + api.url + " 失败: " + (error || "无响应"));
            detailIndex++;
            getDetailInfo(ip);
            return;
        }

        try {
            var info = api.parse(body);
            showResult(info);
        } catch (e) {
            console.log("详情API解析失败: " + e.message);
            detailIndex++;
            getDetailInfo(ip);
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
    html += "<b style='color:#666'>📍 IP</b><br>" + escapeHtml(info.ip) + "<br><br>";
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

// 启动: 先尝试获取简单IP
getSimpleIP();
