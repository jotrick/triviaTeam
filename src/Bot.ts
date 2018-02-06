import * as builder from "botbuilder";
import * as config from "config";
import { RootDialog } from "./dialogs/RootDialog";
import { SetLocaleFromTeamsSetting } from "./middleware/SetLocaleFromTeamsSetting";
import { StripBotAtMentions } from "./middleware/StripBotAtMentions";
// import { SetAADObjectId } from "./middleware/SetAADObjectId";
import { LoadBotChannelData } from "./middleware/LoadBotChannelData";
import { Strings } from "./locale/locale";
import { loadSessionAsync, isMessageFromChannel } from "./utils/DialogUtils";
import * as teams from "botbuilder-teams";
import { ComposeExtensionHandlers } from "./composeExtension/ComposeExtensionHandlers";
import { TriviaAPI } from "./apis/TriviaAPI";

// =========================================================
// Bot Setup
// =========================================================

export class Bot extends builder.UniversalBot {

    constructor(
        private _connector: teams.TeamsChatConnector,
        private botSettings: any,
    ) {
        super(_connector, botSettings);
        this.set("persistConversationData", true);

        // Root dialog
        new RootDialog(this).createChildDialogs();

        // Add middleware
        this.use(
            // currently this middleware cannot be used because there is an error using it
            // with updating messages examples
            // builder.Middleware.sendTyping(),

            // set on "receive" of message
            new SetLocaleFromTeamsSetting(),

            // set on "botbuilder" (after session created)
            new StripBotAtMentions(),
            // new SetAADObjectId(),
            new LoadBotChannelData(this.get("channelStorage")),
        );

        // setup invoke payload handler
        this._connector.onInvoke(this.getInvokeHandler(this));

        // setup O365ConnectorCard action handler
        this._connector.onO365ConnectorCardAction(this.getO365ConnectorCardActionHandler(this));

        // setup conversation update handler for things such as a memberAdded event
        this.on("conversationUpdate", this.getConversationUpdateHandler(this));

        // setup compose extension handlers
        // onQuery is for events that come through the compose extension itself including
        // config and auth responses from popups that were started in the compose extension
        // onQuerySettingsUrl is only used when the user selects "Settings" from the three dot option
        // next to the compose extension's name on the list of compose extensions
        // onSettingsUpdate is only used for the response from the popup created by the
        // onQuerySettingsUrl event
        this._connector.onQuery("search123", ComposeExtensionHandlers.getOnQueryHandler(this));
        this._connector.onQuerySettingsUrl(ComposeExtensionHandlers.getOnQuerySettingsUrlHandler());
        this._connector.onSettingsUpdate(ComposeExtensionHandlers.getOnSettingsUpdateHandler(this));
    }

    // Handle incoming invoke
    private getInvokeHandler(bot: builder.UniversalBot): (event: builder.IEvent, callback: (err: Error, body: any, status?: number) => void) => void {
        return async function (
            event: builder.IEvent,
            callback: (err: Error, body: any, status?: number) => void,
        ): Promise<void>
        {
            let session = await loadSessionAsync(bot, event);
            if (session) {
                // Clear the stack on invoke, as many builtin dialogs don't play well with invoke
                // Invoke messages should carry the necessary information to perform their action
                session.clearDialogStack();

                let payload = (event as any).value;

                // Invokes don't participate in middleware
                // If payload has an address, then it is from a button to update a message so we do not what to send typing
                if (!payload.address) {
                    session.sendTyping();
                }

                if (payload && payload.dialog) {
                    session.beginDialog(payload.dialog, payload);
                }
            }
            callback(null, "", 200);
        };
    }

    // set incoming event to any because membersAdded is not a field in builder.IEvent
    private getConversationUpdateHandler(bot: builder.UniversalBot): (event: any) => void {
        return async function(event: any): Promise<void> {
            if (event.membersAdded && event.membersAdded[0].id && event.membersAdded[0].id.endsWith(config.get("bot.botId"))) {
                let session = await loadSessionAsync(bot, event);

                // casting to keep away typescript errors
                let teamsChatConnector = (session.connector as teams.TeamsChatConnector);
                let msgAddress = (session.message.address as builder.IChatConnectorAddress);
                let msgServiceUrl = msgAddress.serviceUrl;

                // if a message is from a channel, use the team.id to fetch the roster
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
                            let api = new TriviaAPI();
                            let body = {
                                "teamId": currId,
                                "members": result,
                            };
                            let resp = await api.registerTeam(body);
                            if (resp.success) {
                                let buttons = new Array<builder.CardAction>();
                                let messageBackButton = builder.CardAction.messageBack(session, "", "Get Question")
                                    .displayText("Give me a question")
                                    .text("Give me a question");
                                buttons.push(messageBackButton);

                                let newCard = new builder.HeroCard(session)
                                    .title("Trivia Game")
                                    .text("Welcome to the trivia game!")
                                    .images([
                                        new builder.CardImage(session)
                                            .url(config.get("app.baseUri") + "/assets/computer_person.jpg")
                                            .alt(session.gettext(Strings.img_default)),
                                    ])
                                    .buttons(buttons);

                                session.send(new builder.Message(session)
                                    // .attachmentLayout("list")
                                    .attachmentLayout("carousel")
                                    .addAttachment(newCard));
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
        };
    }

    // handler for handling incoming payloads from O365ConnectorCard actions
    private getO365ConnectorCardActionHandler(bot: builder.UniversalBot): (event: builder.IEvent, query: teams.IO365ConnectorCardActionQuery, callback: (err: Error, result: any, statusCode: number) => void) => void {
        return async function (event: builder.IEvent, query: teams.IO365ConnectorCardActionQuery, callback: (err: Error, result: any, statusCode: number) => void): Promise<void> {
            let session = await loadSessionAsync(bot, event);

            let userName = event.address.user.name;
            let body = JSON.parse(query.body);
            let msg = new builder.Message(session)
                        .text(Strings.o365connectorcard_action_response, userName, query.actionId, JSON.stringify(body, null, 2));

            session.send(msg);

            callback(null, null, 200);
        };
    }
}
