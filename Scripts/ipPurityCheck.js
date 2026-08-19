/*
 * Loon - IPPure Node Purity Detector
 *
 * 功能：
 * 1. 获取 Generic Script 当前传入的节点
 * 2. 强制通过该节点访问 IPPure
 * 3. 检测该节点实际出口 IP
 * 4. 显示 IP / ASN / ISP / 地区 / Fraud Score
 * 5. 判断 Residential / Broadcast
 * 6. Loon Notification 通知
 *
 * 要求：
 * Loon Build 410+
 *
 * Generic Script:
 * generic script-path=https://raw.githubusercontent.com/hanyeyan/physicalboxs/main/Scripts/ipPurityCheck.js, timeout=15, tag=IP纯度检测
 */

const API_URL = "https://my.ippure.com/v1/info";
const TIMEOUT = 12000;


// ==============================
// 获取当前执行节点
// ==============================

let nodeName = "";

try {
    if (
        typeof $environment !== "undefined" &&
        $environment.params
    ) {
        nodeName = $environment.params.node || "";
    }
} catch (e) {
    nodeName = "";
}


// ==============================
// 工具函数
// ==============================

function notify(title, subtitle, content) {

    $notification.post(
        title,
        subtitle,
        content
    );
}


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
        return "是";
    }

    if (value === false) {
        return "否";
    }

    return "未知";
}


function riskLevel(score) {

    if (
        score === undefined ||
        score === null ||
        isNaN(Number(score))
    ) {
        return "未知";
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


function nodeType(data) {

    /*
     * IPPure 当前公开 /v1/info
     * 主要提供 isResidential / isBroadcast。
     *
     * 如果以后 API 增加 isDataCenter / isHosting
     * 等字段，这里也兼容。
     */

    if (data.isDataCenter === true) {
        return "IDC";
    }

    if (data.isHosting === true) {
        return "IDC / Hosting";
    }

    if (data.isResidential === true) {
        return "住宅";
    }

    if (data.isResidential === false) {
        return "非住宅 / 商业网络";
    }

    return "未知";
}


// ==============================
// 主函数
// ==============================

function main() {

    // ------------------------------
    // 没有获取到节点
    // ------------------------------

    if (!nodeName) {

        notify(
            "🛡 IPPure 节点检测",
            "未获取到节点",
            "请将脚本设置为 Generic Script，并从节点上下文执行。"
        );

        $done();
        return;
    }


    // ------------------------------
    // 请求 IPPure
    //
    // 关键：
    // node: nodeName
    //
    // 这会让 API 请求通过指定节点
    // ------------------------------

    const request = {

        url: API_URL,

        timeout: TIMEOUT,

        headers: {
            "User-Agent": "Loon-IPPure-Checker"
        },

        node: nodeName
    };


    $httpClient.get(
        request,
        function (
            error,
            response,
            body
        ) {

            // --------------------------
            // 请求失败
            // --------------------------

            if (error) {

                notify(
                    "❌ IPPure 检测失败",
                    nodeName,
                    "无法通过该节点访问 IPPure\n\n" +
                    "错误：" + error
                );

                $done();
                return;
            }


            // --------------------------
            // HTTP 状态码
            // --------------------------

            if (
                !response ||
                response.status < 200 ||
                response.status >= 300
            ) {

                notify(
                    "❌ IPPure 检测失败",
                    nodeName,
                    "HTTP 状态码：" +
                    safe(
                        response && response.status,
                        "未知"
                    )
                );

                $done();
                return;
            }


            // --------------------------
            // JSON
            // --------------------------

            let data;

            try {

                data = JSON.parse(body);

            } catch (e) {

                notify(
                    "❌ IPPure 数据错误",
                    nodeName,
                    "API 返回的数据不是有效 JSON。\n\n" +
                    String(body).substring(0, 300)
                );

                $done();
                return;
            }


            // --------------------------
            // 基础信息
            // --------------------------

            const ip =
                safe(data.ip);

            const asn =
                data.asn !== undefined
                    ? "AS" + data.asn
                    : "未知";

            const org =
                safe(data.asOrganization);

            const country =
                safe(data.countryCode, "");

            const countryName =
                safe(data.country, "");

            const region =
                safe(data.region, "");

            const city =
                safe(data.city, "");

            const timezone =
                safe(data.timezone, "");


            // --------------------------
            // 风险
            // --------------------------

            const fraudScore =
                data.fraudScore !== undefined
                    ? Number(data.fraudScore)
                    : null;

            const risk =
                riskLevel(fraudScore);


            // --------------------------
            // IP 类型
            // --------------------------

            const residential =
                boolText(data.isResidential);

            const broadcast =
                boolText(data.isBroadcast);

            const type =
                nodeType(data);


            // --------------------------
            // 组装地区
            // --------------------------

            let location = "";

            if (countryName) {
                location += countryName;
            }

            if (country) {
                location +=
                    location
                        ? " (" + country + ")"
                        : country;
            }

            if (region) {
                location +=
                    location
                        ? " / " + region
                        : region;
            }

            if (city) {
                location +=
                    location
                        ? " / " + city
                        : city;
            }

            if (!location) {
                location = "未知";
            }


            // --------------------------
            // 风险分显示
            // --------------------------

            let scoreText = "未知";

            if (fraudScore !== null) {

                scoreText =
                    fraudScore +
                    " / 100";
            }


            // --------------------------
            // 最终通知
            // --------------------------

            const content =

                "IP        " + ip + "\n" +

                "ASN       " + asn + "\n" +

                "ISP       " + org + "\n" +

                "地区      " + location + "\n" +

                "\n" +

                "类型      " + type + "\n" +

                "住宅      " + residential + "\n" +

                "Broadcast " + broadcast + "\n" +

                "\n" +

                "风险分    " + scoreText + "\n" +

                "风险等级  " + risk;


            notify(
                "🛡 IPPure 节点纯净度",
                nodeName,
                content
            );


            $done();
        }
    );
}


main();