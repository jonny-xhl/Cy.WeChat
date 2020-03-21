"use strict";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
/** Represents an HTTP response. */
class HttpResponse {
    constructor(statusCode, statusText, content) {
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.content = content;
    }
}
exports.HttpResponse = HttpResponse;
/** Abstraction over an HTTP client.
 *
 * This class provides an abstraction over an HTTP client so that a different implementation can be provided on different platforms.
 */
class HttpClient {
    get(url, options) {
        return this.send(Object.assign(Object.assign({}, options), { method: "GET", url }));
    }
    post(url, options) {
        return this.send(Object.assign(Object.assign({}, options), { method: "POST", url }));
    }
    delete(url, options) {
        return this.send(Object.assign(Object.assign({}, options), { method: "DELETE", url }));
    }
    /** Gets all cookies that apply to the specified URL.
     *
     * @param url The URL that the cookies are valid for.
     * @returns {string} A string containing all the key-value cookie pairs for the specified URL.
     */
    // @ts-ignore
    getCookieString(url) {
        return "";
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=HttpClient.js.map