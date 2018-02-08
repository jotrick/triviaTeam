import * as request from "request";
let http = require("http");

// Callback for HTTP requests
export interface RequestCallback {
    (error: any, body?: any): void;
}

// API wrapper
export class TriviaRequest {

    // Creates a new request wrapper for a given API.
    constructor() {
        // do nothing
    }

    // Make a GET request to API.
    // Syntax: .get(uri, [query], callback)
    private get(url: string, headers: any, bodyOrCallback?: any | RequestCallback, callback?: RequestCallback): void {
        this.request("GET", url, headers, bodyOrCallback, callback);
    };

    // tslint:disable-next-line:member-ordering
    public async getAsync(url: string, headers: any, body: any): Promise<any> {
        // let args = await this.getAccessToken(session);
        // if (!args) {
        //     return null;
        // }

        return new Promise((resolve, reject) => {
            this.get(url, headers, body, (err, result) => {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    };

    // Make a DELETE request to API.
    // Syntax: .delete(uri, [query], callback)
    private del(url: string, headers: any, bodyOrCallback?: any | RequestCallback, callback?: RequestCallback): void {
        this.request("DELETE", url, headers, bodyOrCallback, callback);
    };

    // tslint:disable-next-line:member-ordering
    public async delAsync(url: string, headers: any, body: any): Promise<any> {
        // let args = await this.getAccessToken(session);
        // if (!args) {
        //     return null;
        // }

        return new Promise((resolve, reject) => {
            this.del(url, headers, body, (err, result) => {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    };

    // Make a POST request to API.
    // Syntax: .post(uri, [query], callback)
    private post(url: string, headers: any, bodyOrCallback?: any | RequestCallback, callback?: RequestCallback): void {
        this.request("POST", url, headers, bodyOrCallback, callback);
    };

    // tslint:disable-next-line:member-ordering
    public async postAsync(url: string, headers: any, body: any): Promise<any> {
        // let args = await this.getAccessToken(session);
        // if (!args) {
        //     return null;
        // }

        return new Promise((resolve, reject) => {
            this.post(url, headers, body, (err, result) => {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    };

    // Make a PUT request to API.
    // Syntax: .put(uri, [query], callback)
    private put(url: string, headers: any, bodyOrCallback?: any | RequestCallback, callback?: RequestCallback): void {
        this.request("PUT", url, headers, bodyOrCallback, callback);
    };

    // tslint:disable-next-line:member-ordering
    public async putAsync(url: string, headers: any, body: any): Promise<any> {
        // let args = await this.getAccessToken(session);
        // if (!args) {
        //     return null;
        // }

        return new Promise((resolve, reject) => {
            this.put(url, headers, body, (err, result) => {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    };

    // Make a request to API.
    // Syntax: .request(method, uri, [query], callback)
    private request(method: string, url: string, headers: any, bodyOrCallback?: any | RequestCallback, callback?: RequestCallback): void {
        let body: any;

        if (callback) {
            body = bodyOrCallback;
        } else {
            callback = bodyOrCallback;
            body = {};
        }

        let options: request.Options = {
            url: url,
            method: method,
            headers: headers,
            body: JSON.stringify(body),
        };

        let requestCallback = function (err: any, response: any, responseBody: any): void {
            if (!err && response.statusCode >= 400) {
                err = new Error(responseBody);
                err.statusCode = response.statusCode;
                err.responseBody = responseBody;
                err.statusMessage = http.STATUS_CODES[response.statusCode];
            }

            callback(err, responseBody);
        };

        switch (method.toLowerCase())
        {
            case "get":
                request.get(options, requestCallback);
                break;
            case "post":
                request.post(options, requestCallback);
                break;
            case "put":
                request.put(options, requestCallback);
                break;
            case "delete":
                request.delete(options, requestCallback);
                break;
        }
    };
}
