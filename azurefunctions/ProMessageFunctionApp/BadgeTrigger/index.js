module.exports = function (context, eventGridEvent) {
    context.log("New achievement - Badge Updated")
    context.log(typeof eventGridEvent);
    var request = require('request');
    var payload = eventGridEvent.data;
    // Get the authorization token
    var header = {
    'Content-Type': 'application/x-www-form-urlencoded'
    };

var options = {
    url: "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
    method: 'POST',
    headers: header,
    form: {
        'grant_type': 'client_credentials',
        'client_id': "31db93a9-682c-4adc-a6fa-e167411de783",
        'client_secret': "gcduMBQKF042^?hwnWC73-{",
        'scope': "https://api.botframework.com/.default"
    }
};
context.log("LOGGER POINT 2");
request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var json_token = JSON.parse(body);
        var accessToken = json_token.access_token;
        
        //Reply Back to the user
        var messageUrl = "https://smba.trafficmanager.net/amer-client-ss.msg/v3/conversations/a%3A1__GzKqD1YDt-03kFAI79k4696bnwxJLL6fyVXuOkhzMGP2fjph4fH8Xi_PSAPHrQBalBpteX8MNiQ0H5Rg3_qsyHgltiUlTwrUcm0x7v1PuTT8vsbbCy---OkSFLZfT_/activities/"; 
        var messageHeaders = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json;'
        }


        var timestamp = new Date().toISOString();
        var messagePayload = {
            "type": "message",
            "text": payload.userName + " unlocked a new achievement: " + payload.newBadge,
            "locale": "en-US",
            "localTimestamp": timestamp,
            "from": {
                "id": "28:31db93a9-682c-4adc-a6fa-e167411de783",
                "name": "Trivia Bot"
            },
            "recipient": {
                "id": "29:1TZMpFQWiJQ8TIjmGdxPAFTUHUj94KCsBSWdKpL8r-tvVGp4ytGr-Wln0498ZcSIM-osVIqn7rp72fPVdjtR9eA",
                "name": "OpenHack Administrator",
                "aadObjectId": "3dc4247a-9041-45fa-a117-2f7ad6a17d3b"
            },
            "inputHint": "acceptingInput"
        };
        context.log("Sending message...");
        context.log(messagePayload);
        request({
            headers: messageHeaders,
            url: messageUrl,
            method: "POST",
            json: true, 
            body: messagePayload
        }, function (error, response, body){
            if(!error) {
                context.log("Message successfully sent...");
                // do nothing
            }else{
                context.log(JSON.stringify(error));
            }
        });
    }else{
        context.log(JSON.stringify(error));
    }
});
    

    context.done();
};