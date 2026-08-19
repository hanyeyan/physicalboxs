/*
 * ============================================================
 * Loon IPPure 节点纯净度检测
 * ============================================================
 *
 * [Script]
 * generic script-path=https://你的GitHub地址/IPPure.js, timeout=15
 *
 * 功能：
 *   当前节点 -> IPPure
 *
 * 检测：
 *   IP
 *   ASN
 *   ISP
 *   地区
 *   Residential
 *   Broadcast
 *   Fraud Score
 *
 * ============================================================
 */

const API_URL = "https://my.ippure.com/v1/info";

const node =
  $environment.params.node;


/* ============================================================
 * 主函数
 * ============================================================
 */

IPPure_Test()
  .catch((e) => {
    $.logErr(e);
    $done();
  });


async function IPPure_Test() {

  $.log("开始检测节点：");
  $.log(node);


  /* ==========================================================
   * 请求 IPPure
   * ==========================================================
   */

  const options = {

    url: API_URL,

    headers: {

      "User-Agent":
        "Loon-IPPure/1.0",

      "Accept":
        "application/json"
    },

    /*
     * 关键：
     * 当前 Loon 执行的节点
     */

    node: node,

    timeout: 10000
  };


  return $.http.get(options).then(
    (resp) => {

      const body =
        resp.body;


      $.log("IPPure RAW:");
      $.log(body);


      /* ======================================================
       * 空数据
       * ======================================================
       */

      if (
        !body ||
        body.trim() === ""
      ) {

        $.log(
          "IPPure 返回 EMPTY CONTENT"
        );

        $done();

        return;
      }


      /* ======================================================
       * JSON
       * ======================================================
       */

      let data;

      try {

        data =
          JSON.parse(body);

      } catch (e) {

        $.log(
          "JSON Parse Error"
        );

        $.log(body);

        $done();

        return;
      }


      /* ======================================================
       * 数据
       * ======================================================
       */

      const ip =
        data.ip || "未知";


      const asn =
        data.asn !== undefined
          ? "AS" + data.asn
          : "未知";


      const isp =
        data.asOrganization ||
        "未知";


      const country =
        data.country ||
        "未知";


      const countryCode =
        data.countryCode ||
        "";


      const city =
        data.city ||
        "未知";


      const timezone =
        data.timezone ||
        "未知";


      const fraudScore =
        data.fraudScore !== undefined
          ? Number(data.fraudScore)
          : null;


      const residential =
        data.isResidential;


      const broadcast =
        data.isBroadcast;


      /* ======================================================
       * 风险评级
       * ======================================================
       */

      let riskText =
        "未知";

      let riskColor =
        "#808080";


      if (
        fraudScore !== null &&
        !isNaN(fraudScore)
      ) {

        if (fraudScore <= 20) {

          riskText =
            "🟢 很干净";

          riskColor =
            "#16a34a";

        } else if (
          fraudScore <= 40
        ) {

          riskText =
            "🟡 一般";

          riskColor =
            "#ca8a04";

        } else if (
          fraudScore <= 60
        ) {

          riskText =
            "🟠 有风险";

          riskColor =
            "#ea580c";

        } else if (
          fraudScore <= 80
        ) {

          riskText =
            "🔴 高风险";

          riskColor =
            "#dc2626";

        } else {

          riskText =
            "⛔ 极高风险";

          riskColor =
            "#991b1b";
        }
      }


      /* ======================================================
       * Residential
       * ======================================================
       */

      let residentialText =
        "未知";


      if (
        residential === true
      ) {

        residentialText =
          "✅ 是";

      } else if (
        residential === false
      ) {

        residentialText =
          "❌ 否";
      }


      /* ======================================================
       * Broadcast
       * ======================================================
       */

      let broadcastText =
        "未知";


      if (
        broadcast === true
      ) {

        broadcastText =
          "⚠️ 是";

      } else if (
        broadcast === false
      ) {

        broadcastText =
          "✅ 否";
      }


      /* ======================================================
       * 类型
       * ======================================================
       */

      let type =
        "未知";


      if (
        data.isDataCenter === true
      ) {

        type =
          "IDC";

      } else if (
        data.isHosting === true
      ) {

        type =
          "Hosting";

      } else if (
        residential === true
      ) {

        type =
          "Residential";

      } else if (
        residential === false
      ) {

        type =
          "Commercial / IDC";
      }


      /* ======================================================
       * 地区
       * ======================================================
       */

      let location =
        country;


      if (
        countryCode
      ) {

        location +=
          " (" +
          countryCode +
          ")";
      }


      if (
        city
      ) {

        location +=
          " · " +
          city;
      }


      /* ======================================================
       * HTML
       * ======================================================
       */

      let message = "";


      message +=
        `<div style="font-family:-apple-system; font-size:16px;">`;


      message +=
        `<div style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:12px;">` +
        `🛡️ IPPure 节点检测` +
        `</div>`;


      message +=
        `<div style="text-align:center; color:#6959CD; font-size:15px; margin-bottom:18px;">` +
        `${node}` +
        `</div>`;


      /* ======================================================
       * IP 信息
       * ======================================================
       */

      message +=
        `<div style="font-weight:bold; font-size:17px; margin-top:10px;">🌐 IP 信息</div>`;


      message +=
        `<div style="margin-top:8px;">` +
        `IP　　<b>${ip}</b>` +
        `</div>`;


      message +=
        `<div>ASN　 <b>${asn}</b></div>`;


      message +=
        `<div>ISP　 <b>${isp}</b></div>`;


      message +=
        `<div>地区　 <b>${location}</b></div>`;


      message +=
        `<div>时区　 ${timezone}</div>`;


      /* ======================================================
       * 纯净度
       * ======================================================
       */

      message +=
        `<div style="font-weight:bold; font-size:17px; margin-top:18px;">🛡️ IP 纯净度</div>`;


      message +=
        `<div style="margin-top:8px;">` +
        `类型　 <b>${type}</b>` +
        `</div>`;


      message +=
        `<div>住宅　 ${residentialText}</div>`;


      message +=
        `<div>广播　 ${broadcastText}</div>`;


      /* ======================================================
       * 风险
       * ======================================================
       */

      message +=
        `<div style="font-weight:bold; font-size:17px; margin-top:18px;">⚠️ 风险评估</div>`;


      message +=
        `<div style="margin-top:8px;">` +
        `风险分　<b>${fraudScore !== null ? fraudScore + " / 100" : "未知"}</b>` +
        `</div>`;


      message +=
        `<div style="color:${riskColor}; font-weight:bold; font-size:18px; margin-top:5px;">` +
        `${riskText}` +
        `</div>`;


      /* ======================================================
       * Footer
       * ======================================================
       */

      message +=
        `<div style="margin-top:20px; padding-top:10px; border-top:1px solid #ddd; color:#888; font-size:12px; text-align:center;">` +
        `检测服务：IPPure` +
        `</div>`;


      message +=
        `</div>`;


      /* ======================================================
       * 返回 Loon
       *
       * 这是关键
       * ======================================================
       */

      $done({

        title:
          "🛡️ IPPure 节点检测",

        htmlMessage:
          message
      });


    },

    (reason) => {

      $.log(
        "IPPure 请求失败"
      );

      $.log(
        reason
      );

      $done();

    }
  );
}


/* ============================================================
 * Env
 *
 * 使用 ChatGPT.js 同样的 Env 方式
 * ============================================================
 */

function Env(name) {

  return {

    name: name,

    http: {

      get(options) {

        return new Promise(
          (resolve, reject) => {

            $httpClient.get(
              options,
              (
                error,
                response,
                body
              ) => {

                if (error) {

                  reject(error);

                  return;
                }


                response.body =
                  body;


                resolve(
                  response
                );
              }
            );
          }
        );
      }
    },

    log(...args) {

      console.log(
        args.join("\n")
      );
    },

    logErr(error) {

      console.log(
        "ERROR:",
        error
      );
    },

    done(value) {

      $done(value || {});
    }
  };
}


const $ =
  new Env("IPPure");