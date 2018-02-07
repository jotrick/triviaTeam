import * as builder from "botbuilder";
import { TriggerActionDialog } from "../../../utils/TriggerActionDialog";
import { Strings } from "../../../locale/locale";
import * as config from "config";
import { TriviaAPI } from "../../../apis/TriviaAPI";
import { startReplyChainInChannel, isMessageFromChannel } from "../../../utils/DialogUtils";

export class NewQuestionDialog extends TriggerActionDialog {

    private static async postQuestion(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        // if session.conversationData.questionAddress != null then update card to say Done

        // Get a question using the current user's AAD object ID
        let userAADObjectID = (session.message.user as any).aadObjectId;
        let body = {
            "id": userAADObjectID,
        };
        let api = new TriviaAPI();
        let question = await api.getQuestion(body);

        // Create a list of buttons based on the possible answers
        let answers = question.questionOptions;
        let buttons = new Array<builder.CardAction>();
        for (let answer of answers) {
            answer.questionId = question.id;
            answer.questionText = question.text;
            let messageBackButton = builder.CardAction.messageBack(session, answer, answer.text)
                // .displayText("My Answer: " + answer.text)
                .text("answer the question");
            buttons.push(messageBackButton);
        }

        let questionCard = new builder.ThumbnailCard(session)
            .title("Trivia Question")
            .text("<h2>" + question.text + "</h2>")
            .images([
                new builder.CardImage(session)
                    .url(config.get("app.baseUri") + "/assets/computer_person.jpg")
                    .alt(session.gettext(Strings.img_default)),
            ])
            .buttons(buttons);

        let questionMessage = new builder.Message(session)
            .addAttachment(questionCard);

        if (isMessageFromChannel(session.message)) {
            // Start a new reply chain using the new question
            await startReplyChainInChannel((session.connector as any), questionMessage, session.message.sourceEvent.channel.id);
        } else {
            // 1:1 chat
            session.send(questionMessage);
            session.endDialog();
        }
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            "NewQuestionDialogId",
            /post a question/i,
            NewQuestionDialog.postQuestion,
        );
    }
}
