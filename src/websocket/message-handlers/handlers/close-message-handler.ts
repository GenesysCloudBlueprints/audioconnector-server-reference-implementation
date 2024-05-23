import { ClientMessage } from '../../../protocol/message';
import { Session } from '../../../common/session';
import { MessageHandler } from '../message-handler';

export class CloseMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        console.log('Received a Close Message.');
        session.send(session.createMessage('closed', {}));
    }
}