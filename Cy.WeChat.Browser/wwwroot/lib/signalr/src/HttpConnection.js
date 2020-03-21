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
const DefaultHttpClient_1 = require("./DefaultHttpClient");
const ILogger_1 = require("./ILogger");
const ITransport_1 = require("./ITransport");
const LongPollingTransport_1 = require("./LongPollingTransport");
const ServerSentEventsTransport_1 = require("./ServerSentEventsTransport");
const Utils_1 = require("./Utils");
const WebSocketTransport_1 = require("./WebSocketTransport");
const MAX_REDIRECTS = 100;
let WebSocketModule = null;
let EventSourceModule = null;
if (Utils_1.Platform.isNode && typeof require !== "undefined") {
    // In order to ignore the dynamic require in webpack builds we need to do this magic
    // @ts-ignore: TS doesn't know about these names
    const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
    WebSocketModule = requireFunc("ws");
    EventSourceModule = requireFunc("eventsource");
}
/** @private */
class HttpConnection {
    constructor(url, options = {}) {
        this.features = {};
        this.negotiateVersion = 1;
        Utils_1.Arg.isRequired(url, "url");
        this.logger = Utils_1.createLogger(options.logger);
        this.baseUrl = this.resolveUrl(url);
        options = options || {};
        options.logMessageContent = options.logMessageContent || false;
        if (!Utils_1.Platform.isNode && typeof WebSocket !== "undefined" && !options.WebSocket) {
            options.WebSocket = WebSocket;
        }
        else if (Utils_1.Platform.isNode && !options.WebSocket) {
            if (WebSocketModule) {
                options.WebSocket = WebSocketModule;
            }
        }
        if (!Utils_1.Platform.isNode && typeof EventSource !== "undefined" && !options.EventSource) {
            options.EventSource = EventSource;
        }
        else if (Utils_1.Platform.isNode && !options.EventSource) {
            if (typeof EventSourceModule !== "undefined") {
                options.EventSource = EventSourceModule;
            }
        }
        this.httpClient = options.httpClient || new DefaultHttpClient_1.DefaultHttpClient(this.logger);
        this.connectionState = "Disconnected" /* Disconnected */;
        this.connectionStarted = false;
        this.options = options;
        this.onreceive = null;
        this.onclose = null;
    }
    start(transferFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            transferFormat = transferFormat || ITransport_1.TransferFormat.Binary;
            Utils_1.Arg.isIn(transferFormat, ITransport_1.TransferFormat, "transferFormat");
            this.logger.log(ILogger_1.LogLevel.Debug, `Starting connection with transfer format '${ITransport_1.TransferFormat[transferFormat]}'.`);
            if (this.connectionState !== "Disconnected" /* Disconnected */) {
                return Promise.reject(new Error("Cannot start an HttpConnection that is not in the 'Disconnected' state."));
            }
            this.connectionState = "Connecting " /* Connecting */;
            this.startInternalPromise = this.startInternal(transferFormat);
            yield this.startInternalPromise;
            // The TypeScript compiler thinks that connectionState must be Connecting here. The TypeScript compiler is wrong.
            if (this.connectionState === "Disconnecting" /* Disconnecting */) {
                // stop() was called and transitioned the client into the Disconnecting state.
                const message = "Failed to start the HttpConnection before stop() was called.";
                this.logger.log(ILogger_1.LogLevel.Error, message);
                // We cannot await stopPromise inside startInternal since stopInternal awaits the startInternalPromise.
                yield this.stopPromise;
                return Promise.reject(new Error(message));
            }
            else if (this.connectionState !== "Connected" /* Connected */) {
                // stop() was called and transitioned the client into the Disconnecting state.
                const message = "HttpConnection.startInternal completed gracefully but didn't enter the connection into the connected state!";
                this.logger.log(ILogger_1.LogLevel.Error, message);
                return Promise.reject(new Error(message));
            }
            this.connectionStarted = true;
        });
    }
    send(data) {
        if (this.connectionState !== "Connected" /* Connected */) {
            return Promise.reject(new Error("Cannot send data if the connection is not in the 'Connected' State."));
        }
        if (!this.sendQueue) {
            this.sendQueue = new TransportSendQueue(this.transport);
        }
        // Transport will not be null if state is connected
        return this.sendQueue.send(data);
    }
    stop(error) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connectionState === "Disconnected" /* Disconnected */) {
                this.logger.log(ILogger_1.LogLevel.Debug, `Call to HttpConnection.stop(${error}) ignored because the connection is already in the disconnected state.`);
                return Promise.resolve();
            }
            if (this.connectionState === "Disconnecting" /* Disconnecting */) {
                this.logger.log(ILogger_1.LogLevel.Debug, `Call to HttpConnection.stop(${error}) ignored because the connection is already in the disconnecting state.`);
                return this.stopPromise;
            }
            this.connectionState = "Disconnecting" /* Disconnecting */;
            this.stopPromise = new Promise((resolve) => {
                // Don't complete stop() until stopConnection() completes.
                this.stopPromiseResolver = resolve;
            });
            // stopInternal should never throw so just observe it.
            yield this.stopInternal(error);
            yield this.stopPromise;
        });
    }
    stopInternal(error) {
        return __awaiter(this, void 0, void 0, function* () {
            // Set error as soon as possible otherwise there is a race between
            // the transport closing and providing an error and the error from a close message
            // We would prefer the close message error.
            this.stopError = error;
            try {
                yield this.startInternalPromise;
            }
            catch (e) {
                // This exception is returned to the user as a rejected Promise from the start method.
            }
            if (this.sendQueue) {
                try {
                    yield this.sendQueue.stop();
                }
                catch (e) {
                    this.logger.log(ILogger_1.LogLevel.Error, `TransportSendQueue.stop() threw error '${e}'.`);
                }
                this.sendQueue = undefined;
            }
            // The transport's onclose will trigger stopConnection which will run our onclose event.
            // The transport should always be set if currently connected. If it wasn't set, it's likely because
            // stop was called during start() and start() failed.
            if (this.transport) {
                try {
                    yield this.transport.stop();
                }
                catch (e) {
                    this.logger.log(ILogger_1.LogLevel.Error, `HttpConnection.transport.stop() threw error '${e}'.`);
                    this.stopConnection();
                }
                this.transport = undefined;
            }
            else {
                this.logger.log(ILogger_1.LogLevel.Debug, "HttpConnection.transport is undefined in HttpConnection.stop() because start() failed.");
                this.stopConnection();
            }
        });
    }
    startInternal(transferFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            // Store the original base url and the access token factory since they may change
            // as part of negotiating
            let url = this.baseUrl;
            this.accessTokenFactory = this.options.accessTokenFactory;
            try {
                if (this.options.skipNegotiation) {
                    if (this.options.transport === ITransport_1.HttpTransportType.WebSockets) {
                        // No need to add a connection ID in this case
                        this.transport = this.constructTransport(ITransport_1.HttpTransportType.WebSockets);
                        // We should just call connect directly in this case.
                        // No fallback or negotiate in this case.
                        yield this.startTransport(url, transferFormat);
                    }
                    else {
                        throw new Error("Negotiation can only be skipped when using the WebSocket transport directly.");
                    }
                }
                else {
                    let negotiateResponse = null;
                    let redirects = 0;
                    do {
                        negotiateResponse = yield this.getNegotiationResponse(url);
                        // the user tries to stop the connection when it is being started
                        if (this.connectionState === "Disconnecting" /* Disconnecting */ || this.connectionState === "Disconnected" /* Disconnected */) {
                            throw new Error("The connection was stopped during negotiation.");
                        }
                        if (negotiateResponse.error) {
                            throw new Error(negotiateResponse.error);
                        }
                        if (negotiateResponse.ProtocolVersion) {
                            throw new Error("Detected a connection attempt to an ASP.NET SignalR Server. This client only supports connecting to an ASP.NET Core SignalR Server. See https://aka.ms/signalr-core-differences for details.");
                        }
                        if (negotiateResponse.url) {
                            url = negotiateResponse.url;
                        }
                        if (negotiateResponse.accessToken) {
                            // Replace the current access token factory with one that uses
                            // the returned access token
                            const accessToken = negotiateResponse.accessToken;
                            this.accessTokenFactory = () => accessToken;
                        }
                        redirects++;
                    } while (negotiateResponse.url && redirects < MAX_REDIRECTS);
                    if (redirects === MAX_REDIRECTS && negotiateResponse.url) {
                        throw new Error("Negotiate redirection limit exceeded.");
                    }
                    yield this.createTransport(url, this.options.transport, negotiateResponse, transferFormat);
                }
                if (this.transport instanceof LongPollingTransport_1.LongPollingTransport) {
                    this.features.inherentKeepAlive = true;
                }
                if (this.connectionState === "Connecting " /* Connecting */) {
                    // Ensure the connection transitions to the connected state prior to completing this.startInternalPromise.
                    // start() will handle the case when stop was called and startInternal exits still in the disconnecting state.
                    this.logger.log(ILogger_1.LogLevel.Debug, "The HttpConnection connected successfully.");
                    this.connectionState = "Connected" /* Connected */;
                }
                // stop() is waiting on us via this.startInternalPromise so keep this.transport around so it can clean up.
                // This is the only case startInternal can exit in neither the connected nor disconnected state because stopConnection()
                // will transition to the disconnected state. start() will wait for the transition using the stopPromise.
            }
            catch (e) {
                this.logger.log(ILogger_1.LogLevel.Error, "Failed to start the connection: " + e);
                this.connectionState = "Disconnected" /* Disconnected */;
                this.transport = undefined;
                return Promise.reject(e);
            }
        });
    }
    getNegotiationResponse(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let headers;
            if (this.accessTokenFactory) {
                const token = yield this.accessTokenFactory();
                if (token) {
                    headers = {
                        ["Authorization"]: `Bearer ${token}`,
                    };
                }
            }
            const negotiateUrl = this.resolveNegotiateUrl(url);
            this.logger.log(ILogger_1.LogLevel.Debug, `Sending negotiation request: ${negotiateUrl}.`);
            try {
                const response = yield this.httpClient.post(negotiateUrl, {
                    content: "",
                    headers,
                });
                if (response.statusCode !== 200) {
                    return Promise.reject(new Error(`Unexpected status code returned from negotiate ${response.statusCode}`));
                }
                const negotiateResponse = JSON.parse(response.content);
                if (!negotiateResponse.negotiateVersion || negotiateResponse.negotiateVersion < 1) {
                    // Negotiate version 0 doesn't use connectionToken
                    // So we set it equal to connectionId so all our logic can use connectionToken without being aware of the negotiate version
                    negotiateResponse.connectionToken = negotiateResponse.connectionId;
                }
                return negotiateResponse;
            }
            catch (e) {
                this.logger.log(ILogger_1.LogLevel.Error, "Failed to complete negotiation with the server: " + e);
                return Promise.reject(e);
            }
        });
    }
    createConnectUrl(url, connectionToken) {
        if (!connectionToken) {
            return url;
        }
        return url + (url.indexOf("?") === -1 ? "?" : "&") + `id=${connectionToken}`;
    }
    createTransport(url, requestedTransport, negotiateResponse, requestedTransferFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            let connectUrl = this.createConnectUrl(url, negotiateResponse.connectionToken);
            if (this.isITransport(requestedTransport)) {
                this.logger.log(ILogger_1.LogLevel.Debug, "Connection was provided an instance of ITransport, using that directly.");
                this.transport = requestedTransport;
                yield this.startTransport(connectUrl, requestedTransferFormat);
                this.connectionId = negotiateResponse.connectionId;
                return;
            }
            const transportExceptions = [];
            const transports = negotiateResponse.availableTransports || [];
            let negotiate = negotiateResponse;
            for (const endpoint of transports) {
                const transportOrError = this.resolveTransportOrError(endpoint, requestedTransport, requestedTransferFormat);
                if (transportOrError instanceof Error) {
                    // Store the error and continue, we don't want to cause a re-negotiate in these cases
                    transportExceptions.push(`${endpoint.transport} failed: ${transportOrError}`);
                }
                else if (this.isITransport(transportOrError)) {
                    this.transport = transportOrError;
                    if (!negotiate) {
                        try {
                            negotiate = yield this.getNegotiationResponse(url);
                        }
                        catch (ex) {
                            return Promise.reject(ex);
                        }
                        connectUrl = this.createConnectUrl(url, negotiate.connectionToken);
                    }
                    try {
                        yield this.startTransport(connectUrl, requestedTransferFormat);
                        this.connectionId = negotiate.connectionId;
                        return;
                    }
                    catch (ex) {
                        this.logger.log(ILogger_1.LogLevel.Error, `Failed to start the transport '${endpoint.transport}': ${ex}`);
                        negotiate = undefined;
                        transportExceptions.push(`${endpoint.transport} failed: ${ex}`);
                        if (this.connectionState !== "Connecting " /* Connecting */) {
                            const message = "Failed to select transport before stop() was called.";
                            this.logger.log(ILogger_1.LogLevel.Debug, message);
                            return Promise.reject(new Error(message));
                        }
                    }
                }
            }
            if (transportExceptions.length > 0) {
                return Promise.reject(new Error(`Unable to connect to the server with any of the available transports. ${transportExceptions.join(" ")}`));
            }
            return Promise.reject(new Error("None of the transports supported by the client are supported by the server."));
        });
    }
    constructTransport(transport) {
        switch (transport) {
            case ITransport_1.HttpTransportType.WebSockets:
                if (!this.options.WebSocket) {
                    throw new Error("'WebSocket' is not supported in your environment.");
                }
                return new WebSocketTransport_1.WebSocketTransport(this.httpClient, this.accessTokenFactory, this.logger, this.options.logMessageContent || false, this.options.WebSocket);
            case ITransport_1.HttpTransportType.ServerSentEvents:
                if (!this.options.EventSource) {
                    throw new Error("'EventSource' is not supported in your environment.");
                }
                return new ServerSentEventsTransport_1.ServerSentEventsTransport(this.httpClient, this.accessTokenFactory, this.logger, this.options.logMessageContent || false, this.options.EventSource);
            case ITransport_1.HttpTransportType.LongPolling:
                return new LongPollingTransport_1.LongPollingTransport(this.httpClient, this.accessTokenFactory, this.logger, this.options.logMessageContent || false);
            default:
                throw new Error(`Unknown transport: ${transport}.`);
        }
    }
    startTransport(url, transferFormat) {
        this.transport.onreceive = this.onreceive;
        this.transport.onclose = (e) => this.stopConnection(e);
        return this.transport.connect(url, transferFormat);
    }
    resolveTransportOrError(endpoint, requestedTransport, requestedTransferFormat) {
        const transport = ITransport_1.HttpTransportType[endpoint.transport];
        if (transport === null || transport === undefined) {
            this.logger.log(ILogger_1.LogLevel.Debug, `Skipping transport '${endpoint.transport}' because it is not supported by this client.`);
            return new Error(`Skipping transport '${endpoint.transport}' because it is not supported by this client.`);
        }
        else {
            if (transportMatches(requestedTransport, transport)) {
                const transferFormats = endpoint.transferFormats.map((s) => ITransport_1.TransferFormat[s]);
                if (transferFormats.indexOf(requestedTransferFormat) >= 0) {
                    if ((transport === ITransport_1.HttpTransportType.WebSockets && !this.options.WebSocket) ||
                        (transport === ITransport_1.HttpTransportType.ServerSentEvents && !this.options.EventSource)) {
                        this.logger.log(ILogger_1.LogLevel.Debug, `Skipping transport '${ITransport_1.HttpTransportType[transport]}' because it is not supported in your environment.'`);
                        return new Error(`'${ITransport_1.HttpTransportType[transport]}' is not supported in your environment.`);
                    }
                    else {
                        this.logger.log(ILogger_1.LogLevel.Debug, `Selecting transport '${ITransport_1.HttpTransportType[transport]}'.`);
                        try {
                            return this.constructTransport(transport);
                        }
                        catch (ex) {
                            return ex;
                        }
                    }
                }
                else {
                    this.logger.log(ILogger_1.LogLevel.Debug, `Skipping transport '${ITransport_1.HttpTransportType[transport]}' because it does not support the requested transfer format '${ITransport_1.TransferFormat[requestedTransferFormat]}'.`);
                    return new Error(`'${ITransport_1.HttpTransportType[transport]}' does not support ${ITransport_1.TransferFormat[requestedTransferFormat]}.`);
                }
            }
            else {
                this.logger.log(ILogger_1.LogLevel.Debug, `Skipping transport '${ITransport_1.HttpTransportType[transport]}' because it was disabled by the client.`);
                return new Error(`'${ITransport_1.HttpTransportType[transport]}' is disabled by the client.`);
            }
        }
    }
    isITransport(transport) {
        return transport && typeof (transport) === "object" && "connect" in transport;
    }
    stopConnection(error) {
        this.logger.log(ILogger_1.LogLevel.Debug, `HttpConnection.stopConnection(${error}) called while in state ${this.connectionState}.`);
        this.transport = undefined;
        // If we have a stopError, it takes precedence over the error from the transport
        error = this.stopError || error;
        this.stopError = undefined;
        if (this.connectionState === "Disconnected" /* Disconnected */) {
            this.logger.log(ILogger_1.LogLevel.Debug, `Call to HttpConnection.stopConnection(${error}) was ignored because the connection is already in the disconnected state.`);
            return;
        }
        if (this.connectionState === "Connecting " /* Connecting */) {
            this.logger.log(ILogger_1.LogLevel.Warning, `Call to HttpConnection.stopConnection(${error}) was ignored because the connection hasn't yet left the in the connecting state.`);
            return;
        }
        if (this.connectionState === "Disconnecting" /* Disconnecting */) {
            // A call to stop() induced this call to stopConnection and needs to be completed.
            // Any stop() awaiters will be scheduled to continue after the onclose callback fires.
            this.stopPromiseResolver();
        }
        if (error) {
            this.logger.log(ILogger_1.LogLevel.Error, `Connection disconnected with error '${error}'.`);
        }
        else {
            this.logger.log(ILogger_1.LogLevel.Information, "Connection disconnected.");
        }
        this.connectionId = undefined;
        this.connectionState = "Disconnected" /* Disconnected */;
        if (this.onclose && this.connectionStarted) {
            this.connectionStarted = false;
            try {
                this.onclose(error);
            }
            catch (e) {
                this.logger.log(ILogger_1.LogLevel.Error, `HttpConnection.onclose(${error}) threw error '${e}'.`);
            }
        }
    }
    resolveUrl(url) {
        // startsWith is not supported in IE
        if (url.lastIndexOf("https://", 0) === 0 || url.lastIndexOf("http://", 0) === 0) {
            return url;
        }
        if (!Utils_1.Platform.isBrowser || !window.document) {
            throw new Error(`Cannot resolve '${url}'.`);
        }
        // Setting the url to the href propery of an anchor tag handles normalization
        // for us. There are 3 main cases.
        // 1. Relative path normalization e.g "b" -> "http://localhost:5000/a/b"
        // 2. Absolute path normalization e.g "/a/b" -> "http://localhost:5000/a/b"
        // 3. Networkpath reference normalization e.g "//localhost:5000/a/b" -> "http://localhost:5000/a/b"
        const aTag = window.document.createElement("a");
        aTag.href = url;
        this.logger.log(ILogger_1.LogLevel.Information, `Normalizing '${url}' to '${aTag.href}'.`);
        return aTag.href;
    }
    resolveNegotiateUrl(url) {
        const index = url.indexOf("?");
        let negotiateUrl = url.substring(0, index === -1 ? url.length : index);
        if (negotiateUrl[negotiateUrl.length - 1] !== "/") {
            negotiateUrl += "/";
        }
        negotiateUrl += "negotiate";
        negotiateUrl += index === -1 ? "" : url.substring(index);
        if (negotiateUrl.indexOf("negotiateVersion") === -1) {
            negotiateUrl += index === -1 ? "?" : "&";
            negotiateUrl += "negotiateVersion=" + this.negotiateVersion;
        }
        return negotiateUrl;
    }
}
exports.HttpConnection = HttpConnection;
function transportMatches(requestedTransport, actualTransport) {
    return !requestedTransport || ((actualTransport & requestedTransport) !== 0);
}
/** @private */
class TransportSendQueue {
    constructor(transport) {
        this.transport = transport;
        this.buffer = [];
        this.executing = true;
        this.sendBufferedData = new PromiseSource();
        this.transportResult = new PromiseSource();
        this.sendLoopPromise = this.sendLoop();
    }
    send(data) {
        this.bufferData(data);
        if (!this.transportResult) {
            this.transportResult = new PromiseSource();
        }
        return this.transportResult.promise;
    }
    stop() {
        this.executing = false;
        this.sendBufferedData.resolve();
        return this.sendLoopPromise;
    }
    bufferData(data) {
        if (this.buffer.length && typeof (this.buffer[0]) !== typeof (data)) {
            throw new Error(`Expected data to be of type ${typeof (this.buffer)} but was of type ${typeof (data)}`);
        }
        this.buffer.push(data);
        this.sendBufferedData.resolve();
    }
    sendLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                yield this.sendBufferedData.promise;
                if (!this.executing) {
                    if (this.transportResult) {
                        this.transportResult.reject("Connection stopped.");
                    }
                    break;
                }
                this.sendBufferedData = new PromiseSource();
                const transportResult = this.transportResult;
                this.transportResult = undefined;
                const data = typeof (this.buffer[0]) === "string" ?
                    this.buffer.join("") :
                    TransportSendQueue.concatBuffers(this.buffer);
                this.buffer.length = 0;
                try {
                    yield this.transport.send(data);
                    transportResult.resolve();
                }
                catch (error) {
                    transportResult.reject(error);
                }
            }
        });
    }
    static concatBuffers(arrayBuffers) {
        const totalLength = arrayBuffers.map((b) => b.byteLength).reduce((a, b) => a + b);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const item of arrayBuffers) {
            result.set(new Uint8Array(item), offset);
            offset += item.byteLength;
        }
        return result;
    }
}
exports.TransportSendQueue = TransportSendQueue;
class PromiseSource {
    constructor() {
        this.promise = new Promise((resolve, reject) => [this.resolver, this.rejecter] = [resolve, reject]);
    }
    resolve() {
        this.resolver();
    }
    reject(reason) {
        this.rejecter(reason);
    }
}
//# sourceMappingURL=HttpConnection.js.map