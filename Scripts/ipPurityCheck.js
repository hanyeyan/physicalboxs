/*
 * IPPure Loon 节点纯净度检测
 *
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js,timeout=15,tag=IPPure节点检测
 */

const $ = new Env("IPPure");

IPPure_Test();


async function IPPure_Test() {

  try {

    // ============================================================
    // 获取当前 Loon 节点
    // ============================================================

    const node = $environment.params.node;

    $.log("检测节点：");
    $.log(node);


    if (!node) {

      $done({
        title: "IPPure 节点检测",
        htmlMessage:
          "<p style='text-align:center'>" +
          "<b>❌ 未获取到节点</b><br><br>" +
          "请从 Loon 节点菜单中执行此脚本。" +
          "</p>"
      });

      return;
    }


    // ============================================================
    // IPPure API
    // ============================================================

    const options = {

      url: "https://my.ippure.com/v1/info",

      timeout: 15000,

      node: node,

      headers: {
        "User-Agent": "Loon-IPPure/1.0",
        "Accept": "application/json"
      }
    };


    // ============================================================
    // 请求
    // ============================================================

    const response =
      await $.http.get(options);


    const body =
      response.body;


    $.log("IPPure RAW:");
    $.log(body);


    // ============================================================
    // 空内容
    // ============================================================

    if (!body) {

      throw new Error(
        "IPPure 返回 EMPTY CONTENT"
      );
    }


    // ============================================================
    // JSON
    // ============================================================

    let data;

    try {

      data =
        JSON.parse(body);

    } catch (e) {

      throw new Error(
        "JSON解析失败：\n" +
        body
      );
    }


    // ============================================================
    // 基础信息
    // ============================================================

    const ip =
      data.ip || "未知";


    const asn =
      data.asn !== undefined
        ? "AS" + data.asn
        : "未知";


    const isp =
      data.asOrganization || "未知";


    const country =
      data.country || "未知";


    const countryCode =
      data.countryCode || "";


    const city =
      data.city || "未知";


    const timezone =
      data.timezone || "未知";


    // ============================================================
    // Fraud Score
    // ============================================================

    const fraudScore =
      data.fraudScore !== undefined
        ? Number(data.fraudScore)
        : null;


    let risk =
      "未知";


    if (fraudScore !== null) {

      if (fraudScore <= 20) {

        risk = "🟢 很干净";

      } else if (fraudScore <= 40) {

        risk = "🟡 一般";

      } else if (fraudScore <= 60) {

        risk = "🟠 有风险";

      } else if (fraudScore <= 80) {

        risk = "🔴 高风险";

      } else {

        risk = "⛔ 极高风险";
      }
    }


    // ============================================================
    // Residential
    // ============================================================

    let residential =
      "❔ 未知";


    if (
      data.isResidential === true
    ) {

      residential =
        "✅ 是";

    } else if (
      data.isResidential === false
    ) {

      residential =
        "❌ 否";
    }


    // ============================================================
    // Broadcast
    // ============================================================

    let broadcast =
      "❔ 未知";


    if (
      data.isBroadcast === true
    ) {

      broadcast =
        "⚠️ 是";

    } else if (
      data.isBroadcast === false
    ) {

      broadcast =
        "✅ 否";
    }


    // ============================================================
    // 类型
    // ============================================================

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
      data.isResidential === true
    ) {

      type =
        "Residential";

    } else if (
      data.isResidential === false
    ) {

      type =
        "Commercial / IDC";
    }


    // ============================================================
    // 地区
    // ============================================================

    let location =
      country;


    if (countryCode) {

      location +=
        " (" +
        countryCode +
        ")";
    }


    if (city) {

      location +=
        " · " +
        city;
    }


    // ============================================================
    // Loon HTML
    // ============================================================

    let message = "";


    message +=
      "------------------------------";


    message +=
      "</br><b>" +
      "<font color=#6959CD>" +
      "🛡️ IPPure 节点纯净度" +
      "</font>" +
      "</b></br>";


    message +=
      "------------------------------";


    message +=
      "</br><font color=#6959CD>" +
      "<b>节点</b> ➟ " +
      node +
      "</font>";


    message +=
      "</br><b>IP</b> ➟ " +
      ip;


    message +=
      "</br><b>ASN</b> ➟ " +
      asn;


    message +=
      "</br><b>ISP</b> ➟ " +
      isp;


    message +=
      "</br><b>地区</b> ➟ " +
      location;


    message +=
      "</br><b>时区</b> ➟ " +
      timezone;


    message +=
      "</br></br>";


    message +=
      "<b>🛡️ IP 类型</b>";


    message +=
      "</br><b>类型</b> ➟ " +
      type;


    message +=
      "</br><b>住宅</b> ➟ " +
      residential;


    message +=
      "</br><b>广播</b> ➟ " +
      broadcast;


    message +=
      "</br></br>";


    message +=
      "<b>⚠️ 风险评估</b>";


    message +=
      "</br><b>Fraud Score</b> ➟ " +
      (
        fraudScore !== null
          ? fraudScore + " / 100"
          : "未知"
      );


    message +=
      "</br><b>评级</b> ➟ " +
      risk;


    message +=
      "</br>------------------------------";


    message =
      "<p style='" +
      "text-align:center;" +
      "font-family:-apple-system;" +
      "font-size:large;" +
      "font-weight:thin" +
      "'>" +
      message +
      "</p>";


    // ============================================================
    // 返回 Loon
    //
    // 注意：
    // 这里调用一次 $done 后绝对不要再调用第二次
    // ============================================================

    $done({

      title:
        "🛡️ IPPure 节点检测",

      htmlMessage:
        message
    });


  } catch (e) {

    // ============================================================
    // 错误
    // ============================================================

    $.logErr(e);


    $done({

      title:
        "❌ IPPure 检测失败",

      htmlMessage:
        "<p style='text-align:center'>" +
        "<b>节点：</b>" +
        ($environment.params.node || "未知") +
        "<br><br>" +
        "<b>错误：</b><br>" +
        String(e) +
        "</p>"
    });
  }
}


/* ============================================================
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


                if (!response) {

                  reject(
                    new Error(
                      "HTTP Response 为空"
                    )
                  );

                  return;
                }


                response.body =
                  body;


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
    }
  };
}