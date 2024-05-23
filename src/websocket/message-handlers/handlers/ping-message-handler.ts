import { ClientMessage } from '../../../protocol/message';
import { Session } from '../../../common/session';
import { MessageHandler } from '../message-handler';

export class PingMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        session.send(session.createMessage('pong', {}));
    }
}