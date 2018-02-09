module.exports = function (context, eventGridEvent) {
    context.log(typeof eventGridEvent);
    context.log(eventGridEvent);
    var request = require('request');
    var payload = eventGridEvent.data;
    // Get the authorization token
    var header = {
    'Content-Type': 'application/x-www-form-urlencoded'
    };

    var options = {
    url: "https://login.microsoftonline.com/msopenhack.com/oauth2/v2.0/token",
    method: 'POST',
    headers: header,
    form: {
        'grant_type': 'client_credentials',
        'client_id': "c70f38c7-0ba6-483e-ad1c-c45b30dcff13",
        'client_secret': "licxTO95!!jkuUTTDV351!~",
        'scope': "https://graph.microsoft.com/.default"
      }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var json_token = JSON.parse(body);
            var accessToken = json_token.access_token;

            //Reply Back to the user
            var messageUrl = "https://graph.microsoft.com/v1.0/users/" + payload.aadObjectId;
            var messageHeaders = {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json;'
            }

            //TODO remove hardcoded strings.
            var timestamp = new Date().toISOString();
            var messagePayload = {
                "msopenhack_trivia" : {
                    "badge" : payload.newBadge
                }
            };
            context.log("Updating user achievement badge");
            context.log(messagePayload);
            request({
                headers: messageHeaders,
                url: messageUrl,
                method: "PATCH",
                json: true,
                body: messagePayload
            }, function (error, response, body) {
                if (!error) {
                    context.log("Body " + JSON.stringify(body));
                    context.log("Successfully updated");
                } else {
                    context.log(JSON.stringify(error));
                }
            });
        } else {
            context.log(JSON.stringify(error));
        }
    });


    context.done();
};