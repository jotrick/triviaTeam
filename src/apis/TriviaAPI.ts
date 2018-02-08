// import * as builder from "botbuilder";
import { TriviaRequest } from "./TriviaRequest";
// import * as querystring from "querystring";
import * as Guid from "guid";
import * as config from "config";

export class TriviaAPI {

    private requestAPI: TriviaRequest;

    constructor () {
        this.requestAPI = new TriviaRequest();
    }

    public async registerTeam(body: any): Promise<any> {
        let headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
        let url = "https://msopenhack.azurewebsites.net/api/trivia/register";
        let resp = await this.requestAPI.postAsync(url, headers, body);
        let respBody = JSON.parse(resp);
        return respBody;
    }

    public async getQuestion(body: any): Promise<any> {
        let headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
        let url = "https://msopenhack.azurewebsites.net/api/trivia/question";
        let resp = await this.requestAPI.postAsync(url, headers, body);
        let respBody = JSON.parse(resp);
        return respBody;
    }

    public async postAnswer(body: any): Promise<any> {
        let headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
        let url = "https://msopenhack.azurewebsites.net/api/trivia/answer";
        let resp = await this.requestAPI.postAsync(url, headers, body);
        let respBody = JSON.parse(resp);
        return respBody;
    }

    public async notifyTopic(data: any): Promise<any> {
        let headers = {
            "aeg-sas-key": config.get("eventGrid.key"),
        };

        let body = [{
            "id": Guid.raw(),
            "eventType": "achievementBadgeUpdated",
            "subject": "Achievement Badge Updated",
            "eventTime": new Date().toISOString(),
            "data": data,
            "dataVersion": "1.0",
        }];

        let url = "https://triviabadgetopic.centralus-1.eventgrid.azure.net/api/events?api-version=2018-01-01";
        let resp = await this.requestAPI.postAsync(url, headers, body);
        let respBody = {};
        if (resp) {
            respBody = JSON.parse(resp);
        }
        return respBody;
    }
}
