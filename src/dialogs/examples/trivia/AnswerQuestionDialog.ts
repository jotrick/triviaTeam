import * as builder from "botbuilder";
import { TriggerActionDialog } from "../../../utils/TriggerActionDialog";
import { TriviaAPI } from "../../../apis/TriviaAPI";
import { isMessageFromChannel } from "../../../utils/DialogUtils";
import * as teams from "botbuilder-teams";

export class AnswerQuestionDialog extends TriggerActionDialog {

    private static async processAnswer(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        if (!session.message.value || !session.message.value.questionId) {
            session.send("no no no");
            session.endDialog();
            return;
        }

        if (isMessageFromChannel(session.message)) {
            // Casting to keep away typescript errors
            let teamsChatConnector = (session.connector as teams.TeamsChatConnector);
            let msgAddress = (session.message.address as builder.IChatConnectorAddress);
            let msgServiceUrl = msgAddress.serviceUrl;

            // If a message is from a channel, use the team.id to fetch the roster
            let currId = session.message.sourceEvent.team.id;

            teamsChatConnector.fetchMemberList(
                msgServiceUrl,
                currId,
                teams.TeamsMessage.getTenantId(session.message),
                async (err1, roster) => {
                    if (!err1) {
                        // Go through list counting just the human users of the team
                        let totalMemberCount = 0;
                        for (let entry of roster) {
                            if (!entry.id.startsWith("28:")) {
                                totalMemberCount++;
                            }
                        }

                        // How this works:
                        // There is only one question per reply chain - conversation
                        // If not count message
                        // - if team has more than make one person, then make count message
                        // - if team has one person, treat like a 1:1 chat
                        // OR (and these two are in the else statement)
                        // If count message is less than total (after the addition of a new answer)
                        // - update with new count
                        // If count is full (after the addiont of a new answer)
                        // - complete question message, complete count message
                        if (!session.conversationData.countMessageAddress) {
                            if (totalMemberCount !== 1) {
                                // Case where there is more than one person on a team so a count message
                                // is needed
                                let answerResp = await AnswerQuestionDialog.getAnswerResponse(session);

                                // No count message so need to send one and save the relevant data
                                session.send("All participants have not answered: 1 of " + totalMemberCount).sendBatch((err2, addresses) => {
                                    if (!err2) {
                                        session.conversationData.countMessageAddress = addresses[0];
                                        session.conversationData.membersAnswered = [
                                            {
                                                id: session.message.user.id,
                                                name: session.message.user.name,
                                                answerResult: answerResp.correct,
                                            },
                                        ];
                                        session.save().sendBatch();
                                    } else {
                                        session.error(err2);
                                    }
                                    session.endDialog();
                                });
                            } else {
                                // Case where it is a team of 1 person, treat like a 1:1 chat
                                let answerResp = await AnswerQuestionDialog.getAnswerResponse(session);

                                let resultText;
                                if (answerResp.correct) {
                                    resultText = "You are correct!<br/>" + session.message.user.name + " has earned the " + answerResp.achievementBadge + " Badge";
                                } else {
                                    resultText = ["Better luck next time!", "Wrong answer. Try again.", "You be wrong!", "So sorry. Try again."];
                                }

                                let completedQuestionCardMessage = AnswerQuestionDialog.createCompletedCardMessage(session);

                                session.connector.update(completedQuestionCardMessage.toMessage(), (err, address) => {
                                    if (!err) {
                                        // resultText is text saying if they got it right or wrong
                                        session.send(resultText);
                                    } else {
                                        session.error(err);
                                    }
                                    session.endDialog();
                                });
                            }
                        } else {
                            // Comes here if the answer is still less than the total or equal to it

                            let newUserAnswer = true;
                            for (let user of session.conversationData.membersAnswered) {
                                if (session.message.user.id === user.id) {
                                    // This means we already have this user so do not count them again
                                    newUserAnswer = false;
                                    break;
                                }
                            }

                            // If it is a new user answer then register their answer, add them to the list,
                            // and either update the count message or complete the question
                            if (newUserAnswer) {
                                let answerResp = await AnswerQuestionDialog.getAnswerResponse(session);

                                session.conversationData.membersAnswered.push({
                                    id: session.message.user.id,
                                    name: session.message.user.name,
                                    answerResult: answerResp.correct,
                                });

                                if (session.conversationData.membersAnswered.length < totalMemberCount) {
                                    // Comes here if the number of people that have answered is still less
                                    // than the total

                                    let updatedCountMessage = new builder.Message(session)
                                        .address(session.conversationData.countMessageAddress)
                                        .text("All participants have not answered: " + session.conversationData.membersAnswered.length +
                                            " of " + totalMemberCount);

                                    session.connector.update(updatedCountMessage.toMessage(), (err3, address) => {
                                        if (!err3) {
                                            // Don't need to do anything
                                        } else {
                                            session.error(err3);
                                        }
                                        session.endDialog();
                                    });
                                } else {
                                    // All users have answered so complete the question
                                    // NEED TO CLEAN THE CONVERSATION DATA!!!

                                    // Close the question card
                                    let completedQuestionCardMessage = AnswerQuestionDialog.createCompletedCardMessage(session);

                                    session.connector.update(completedQuestionCardMessage.toMessage(), (err4, address) => {
                                        if (!err4) {
                                            // Build the results string
                                            let resultText = "";
                                            for (let entry of session.conversationData.membersAnswered) {
                                                resultText += entry.name;
                                                if (entry.answerResult) {
                                                    resultText += ": RIGHT<br/>";
                                                } else {
                                                    resultText += ": wrong<br/>";
                                                }
                                            }

                                            let completedResultMessage = new builder.Message(session)
                                                .address(session.conversationData.countMessageAddress)
                                                .text(resultText);

                                            session.connector.update(completedResultMessage.toMessage(), (err, address2) => {
                                                if (!err) {
                                                    // Don't need to do anything
                                                } else {
                                                    session.error(err);
                                                }
                                                session.endDialog();
                                            });
                                        } else {
                                            session.error(err4);
                                            session.endDialog();
                                        }
                                    });
                                }
                            }
                        }
                    } else {
                        session.error(err1);
                        session.endDialog();
                    }
                },
            );
        } else {
            // 1:1 chat
            let answerResp = await AnswerQuestionDialog.getAnswerResponse(session);

            let resultText;
            if (answerResp.correct) {
                resultText = "You are correct!<br/>" + session.message.user.name + " has earned the " + answerResp.achievementBadge + " Badge";
            } else {
                resultText = ["Better luck next time!", "Wrong answer. Try again.", "You be wrong!", "So sorry. Try again."];
            }

            let completedQuestionCardMessage = AnswerQuestionDialog.createCompletedCardMessage(session);

            session.connector.update(completedQuestionCardMessage.toMessage(), (err, address) => {
                if (!err) {
                    // resultText is text saying if they got it right or wrong
                    session.send(resultText);
                } else {
                    session.error(err);
                }
                session.endDialog();
            });
        }
    }

