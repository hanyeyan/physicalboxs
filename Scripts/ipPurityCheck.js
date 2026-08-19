/*
IP纯度检测 for Loon
检测节点出口IP的类型和纯度 (住宅/数据中心/代理/VPN等)

[Script]
  generic script-path=https://github.com/hanyeyan/physicalboxs/raw/refs/heads/main/Scripts/ipPurityCheck.js, timeout=15, tag=IP纯度检测

修改记录:
  2026-08-19 初始版本
  2026-08-19 按 Env 类标准格式重写, 使用 ipwho.is API
*/

const $ = new Env("IP纯度检测");

IP_Purity_Check()
  .catch((e) => $.logErr(e))
  .finally(() => {
    $.log("ok");
    $.done();
  });

async function IP_Purity_Check() {
  // 1. 获取IP详情 (通过当前节点)
  var options = {
    url: "https://ipwho.is",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    node: $environment.params.node,
    timeout: 8000,
  };

  return $.http.get(options).then(
    (resp) => {
      $.log(resp.body);

      var info;
      try { info = JSON.parse(resp.body); }
      catch (e) {
        $done({
          title: "IP纯度检测",
          htmlMessage: "<b style='color:red'>数据解析失败</b>"
        });
        return;
      }

      if (!info || !info.success) {
        $done({
          title: "IP纯度检测",
          htmlMessage: "<b style='color:red'>查询失败</b>"
        });
        return;
      }

      var ip = info.ip || "未知";
      var org = info.connection ? info.connection.org : "未知";
      var isp = info.connection ? info.connection.isp : "未知";
      var domain = info.connection ? info.connection.domain : "未知";
      var type = info.type || "未知";
      var city = info.city || "未知";
      var region = info.region || "未知";
      var country = info.country || "未知";
      var asn = info.connection ? info.connection.asn : "未知";

      // 2. 纯度判断
      var text = (org + " " + isp + " " + domain).toLowerCase();

      // 非纯净关键词
      var proxyKeywords = ["proxy", "vpn", "tor", "anonymous", "anonymizer"];
      var dcKeywords = ["hosting", "datacenter", "data center", "cloud", "server",
                        "vps", "dedicated", "rack", "idc", "virtual"];
      var mobileKeywords = ["mobile", "cellular", "wireless"];
      var educationKeywords = ["education", "edu", "school", "university", "college"];
      var governmentKeywords = ["government", "gov", "federal", "state", "military"];

      var category = "住宅/ISP";
      var pure = true;

      for (var i = 0; i < proxyKeywords.length; i++) {
        if (text.indexOf(proxyKeywords[i]) !== -1) { category = "代理/VPN"; pure = false; break; }
      }

      if (pure) {
        for (var j = 0; j < dcKeywords.length; j++) {
          if (text.indexOf(dcKeywords[j]) !== -1) { category = "数据中心/IDC"; pure = false; break; }
        }
      }

      if (pure) {
        for (var k = 0; k < mobileKeywords.length; k++) {
          if (text.indexOf(mobileKeywords[k]) !== -1) { category = "移动网络"; break; }
        }
      }

      if (pure && category === "住宅/ISP") {
        for (var m = 0; m < educationKeywords.length; m++) {
          if (text.indexOf(educationKeywords[m]) !== -1) { category = "教育网"; break; }
        }
      }

      if (pure && category === "住宅/ISP") {
        for (var n = 0; n < governmentKeywords.length; n++) {
          if (text.indexOf(governmentKeywords[n]) !== -1) { category = "政府网"; break; }
        }
      }

      // 3. 组装HTML输出
      var icon = pure ? "✅" : "⚠️";
      var color = pure ? "#10b981" : "#f59e0b";

      var res = "<p style='text-align:center; font-family:-apple-system;'>";
      res += "<b style='color:" + color + "; font-size:large;'>" + icon + " " + (pure ? "纯净" : "非纯净") + "</b>";
      res += "</br></br>";
      res += "<b>📍 IP:</b> " + ip + " (" + type + ")";
      res += "</br>";
      res += "<b>🏷️ 类型:</b> <font color='" + color + "'>" + category + "</font>";
      res += "</br>";
      res += "<b>🗺️ 位置:</b> " + country + " " + region + " " + city;
      res += "</br>";
      res += "<b>🏢 组织:</b> " + org;
      res += "</br>";
      res += "<b>🌐 ISP:</b> " + isp;
      res += "</br>";
      if (domain && domain !== "未知") {
        res += "<b>🔗 域名:</b> " + domain;
        res += "</br>";
      }
      res += "<b>🔢 ASN:</b> AS" + asn;
      res += "</br>";
      res += "<font color='#6959CD'><b>节点</b> ➟ " + $environment.params.node + "</font>";
      res += "</p>";

      $done({
        title: "      IP纯度检测",
        htmlMessage: res
      });
    },
    (reason) => {
      $.log("🔴 IP纯度检测 error");
      $.log(reason.error || reason);

      // 备用: 只获取IP
      $.http.get({
        url: "https://api.ipify.org?format=json",
        node: $environment.params.node,
        timeout: 4000
      }).then(
        function (resp2) {
          var ip = "未知";
          try { ip = JSON.parse(resp2.body).ip || "未知"; } catch (_) {}

          $done({
            title: "IP纯度检测",
            htmlMessage: ip !== "未知"
              ? "<b>⚠️ 仅获取到IP:</b> " + ip + "<br>纯度检测API不可用"
              : "<b style='color:red'>❌ 节点不可用</b>"
          });
        },
        function () {
          $done({
            title: "IP纯度检测",
            htmlMessage: "<b style='color:red'>❌ 节点不可用或网络超时</b>"
          });
        }
      );
    }
  );
}

// ============================================================
// Env 类 (与 Loon/ChatGPT.js 兼容)
// ============================================================
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isLoon(){return"Loon"===this.getEnv()}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Loon":case"Stash":case"Shadowrocket":default:$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break}}post(t,e=(()=>{})){const s=t.method?t.method.toLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Loon":case"Stash":case"Shadowrocket":default:$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){this.log("",`❗️${this.name}, 错误!`,t.stack?e+"\n"+t.stack:t)}queryStr(t){let e="";for(const s in t){const a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e.substring(0,e.length-1)}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.logs.length>0&&this.log("",this.logs.join(this.logSeparator)),$done(t)}}(t,e)}
