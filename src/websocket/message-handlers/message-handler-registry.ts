import { MessageHandler } from './message-handler';
import { OpenMessageHandler } from './handlers/open-message-handler';
import { CloseMessageHandler } from './handlers/close-message-handler';
import { PingMessageHandler } from './handlers/ping-message-handler';
import { PlaybackStartedMessageHandler } from './handlers/playback-started-message-handler';
import { PlaybackCompletedMessageHandler } from './handlers/playback-completed-message-handler';
import { DTMFMessageHandler } from './handlers/dtmf-message-handler';
import { ErrorMessageHandler } from './handlers/error-message-handler';

export class MessageHandlerRegistry {
    private messageHandlers: Map<string, MessageHandler> = new Map();
    
    constructor() {
        this.messageHandlers.set('open', new OpenMessageHandler());
        this.messageHandlers.set('close', new CloseMessageHandler());
        this.messageHandlers.set('ping', new PingMessageHandler());
        this.messageHandlers.set('playback_started', new PlaybackStartedMessageHandler());
        this.messageHandlers.set('playback_completed', new PlaybackCompletedMessageHandler());
        this.messageHandlers.set('dtmf', new DTMFMessageHandler());
        this.messageHandlers.set('error', new ErrorMessageHandler());
    }

    getHandler(type: string): MessageHandler | undefined {
        return this.messageHandlers.get(type);
    }
}