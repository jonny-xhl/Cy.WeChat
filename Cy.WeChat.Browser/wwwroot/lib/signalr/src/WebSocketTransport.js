"use strict";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ILogger_1 = require("./ILogger");
const ITransport_1 = require("./ITransport");
const Utils_1 = require("./Utils");
/** @private */
class WebSocketTransport {
    constructor(httpClient, accessTokenFactory, logger, logMessageContent, webSocketConstructor) {
        this.logger = logger;
        this.accessTokenFactory = accessTokenFactory;
        this.logMessageContent = logMessageContent;
        this.webSocketConstructor = webSocketConstructor;
        this.httpClient = httpClient;
        this.onreceive = null;
        this.onclose = null;
    }
    connect(url, transferFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            Utils_1.Arg.isRequired(url, "url");
            Utils_1.Arg.isRequired(transferFormat, "transferFormat");
            Utils_1.Arg.isIn(transferFormat, ITransport_1.TransferFormat, "transferFormat");
            this.logger.log(ILogger_1.LogLevel.Trace, "(WebSockets transport) Connecting.");
            if (this.accessTokenFactory) {
                const token = yield this.accessTokenFactory();
                if (token) {
                    url += (url.indexOf("?") < 0 ? "?" : "&") + `access_token=${encodeURIComponent(token)}`;
                }
            }
            return new Promise((resolve, reject) => {
                url = url.replace(/^http/, "ws");
                let webSocket;
                const cookies = this.httpClient.getCookieString(url);
                let opened = false;
                if (Utils_1.Platform.isNode && cookies) {
                    // Only pass cookies when in non-browser environments
                    webSocket = new this.webSocketConstructor(url, undefined, {
                        headers: {
                            Cookie: `${cookies}`,
                        },
                    });
                }
                if (!webSocket) {
                    // Chrome is not happy with passing 'undefined' as protocol
                    webSocket = new this.webSocketConstructor(url);
                }
                if (transferFormat === ITransport_1.TransferFormat.Binary) {
                    webSocket.binaryType = "arraybuffer";
                }
                // tslint:disable-next-line:variable-name
                webSocket.onopen = (_event) => {
                    this.logger.log(ILogger_1.LogLevel.Information, `WebSocket connected to ${url}.`);
                    this.webSocket = webSocket;
                    opened = true;
                    resolve();
                };
                webSocket.onerror = (event) => {
                    let error = null;
                    // ErrorEvent is a browser only type we need to check if the type exists before using it
                    if (typeof ErrorEvent !== "undefined" && event instanceof ErrorEvent) {
                        error = event.error;
                    }
                    else {
                        error = new Error("There was an error with the transport.");
                    }
                    reject(error);
                };
                webSocket.onmessage = (message) => {
                    this.logger.log(ILogger_1.LogLevel.Trace, `(WebSockets transport) data received. ${Utils_1.getDataDetail(message.data, this.logMessageContent)}.`);
                    if (this.onreceive) {
                        this.onreceive(message.data);
                    }
                };
                webSocket.onclose = (event) => {
                    // Don't call close handler if connection was never established
                    // We'll reject the connect call instead
                    if (opened) {
                        this.close(event);
                    }
                    else {
                        let error = null;
                        // ErrorEvent is a browser only type we need to check if the type exists before using it
                        if (typeof ErrorEvent !== "undefined" && event instanceof ErrorEvent) {
                            error = event.error;
                        }
                        else {
                            error = new Error("There was an error with the transport.");
                        }
                        reject(error);
                    }
                };
            });
        });
    }
    send(data) {
        if (this.webSocket && this.webSocket.readyState === this.webSocketConstructor.OPEN) {
            this.logger.log(ILogger_1.LogLevel.Trace, `(WebSockets transport) sending data. ${Utils_1.getDataDetail(data, this.logMessageContent)}.`);
            this.webSocket.send(data);
            return Promise.resolve();
        }
        return Promise.reject("WebSocket is not in the OPEN state");
    }
    stop() {
        if (this.webSocket) {
            // Clear websocket handlers because we are considering the socket closed now
            this.webSocket.onclose = () => { };
            this.webSocket.onmessage = () => { };
            this.webSocket.onerror = () => { };
            this.webSocket.close();
            this.webSocket = undefined;
            // Manually invoke onclose callback inline so we know the HttpConnection was closed properly before returning
            // This also solves an issue where websocket.onclose could take 18+ seconds to trigger during network disconnects
            this.close(undefined);
        }
        return Promise.resolve();
    }
    close(event) {
        // webSocket will be null if the transport did not start successfully
        this.logger.log(ILogger_1.LogLevel.Trace, "(WebSockets transport) socket closed.");
        if (this.onclose) {
            if (event && (event.wasClean === false || event.code !== 1000)) {
                this.onclose(new Error(`WebSocket closed with status code: ${event.code} (${event.reason}).`));
            }
            else {
                this.onclose();
            }
        }
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=WebSocketTransport.js.map