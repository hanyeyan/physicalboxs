/*
 * IPPure 节点纯净度检测
 *
 * [Script]
 * generic script-path=https://你的RAW地址/IPPure.js, timeout=15
 */

const $ = new Env("IPPure");

IPPure_Test()
  .catch((e) => $.logErr(e))
  .finally(() => {
    $.done();
  });


async function IPPure_Test() {

  /*
   * 获取当前 Loon 执行的节点
   */
  const node = $environment.params.node;

  $.log("检测节点：");
  $.log(node);


  /*
   * IPPure API
   */
  const options = {
    url: "https://my.ippure.com/v1/info",

    headers: {
      "User-Agent": "Loon-IPPure/1.0",
      "Accept": "application/json"
    },

    /*
     * 强制使用当前节点
     */
    node: node,

    timeout: 10000
  };


  return $.http.get(options).then(
    (resp) => {

      const body = resp.body;

      $.log("IPPure:");
      $.log(body);


      if (!body) {
        throw new Error("IPPure 返回空内容");
      }


      let data;

      try {
        data = JSON.parse(body);
      } catch (e) {
        throw new Error(
          "JSON解析失败：" + body
        );
      }


      /*
       * IP
       */
      const ip =
        data.ip || "未知";


      /*
       * ASN
       */
      const asn =
        data.asn !== undefined
          ? "AS" + data.asn
          : "未知";


      /*
       * ISP
       */
      const isp =
        data.asOrganization || "未知";


      /*
       * 地区
       */
      const country =
        data.country || "未知";

      const countryCode =
        data.countryCode || "";

      const city =
        data.city || "未知";


      /*
       * 风险分
       */
      const fraudScore =
        data.fraudScore !== undefined
          ? data.fraudScore
          : "未知";


      /*
       * Residential
       */
      let residential = "未知";

      if (data.isResidential === true) {
        residential = "✅ 是";
      }

      if (data.isResidential === false) {
        residential = "❌ 否";
      }


      /*
       * Broadcast
       */
      let broadcast = "未知";

      if (data.isBroadcast === true) {
        broadcast = "⚠️ 是";
      }

      if (data.isBroadcast === false) {
        broadcast = "✅ 否";
      }


      /*
       * 风险等级
       */
      let risk = "未知";

      if (
        fraudScore !== "未知" &&
        !isNaN(Number(fraudScore))
      ) {

        const score =
          Number(fraudScore);

        if (score <= 20) {
          risk = "🟢 很干净";
        } else if (score <= 40) {
          risk = "🟡 一般";
        } else if (score <= 60) {
          risk = "🟠 有风险";
        } else if (score <= 80) {
          risk = "🔴 高风险";
        } else {
          risk = "⛔ 极高风险";
        }
      }


      /*
       * 节点类型
       */
      let type = "未知";

      if (data.isResidential === true) {
        type = "Residential";
      } else if (data.isResidential === false) {
        type = "Commercial / IDC";
      }


      /*
       * 地区
       */
      let location = country;

      if (countryCode) {
        location +=
          " (" + countryCode + ")";
      }

      if (city) {
        location +=
          " · " + city;
      }


      /*
       * Loon HTML
       *
       * 按你提供的 ChatGPT.js 格式
       */
      let message = "";

      message +=
        "------------------------------";


      message +=
        "</br><b>" +
        "<font color=#6959CD>" +
        "🛡️ IPPure" +
        "</font>" +
        "</b></br>";


      message +=
        "------------------------------";


      message +=
        `</br><font color=#6959CD>` +
        `<b>节点</b> ➟ ${node}` +
        `</font>`;


      message +=
        `</br><b>IP</b> ➟ ${ip}`;


      message +=
        `</br><b>ASN</b> ➟ ${asn}`;


      message +=
        `</br><b>ISP</b> ➟ ${isp}`;


      message +=
        `</br><b>地区</b> ➟ ${location}`;


      message +=
        "</br></br>";


      message +=
        "<b>🛡️ IP 纯净度</b>";


      message +=
        `</br><b>类型</b> ➟ ${type}`;


      message +=
        `</br><b>住宅</b> ➟ ${residential}`;


      message +=
        `</br><b>广播</b> ➟ ${broadcast}`;


      message +=
        "</br></br>";


      message +=
        "<b>⚠️ 风险评估</b>";


      message +=
        `</br><b>Fraud Score</b> ➟ ${fraudScore} / 100`;


      message +=
        `</br><b>评级</b> ➟ ${risk}`;


      message +=
        "</br>------------------------------";


      /*
       * 居中显示
       */
      message =
        `<p style="text-align: center; ` +
        `font-family: -apple-system; ` +
        `font-size: large; ` +
        `font-weight: thin">` +
        message +
        `</p>`;


      /*
       * 关键：
       * 使用 Loon Generic Script 的返回页面
       */
      $done({
        title: "IPPure 节点检测",
        htmlMessage: message
      });

    },

    (reason) => {

      $.log("🔴 IPPure 检测失败");
      $.log(reason);

      $done();
    }
  );
}


/*
 * ============================================================
 * Env
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

                response.body = body;

                resolve(response);
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

      if (value) {
        $done(value);
      } else {
        $done();
      }
    }
  };
}