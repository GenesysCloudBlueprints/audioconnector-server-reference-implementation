import { MediaParameter } from '../../../protocol/core';
import {
    ClientMessage,
    OpenMessage,
    ServerMessage
} from '../../../protocol/message';
import { Session } from '../../../common/session';
import { MessageHandler } from '../message-handler';

export class OpenMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        const parsedMessage: OpenMessage = message as OpenMessage;

        if (!parsedMessage) {
            const message = 'Invalid request parameters.';
            console.log(message);
            session.sendDisconnect('error', message, {});
            return;
        }

        session.setConversationId(parsedMessage.parameters.conversationId);

        console.log('Received an Open Message.');

        let selectedMedia: MediaParameter | null = null;

        parsedMessage.parameters.media.forEach((element: MediaParameter) => {
            if (element.format === 'PCMU' && element.rate === 8000) {
                selectedMedia = element;
            }
        });

        if (!selectedMedia) {
            const message = 'No supported media type was found.';
            console.log(message);
            session.sendDisconnect('error', message, {});
            return;
        }

        console.log(`Using MediaParameter ${JSON.stringify(selectedMedia)}`);

        session.setSelectedMedia(selectedMedia);

        if (parsedMessage.parameters.inputVariables) {
            session.setInputVariables(parsedMessage.parameters.inputVariables);
        }

        session.checkIfBotExists()
            .then((exists) => {
                if (!exists) {
                    const message = 'The specific Bot does not exist.';
                    console.log(message);
                    session.sendDisconnect('error', message, {});
                    return;
                }

                if (selectedMedia) {
                    const response: ServerMessage = session.createMessage('opened', {
                        media: [selectedMedia]
                    });

                    session.send(response);
                    // Send out the turn response for the start of a conversation.
                    session.processBotStart();
                }
            });
    }
}