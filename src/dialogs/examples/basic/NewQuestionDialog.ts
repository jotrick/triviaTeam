import * as builder from "botbuilder";
import { TriggerActionDialog } from "../../../utils/TriggerActionDialog";
// import { DialogIds } from "../../../utils/DialogIds";
// import { DialogMatches } from "../../../utils/DialogMatches";
import { Strings } from "../../../locale/locale";
import * as config from "config";
import { TriviaAPI } from "../../../apis/TriviaAPI";

export class NewQuestionDialog extends TriggerActionDialog {

    private static async step1(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        let api = new TriviaAPI();
        let userAADObjectID = (session.message.user as any).aadObjectId;
        if (session.message.value && session.message.value.questionId) {
            let body = {
                userId: userAADObjectID,
                questionId: session.message.value.questionId,
                answerId: session.message.value.id,
            };
            let answerResp = await api.postAnswer(body);
            if (answerResp.correct) {
                session.send("You are correct!");
                session.send(session.message.user.name + " has earned the " + answerResp.achievementBadge + " Badge");
            } else {
                session.send(["Better luck next time!", "Wrong answer. Try again.", "You be wrong!", "So sorry. Try again."]);
            }
        }

        let body = {
            "id": userAADObjectID,
        };
        let resp = await api.getQuestion(body);
        let questions = resp.questionOptions;
        // {"id":594,"text":"A tortoiseshell cat is most likely what?",
        // "questionOptions":
        // [{"id":2373,"text":"Female"},
        //     {"id":2375,"text":"Blind"},
        //     {"id":2376,"text":"Male"},
        //     {"id":2374,"text":"Deaf"}
        // ]
        // }

        let buttons = new Array<builder.CardAction>();
        for (let question of questions) {
            question.questionId = resp.id;
            let value = question;
            let messageBackButton = builder.CardAction.messageBack(session, value, question.text)
                .displayText("My Answer: " + question.text)
                .text("Give me a question");
            buttons.push(messageBackButton);
        }

        let newCard = new builder.ThumbnailCard(session)
            .title("Trivia Game")
            .text("<h2>" + resp.text + "</h2>")
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

        session.endDialog();
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            "NewQuestionDialogId",
            /Give me a question/i,
            NewQuestionDialog.step1,
        );
    }
}
