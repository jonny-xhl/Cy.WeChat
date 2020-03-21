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
const Loggers_1 = require("./Loggers");
/** @private */
class Arg {
    static isRequired(val, name) {
        if (val === null || val === undefined) {
            throw new Error(`The '${name}' argument is required.`);
        }
    }
    static isIn(val, values, name) {
        // TypeScript enums have keys for **both** the name and the value of each enum member on the type itself.
        if (!(val in values)) {
            throw new Error(`Unknown ${name} value: ${val}.`);
        }
    }
}
exports.Arg = Arg;
/** @private */
class Platform {
    static get isBrowser() {
        return typeof window === "object";
    }
    static get isWebWorker() {
        return typeof self === "object" && "importScripts" in self;
    }
    static get isNode() {
        return !this.isBrowser && !this.isWebWorker;
    }
}
exports.Platform = Platform;
/** @private */
function getDataDetail(data, includeContent) {
    let detail = "";
    if (isArrayBuffer(data)) {
        detail = `Binary data of length ${data.byteLength}`;
        if (includeContent) {
            detail += `. Content: '${formatArrayBuffer(data)}'`;
        }
    }
    else if (typeof data === "string") {
        detail = `String data of length ${data.length}`;
        if (includeContent) {
            detail += `. Content: '${data}'`;
        }
    }
    return detail;
}
exports.getDataDetail = getDataDetail;
/** @private */
function formatArrayBuffer(data) {
    const view = new Uint8Array(data);
    // Uint8Array.map only supports returning another Uint8Array?
    let str = "";
    view.forEach((num) => {
        const pad = num < 16 ? "0" : "";
        str += `0x${pad}${num.toString(16)} `;
    });
    // Trim of trailing space.
    return str.substr(0, str.length - 1);
}
exports.formatArrayBuffer = formatArrayBuffer;
// Also in signalr-protocol-msgpack/Utils.ts
/** @private */
function isArrayBuffer(val) {
    return val && typeof ArrayBuffer !== "undefined" &&
        (val instanceof ArrayBuffer ||
            // Sometimes we get an ArrayBuffer that doesn't satisfy instanceof
            (val.constructor && val.constructor.name === "ArrayBuffer"));
}
exports.isArrayBuffer = isArrayBuffer;
/** @private */
function sendMessage(logger, transportName, httpClient, url, accessTokenFactory, content, logMessageContent) {
    return __awaiter(this, void 0, void 0, function* () {
        let headers;
        if (accessTokenFactory) {
            const token = yield accessTokenFactory();
            if (token) {
                headers = {
                    ["Authorization"]: `Bearer ${token}`,
                };
            }
        }
        logger.log(ILogger_1.LogLevel.Trace, `(${transportName} transport) sending data. ${getDataDetail(content, logMessageContent)}.`);
        const responseType = isArrayBuffer(content) ? "arraybuffer" : "text";
        const response = yield httpClient.post(url, {
            content,
            headers,
            responseType,
        });
        logger.log(ILogger_1.LogLevel.Trace, `(${transportName} transport) request complete. Response status: ${response.statusCode}.`);
    });
}
exports.sendMessage = sendMessage;
/** @private */
function createLogger(logger) {
    if (logger === undefined) {
        return new ConsoleLogger(ILogger_1.LogLevel.Information);
    }
    if (logger === null) {
        return Loggers_1.NullLogger.instance;
    }
    if (logger.log) {
        return logger;
    }
    return new ConsoleLogger(logger);
}
exports.createLogger = createLogger;
/** @private */
class SubjectSubscription {
    constructor(subject, observer) {
        this.subject = subject;
        this.observer = observer;
    }
    dispose() {
        const index = this.subject.observers.indexOf(this.observer);
        if (index > -1) {
            this.subject.observers.splice(index, 1);
        }
        if (this.subject.observers.length === 0 && this.subject.cancelCallback) {
            this.subject.cancelCallback().catch((_) => { });
        }
    }
}
exports.SubjectSubscription = SubjectSubscription;
/** @private */
class ConsoleLogger {
    constructor(minimumLogLevel) {
        this.minimumLogLevel = minimumLogLevel;
        this.outputConsole = console;
    }
    log(logLevel, message) {
        if (logLevel >= this.minimumLogLevel) {
            switch (logLevel) {
                case ILogger_1.LogLevel.Critical:
                case ILogger_1.LogLevel.Error:
                    this.outputConsole.error(`[${new Date().toISOString()}] ${ILogger_1.LogLevel[logLevel]}: ${message}`);
                    break;
                case ILogger_1.LogLevel.Warning:
                    this.outputConsole.warn(`[${new Date().toISOString()}] ${ILogger_1.LogLevel[logLevel]}: ${message}`);
                    break;
                case ILogger_1.LogLevel.Information:
                    this.outputConsole.info(`[${new Date().toISOString()}] ${ILogger_1.LogLevel[logLevel]}: ${message}`);
                    break;
                default:
                    // console.debug only goes to attached debuggers in Node, so we use console.log for Trace and Debug
                    this.outputConsole.log(`[${new Date().toISOString()}] ${ILogger_1.LogLevel[logLevel]}: ${message}`);
                    break;
            }
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=Utils.js.map