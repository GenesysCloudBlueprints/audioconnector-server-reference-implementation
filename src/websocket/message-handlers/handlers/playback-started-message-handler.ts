import { ClientMessage } from '../../../protocol/message';
import { Session } from '../../../common/session';
import { MessageHandler } from '../message-handler';

export class PlaybackStartedMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        console.log('Received a Playback Started Message.');
        session.setIsAudioPlaying(true);
    }
}