    private static async getAnswerResponse(session: builder.Session): Promise<any> {
        let api = new TriviaAPI();
        let userAADObjectID = (session.message.user as any).aadObjectId;
        let body = {
            userId: userAADObjectID,
            questionId: session.message.value.questionId,
            answerId: session.message.value.id,
        };
        let answerResp = await api.postAnswer(body);

        let currBadge = session.userData.achievementBadge;
        if (currBadge !== answerResp.achievementBadge) {
            // trigger event to Event Grid
            api.notifyTopic({
                userName: session.message.user.name,
                aadObjectId: (session.message.user as any).aadObjectId,
                newBadge: answerResp.achievementBadge,
            });
            session.userData.achievementBadge = answerResp.achievementBadge;
        }
        return answerResp;
    }

    private static createCompletedCardMessage(session: builder.Session): builder.Message {
        let buttons = new Array<builder.CardAction>();
        let messageBackButton = builder.CardAction.messageBack(session, "", "Post a New Question")
            .displayText("Post a New Question")
            .text("post a question");
        buttons.push(messageBackButton);

        let completedQuestionCard = new builder.ThumbnailCard(session)
            .title("Question Answered")
            .text("<h2>" + session.message.value.questionText + "</h2>")
            .buttons(buttons);

        let address = session.message.address;
        (address as any).id = session.message.replyToId;
        return new builder.Message(session)
            .address(address)
            .addAttachment(completedQuestionCard);
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            "AnswerQuestionDialogId",
            /answer the question/i,
            AnswerQuestionDialog.processAnswer,
        );
    }
}
