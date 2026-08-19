/*
 * ============================================================
 * Loon IPPure Node Checker - DEBUG
 * ============================================================
 *
 * 用途：
 *   1. 获取 Loon 当前执行节点
 *   2. 测试 $environment / $environment.params
 *   3. 测试 IPPure API
 *   4. 测试指定 node 请求
 *   5. 输出完整 DEBUG 信息
 *
 * API:
 *   https://my.ippure.com/v1/info
 *
 * 使用：
 *   Loon -> Script -> Generic Script
 *
 * ============================================================
 */

const API_URL = "https://my.ippure.com/v1/info";

const TIMEOUT = 15000;


/* ============================================================
 * 通知函数
 * ============================================================
 */

function notify(title, subtitle, body) {

    try {

        $notification.post(
            title,
            subtitle || "",
            body || ""
        );

    } catch (e) {

        console.log(
            "[NOTIFICATION ERROR] " +
            String(e)
        );
    }
}


/* ============================================================
 * 安全字符串
 * ============================================================
 */

function str(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "undefined";

    }

    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value,
                null,
                2
            );

        } catch (e) {

            return String(value);
        }
    }

    return String(value);
}


/* ============================================================
 * 获取 Environment
 * ============================================================
 */

let environmentExists = false;

let environment = {};

let params = {};

let node = "";

try {

    if (
        typeof $environment !== "undefined"
    ) {

        environmentExists = true;

        environment = $environment || {};

        params =
            $environment.params || {};

        /*
         * 第一优先级
         */
        node =
            params.node || "";

        /*
         * 某些环境可能参数名称不同
         */
        if (!node) {

            node =
                params.nodeName || "";
        }

        if (!node) {

            node =
                params.proxy || "";
        }

        if (!node) {

            node =
                params.proxyName || "";
        }

    }

} catch (e) {

    console.log(
        "[ENV ERROR] " +
        String(e)
    );
}


/* ============================================================
 * DEBUG 1
 *
 * 环境信息
 * ============================================================
 */

const envDebug =
    "environment exists: " +
    environmentExists +
    "\n\n" +

    "$environment:\n" +
    str(environment) +
    "\n\n" +

    "$environment.params:\n" +
    str(params) +
    "\n\n" +

    "Detected node:\n" +
    (node || "EMPTY");


notify(
    "IPPure DEBUG ①",
    "Environment / Node",
    envDebug
);


/* ============================================================
 * 请求 IPPure
 *
 * 如果 node 有值：
 *   强制通过指定节点
 *
 * 如果 node 为空：
 *   使用 Loon 默认代理
 * ============================================================
 */

const request = {

    url: API_URL,

    timeout: TIMEOUT,

    headers: {

        "User-Agent":
            "Loon-IPPure-Debug/1.0",

        "Accept":
            "application/json"
    }
};


/*
 * 只有获取到节点时才添加 node
 *
 * 防止：
 *
 * node: ""
 *
 * 导致 Loon 请求异常。
 */

if (node) {

    request.node = node;
}


/* ============================================================
 * DEBUG 2
 *
 * 实际请求参数
 * ============================================================
 */

const requestDebug =
    "URL:\n" +
    API_URL +
    "\n\n" +

    "Node:\n" +
    (node || "EMPTY") +
    "\n\n" +

    "Timeout:\n" +
    TIMEOUT +
    " ms\n\n" +

    "Request Object:\n" +
    str(request);


notify(
    "IPPure DEBUG ②",
    "HTTP Request",
    requestDebug
);


/* ============================================================
 * 开始请求
 * ============================================================
 */

console.log(
    "[IPPURE] Request start"
);

console.log(
    "[IPPURE] Node: " +
    (node || "EMPTY")
);


