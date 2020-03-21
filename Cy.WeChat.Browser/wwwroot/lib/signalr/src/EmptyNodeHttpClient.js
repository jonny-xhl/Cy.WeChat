"use strict";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
// This is an empty implementation of the NodeHttpClient that will be included in browser builds so the output file will be smaller
const HttpClient_1 = require("./HttpClient");
/** @private */
class NodeHttpClient extends HttpClient_1.HttpClient {
    // @ts-ignore: Need ILogger to compile, but unused variables generate errors
    constructor(logger) {
        super();
    }
    send() {
        return Promise.reject(new Error("If using Node either provide an XmlHttpRequest polyfill or consume the cjs or esm script instead of the browser/signalr.js one."));
    }
}
exports.NodeHttpClient = NodeHttpClient;
//# sourceMappingURL=EmptyNodeHttpClient.js.map