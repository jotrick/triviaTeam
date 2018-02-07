import * as builder from "botbuilder";
import { TriggerActionDialog } from "../../../utils/TriggerActionDialog";
import { isMessageFromChannel } from "../../../utils/DialogUtils";
import * as teams from "botbuilder-teams";
import { TriviaAPI } from "../../../apis/TriviaAPI";
import * as config from "config";

export class WelcomeDialog extends TriggerActionDialog {

    private static async sendWelcomeMessage(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        // Casting to keep away typescript errors
        let teamsChatConnector = (session.connector as teams.TeamsChatConnector);
        let msgAddress = (session.message.address as builder.IChatConnectorAddress);
        let msgServiceUrl = msgAddress.serviceUrl;

        // If a message is from a channel, use the team.id to fetch the roster
        let currId = null;
        if (isMessageFromChannel(session.message)) {
            currId = session.message.sourceEvent.team.id;
        } else {
            currId = session.message.address.conversation.id;
        }

        teamsChatConnector.fetchMemberList(
            msgServiceUrl,
            currId,
            teams.TeamsMessage.getTenantId(session.message),
            async (err, result) => {
                if (!err) {
                    // Register a team with the current roster data
                    let api = new TriviaAPI();
                    let body = {
                        "teamId": currId,
                        "members": result,
                    };
                    let resp = await api.registerTeam(body);

                    if (resp.success) {
                        let welcomeCard = WelcomeDialog.createWelcomeCard(session);
                        session.send(welcomeCard);
                    } else {
                        session.send("Something has gone terribly wrong!");
                    }
                } else {
                    session.error(err);
                }
                session.endDialog();
            },
        );
    }

    // Create the welcome card that is sent to the team or 1:1 chat when the bot is added
    private static createWelcomeCard(session: builder.Session): builder.TextOrMessageType {
        let buttons = new Array<builder.CardAction>();
        let messageBackButton = builder.CardAction.messageBack(session, "", "Post a Question")
            .displayText("Post a Question")
            .text("post a question");
        buttons.push(messageBackButton);

        let newCard = new builder.HeroCard(session)
            .title("Trivia Game")
            .text("Welcome to the trivia game!")
            .images([
                new builder.CardImage(session)
                    .url(config.get("app.baseUri") + "/assets/computer_person.jpg")
                    .alt("img"),
            ])
            .buttons(buttons);

        return new builder.Message(session)
            .addAttachment(newCard);
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            "WelcomeDialogId",
            /test welcome/i,
            WelcomeDialog.sendWelcomeMessage,
        );
    }
}
