import { ClientMessage, ErrorMessage } from '../../../protocol/message';
import { Session } from '../../../common/session';
import { MessageHandler } from '../message-handler';

export class ErrorMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        const parsedMessage: ErrorMessage = message as ErrorMessage;

        if (!parsedMessage) {
            return;
        }
        
        console.log(`Received an Error Message. Code: ${parsedMessage.parameters.code}. Message: ${parsedMessage.parameters.message}`);
    }
}