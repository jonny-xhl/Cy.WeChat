"use strict";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
const Errors_1 = require("./Errors");
const HttpClient_1 = require("./HttpClient");
const ILogger_1 = require("./ILogger");
const Utils_1 = require("./Utils");
let requestModule;
if (typeof XMLHttpRequest === "undefined") {
    // In order to ignore the dynamic require in webpack builds we need to do this magic
    // @ts-ignore: TS doesn't know about these names
    const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
    requestModule = requireFunc("request");
}
/** @private */
class NodeHttpClient extends HttpClient_1.HttpClient {
    constructor(logger) {
        super();
        if (typeof requestModule === "undefined") {
            throw new Error("The 'request' module could not be loaded.");
        }
        this.logger = logger;
        this.cookieJar = requestModule.jar();
        this.request = requestModule.defaults({ jar: this.cookieJar });
    }
    send(httpRequest) {
        return new Promise((resolve, reject) => {
            let requestBody;
            if (Utils_1.isArrayBuffer(httpRequest.content)) {
                requestBody = Buffer.from(httpRequest.content);
            }
            else {
                requestBody = httpRequest.content || "";
            }
            const currentRequest = this.request(httpRequest.url, {
                body: requestBody,
                // If binary is expected 'null' should be used, otherwise for text 'utf8'
                encoding: httpRequest.responseType === "arraybuffer" ? null : "utf8",
                headers: Object.assign({ 
                    // Tell auth middleware to 401 instead of redirecting
                    "X-Requested-With": "XMLHttpRequest" }, httpRequest.headers),
                method: httpRequest.method,
                timeout: httpRequest.timeout,
            }, (error, response, body) => {
                if (httpRequest.abortSignal) {
                    httpRequest.abortSignal.onabort = null;
                }
                if (error) {
                    if (error.code === "ETIMEDOUT") {
                        this.logger.log(ILogger_1.LogLevel.Warning, `Timeout from HTTP request.`);
                        reject(new Errors_1.TimeoutError());
                    }
                    this.logger.log(ILogger_1.LogLevel.Warning, `Error from HTTP request. ${error}`);
                    reject(error);
                    return;
                }
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    resolve(new HttpClient_1.HttpResponse(response.statusCode, response.statusMessage || "", body));
                }
                else {
                    reject(new Errors_1.HttpError(response.statusMessage || "", response.statusCode || 0));
                }
            });
            if (httpRequest.abortSignal) {
                httpRequest.abortSignal.onabort = () => {
                    currentRequest.abort();
                    reject(new Errors_1.AbortError());
                };
            }
        });
    }
    getCookieString(url) {
        return this.cookieJar.getCookieString(url);
    }
}
exports.NodeHttpClient = NodeHttpClient;
//# sourceMappingURL=NodeHttpClient.js.map