$httpClient.get(
    request,

    function (
        error,
        response,
        body
    ) {

        /* ====================================================
         * DEBUG 3
         *
         * HTTP 基础结果
         * ====================================================
         */

        let status =
            response &&
            response.status !== undefined
                ? response.status
                : "EMPTY";


        let headers =
            response &&
            response.headers
                ? response.headers
                : {};


        const httpDebug =

            "Node:\n" +
            (node || "EMPTY") +

            "\n\nHTTP Status:\n" +
            status +

            "\n\nError:\n" +
            (error || "NONE") +

            "\n\nResponse Headers:\n" +
            str(headers);


        notify(
            "IPPure DEBUG ③",
            "HTTP Result",
            httpDebug
        );


        /* ====================================================
         * 请求错误
         * ====================================================
         */

        if (error) {

            notify(
                "IPPure DEBUG ❌",
                "HTTP Request Error",

                "Node:\n" +
                (node || "EMPTY") +

                "\n\nError:\n" +
                str(error)
            );

            $done();

            return;
        }


        /* ====================================================
         * Body 原始数据
         * ====================================================
         */

        const rawBody =
            body === undefined ||
            body === null
                ? ""
                : String(body);


        /*
         * 防止通知过长
         *
         * 完整 Body 同时输出 console。
         */

        console.log(
            "[IPPURE] RAW BODY:"
        );

        console.log(
            rawBody
        );


        const bodyPreview =
            rawBody.length > 2500
                ? rawBody.substring(
                    0,
                    2500
                  ) +
                  "\n\n...[BODY TRUNCATED]"
                : rawBody;


        /* ====================================================
         * DEBUG 4
         * ====================================================
         */

        notify(
            "IPPure DEBUG ④",
            "Raw API Response",

            "Length: " +
            rawBody.length +

            "\n\nBODY:\n" +

            (
                bodyPreview ||
                "EMPTY"
            )
        );


        /* ====================================================
         * Empty Content
         * ====================================================
         */

        if (!rawBody) {

            notify(
                "IPPure DEBUG ❌",
                "EMPTY CONTENT",

                "IPPure 返回空内容。\n\n" +

                "Node:\n" +
                (node || "EMPTY") +

                "\n\nHTTP:\n" +
                status +

                "\n\nHeaders:\n" +
                str(headers)
            );

            $done();

            return;
        }


        /* ====================================================
         * JSON Parse
         * ====================================================
         */

        let data = null;

        try {

            data =
                JSON.parse(rawBody);

        } catch (e) {

            notify(
                "IPPure DEBUG ❌",
                "JSON Parse Error",

                "Parse Error:\n" +
                str(e) +

                "\n\nRAW BODY:\n" +
                bodyPreview
            );

            $done();

            return;
        }


        /* ====================================================
         * DEBUG 5
         *
         * JSON 数据结构
         * ====================================================
         */

        const jsonDebug =
            "JSON Parse: OK\n\n" +

            "Keys:\n" +
            Object.keys(data).join(
                ", "
            ) +

            "\n\nJSON:\n" +
            str(data);


        notify(
            "IPPure DEBUG ⑤",
            "JSON Parse",
            jsonDebug
        );


        /* ====================================================
         * 提取 IPPure 字段
         * ====================================================
         */

        const ip =
            data.ip || "未知";

        const asn =
            data.asn !== undefined
                ? "AS" + data.asn
                : "未知";

        const organization =
            data.asOrganization ||
            "未知";

        const country =
            data.country ||
            "未知";

        const countryCode =
            data.countryCode ||
            "";

        const region =
            data.region ||
            "未知";

        const city =
            data.city ||
            "未知";

        const timezone =
            data.timezone ||
            "未知";


        const fraudScore =
            data.fraudScore !== undefined
                ? data.fraudScore
                : "未知";


        const residential =
            data.isResidential === true
                ? "是"
                : data.isResidential === false
                    ? "否"
                    : "未知";


        const broadcast =
            data.isBroadcast === true
                ? "是"
                : data.isBroadcast === false
                    ? "否"
                    : "未知";


        /* ====================================================
         * 风险等级
         * ====================================================
         */

        let riskLevel =
            "未知";


        if (
            fraudScore !== "未知" &&
            !isNaN(
                Number(fraudScore)
            )
        ) {

            const score =
                Number(fraudScore);


            if (score <= 20) {

                riskLevel =
                    "🟢 很干净";

            } else if (
                score <= 40
            ) {

                riskLevel =
                    "🟡 一般";

            } else if (
                score <= 60
            ) {

                riskLevel =
                    "🟠 有风险";

            } else if (
                score <= 80
            ) {

                riskLevel =
                    "🔴 高风险";

            } else {

                riskLevel =
                    "⛔ 极高风险";
            }
        }


        /* ====================================================
         * 判断节点类型
         * ====================================================
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


        /* ====================================================
         * DEBUG 6
         *
         * 最终结果
         * ====================================================
         */

        const result =

            "━━━━━━━━━━━━━━━━━━\n" +

            "节点\n" +
            (node || "默认代理") +

            "\n\n" +

            "IP\n" +
            ip +

            "\n\n" +

            "ASN\n" +
            asn +

            "\n\n" +

            "ISP\n" +
            organization +

            "\n\n" +

            "地区\n" +
            country +
            (
                countryCode
                    ? " (" +
                      countryCode +
                      ")"
                    : ""
            ) +
            "\n" +
            region +
            "\n" +
            city +

            "\n\n" +

            "类型\n" +
            type +

            "\n\n" +

            "Residential\n" +
            residential +

            "\n\n" +

            "Broadcast\n" +
            broadcast +

            "\n\n" +

            "Fraud Score\n" +
            fraudScore +
            " / 100" +

            "\n\n" +

            "风险等级\n" +
            riskLevel +

            "\n\n" +

            "Timezone\n" +
            timezone +

            "\n\n" +

            "━━━━━━━━━━━━━━━━━━";


        notify(
            "IPPure DEBUG ⑥",
            "检测完成",

            result
        );


        /* ====================================================
         * console
         * ====================================================
         */

        console.log(
            "[IPPURE] RESULT:"
        );

        console.log(
            str(data)
        );


        $done();
    }
);