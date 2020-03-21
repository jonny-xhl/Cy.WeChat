"use strict";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
const Errors_1 = require("./Errors");
const HttpClient_1 = require("./HttpClient");
const NodeHttpClient_1 = require("./NodeHttpClient");
const XhrHttpClient_1 = require("./XhrHttpClient");
/** Default implementation of {@link @microsoft/signalr.HttpClient}. */
class DefaultHttpClient extends HttpClient_1.HttpClient {
    /** Creates a new instance of the {@link @microsoft/signalr.DefaultHttpClient}, using the provided {@link @microsoft/signalr.ILogger} to log messages. */
    constructor(logger) {
        super();
        if (typeof XMLHttpRequest !== "undefined") {
            this.httpClient = new XhrHttpClient_1.XhrHttpClient(logger);
        }
        else {
            this.httpClient = new NodeHttpClient_1.NodeHttpClient(logger);
        }
    }
    /** @inheritDoc */
    send(request) {
        // Check that abort was not signaled before calling send
        if (request.abortSignal && request.abortSignal.aborted) {
            return Promise.reject(new Errors_1.AbortError());
        }
        if (!request.method) {
            return Promise.reject(new Error("No method defined."));
        }
        if (!request.url) {
            return Promise.reject(new Error("No url defined."));
        }
        return this.httpClient.send(request);
    }
    getCookieString(url) {
        return this.httpClient.getCookieString(url);
    }
}
exports.DefaultHttpClient = DefaultHttpClient;
//# sourceMappingURL=DefaultHttpClient.js.map