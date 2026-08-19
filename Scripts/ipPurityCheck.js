/*
 * ============================================================
 * Loon IPPure Node Purity Checker
 * ============================================================
 *
 * 功能：
 *   获取 Loon 执行时指定的节点
 *   ↓
 *   强制通过该节点访问 IPPure
 *   ↓
 *   获取该节点真实出口 IP
 *
 * 检测：
 *   IP
 *   ASN
 *   ISP
 *   国家 / 地区 / 城市
 *   Fraud Score
 *   Residential
 *   Broadcast
 *
 * ============================================================
 */

const API_URL = "https://my.ippure.com/v1/info";
const TIMEOUT = 15000;


/* ============================================================
 * 工具
 * ============================================================
 */

function safe(value, fallback = "未知") {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    return String(value);
}


function boolText(value) {

    if (value === true) {
        return "✅ 是";
    }

    if (value === false) {
        return "❌ 否";
    }

    return "❔ 未知";
}


function riskLevel(score) {

    if (
        score === undefined ||
        score === null ||
        isNaN(Number(score))
    ) {
        return "❔ 未知";
    }

    score = Number(score);

    if (score <= 20) {
        return "🟢 很干净";
    }

    if (score <= 40) {
        return "🟡 一般";
    }

    if (score <= 60) {
        return "🟠 有风险";
    }

    if (score <= 80) {
        return "🔴 高风险";
    }

    return "⛔ 极高风险";
}


function notify(title, subtitle, content) {

    $notification.post(
        title,
        subtitle,
        content
    );
}


/* ============================================================
 * 获取 Loon 当前执行节点
 * ============================================================
 */

let node = "";

try {

    if (
        typeof $environment !== "undefined" &&
        $environment.params
    ) {

        node =
            $environment.params.node ||
            $environment.params.nodeName ||
            $environment.params.proxy ||
            $environment.params.proxyName ||
            "";
    }

} catch (e) {

    node = "";
}


/* ============================================================
 * 没有节点
 * ============================================================
 */

if (!node) {

    notify(
        "🛡 IPPure 节点检测",
        "未获取到节点",
        "请从 Loon 节点上下文执行该脚本。"
    );

    $done();

} else {


    /* ========================================================
     * 构造请求
     * ========================================================
     */

    const request = {

        url: API_URL,

        timeout: TIMEOUT,

        headers: {

            "User-Agent":
                "Loon-IPPure-Checker/1.0",

            "Accept":
                "application/json"
        },

        /*
         * 关键：
         *
         * IPPure 请求强制使用
         * Loon 当前传入的节点
         */

        node: node
    };


    /* ========================================================
     * 请求 IPPure
     * ========================================================
     */

    $httpClient.get(
        request,

        function (
            error,
            response,
            body
        ) {

            /* ==================================================
             * 网络错误
             * ==================================================
             */

            if (error) {

                notify(
                    "❌ IPPure 检测失败",
                    node,

                    "请求 IPPure 失败\n\n" +
                    "错误：\n" +
                    String(error)
                );

                $done();

                return;
            }


            /* ==================================================
             * HTTP 错误
             * ==================================================
             */

            if (
                !response ||
                response.status < 200 ||
                response.status >= 300
            ) {

                notify(
                    "❌ IPPure 检测失败",
                    node,

                    "HTTP Status： " +
                    (
                        response
                            ? response.status
                            : "未知"
                    )
                );

                $done();

                return;
            }


            /* ==================================================
             * 空数据
             * ==================================================
             */

            if (
                !body ||
                String(body).trim() === ""
            ) {

                notify(
                    "❌ IPPure 检测失败",
                    node,

                    "API 返回 EMPTY CONTENT"
                );

                $done();

                return;
            }


            /* ==================================================
             * JSON
             * ==================================================
             */

            let data;

            try {

                data =
                    JSON.parse(body);

            } catch (e) {

                notify(
                    "❌ IPPure 数据错误",
                    node,

                    "JSON 解析失败\n\n" +
                    String(body).substring(
                        0,
                        500
                    )
                );

                $done();

                return;
            }


            /* ==================================================
             * IP
             * ==================================================
             */

            const ip =
                safe(data.ip);


            /* ==================================================
             * ASN
             * ==================================================
             */

            const asn =
                data.asn !== undefined
                    ? "AS" + data.asn
                    : "未知";


            /* ==================================================
             * ISP
             * ==================================================
             */

            const isp =
                safe(
                    data.asOrganization
                );


            /* ==================================================
             * 地区
             * ==================================================
             */

            const country =
                safe(
                    data.country
                );

            const countryCode =
                safe(
                    data.countryCode,
                    ""
                );

            const city =
                safe(
                    data.city
                );


            /* ==================================================
             * 风险分
             * ==================================================
             */

            const fraudScore =
                data.fraudScore !== undefined
                    ? Number(
                        data.fraudScore
                    )
                    : null;


            const risk =
                riskLevel(
                    fraudScore
                );


            /* ==================================================
             * Residential
             * ==================================================
             */

            const residential =
                boolText(
                    data.isResidential
                );


            /* ==================================================
             * Broadcast
             * ==================================================
             */

            const broadcast =
                boolText(
                    data.isBroadcast
                );


            /* ==================================================
             * 节点类型
             * ==================================================
             */

            let nodeType =
                "未知";


            if (
                data.isDataCenter === true
            ) {

                nodeType =
                    "IDC";

            } else if (
                data.isHosting === true
            ) {

                nodeType =
                    "Hosting";

            } else if (
                data.isResidential === true
            ) {

                nodeType =
                    "Residential";

            } else if (
                data.isResidential === false
            ) {

                nodeType =
                    "Commercial / IDC";
            }


            /* ==================================================
             * 地区字符串
             * ==================================================
             */

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


            /* ==================================================
             * 风险分
             * ==================================================
             */

            const scoreText =
                fraudScore !== null
                    ? fraudScore +
                      " / 100"
                    : "未知";


            /* ==================================================
             * 最终通知
             * ==================================================
             */

            const result =

                "节点　" +
                node +

                "\n\n" +

                "IP　　" +
                ip +

                "\n" +

                "ASN　 " +
                asn +

                "\n" +

                "ISP　 " +
                isp +

                "\n" +

                "地区　" +
                location +

                "\n\n" +

                "类型　" +
                nodeType +

                "\n" +

                "住宅　" +
                residential +

                "\n" +

                "广播　" +
                broadcast +

                "\n\n" +

                "风险　" +
                scoreText +

                "\n" +

                "评级　" +
                risk;


            notify(
                "🛡 IPPure 节点纯净度",
                node,
                result
            );


            $done();
        }
    );
}