import {
    Duration,
    EmptyObject,
    JsonObject,
    JsonStringMap,
    MediaParameters,
    SequenceNumber,
    LanguageCode,
    Uuid,
} from './core';

import { EventEntities } from './entities';

import {
    DTMFMessage,
    PlaybackCompletedMessage,
    PlaybackStartedMessage
} from './voice-bots';

export type MessageBase<Type extends string = string, Parameters extends JsonObject = JsonObject> = {
    version: '2';
    id: Uuid;
    type: Type;
    seq: SequenceNumber;
    parameters: Parameters;
};

export type ClientMessageBase<T extends string = string, P extends JsonObject = JsonObject> = MessageBase<T, P> & {
    serverseq: SequenceNumber;
    position: Duration;
};

export type ServerMessageBase<T extends string = string, P extends JsonObject = JsonObject> = MessageBase<T, P> & {
    clientseq: SequenceNumber;
};

export type CloseReason = 'end' | 'error' | 'disconnect' | 'reconnect';

export type CloseParameters = {
    reason: CloseReason;
};

export type ClosedParameters = EmptyObject;

export type DiscardedParameters = {
    start: Duration;
    discarded: Duration;
};

export type DisconnectReason = 'completed' | 'unauthorized' | 'error';

export type DisconnectParameters = {
    reason: DisconnectReason;
    info?: string;
    outputVariables?: JsonStringMap;
};

export type ErrorCode = 
    | 400
    | 405
    | 408
    | 409
    | 413
    | 415
    | 429
    | 500
    | 503;

export type ErrorParameters = {
    code: ErrorCode;
    message: string;
    retryAfter?: Duration;          // Used by client rate limiter (429)
};

export type EventParameters = {
    entities: EventEntities;
};

export type Participant = {
    id: Uuid;
    ani: string;
    aniName: string;
    dnis: string;
};

//export type ContinuedSession = {
//    id: Uuid;
//    serverseq: SequenceNumber;
//    clientseq: SequenceNumber;
//}

//export type ContinuedSessions = ContinuedSession[];

//export type OpenParameters = {
//    organizationId: Uuid;
//    conversationId: Uuid;
//    participant: Participant;
//    media: MediaParameters;
//    language?: LanguageCode;
//    continuedSessions?: ContinuedSessions;
//    customConfig?: JsonObject;
//    inputVariables?: JsonStringMap;
//};

export type OpenParameters = {
    organizationId: Uuid;
    conversationId: Uuid;
    participant: Participant;
    media: MediaParameters;
    language?: LanguageCode;
    customConfig?: JsonObject;
    inputVariables?: JsonStringMap;
};

export type OpenedParameters = {
    media: MediaParameters;
    discardTo?: Duration;
    startPaused?: boolean;
};

export type PauseParameters = EmptyObject;

export type PausedParameters = EmptyObject;

export type PingParameters = {
    rtt?: Duration;
};

export type PongParameters = EmptyObject;

export type ReconnectParameters = {
    info?: string;
};

export type ResumeParameters = EmptyObject;

export type ResumedParameters = {
    start: Duration;
    discarded: Duration;
};

export type UpdateParameters = {
    language?: LanguageCode;
};

export type UpdatedParameters = EmptyObject;

export type CloseMessage = ClientMessageBase<'close', CloseParameters>;

export type ClosedMessage = ServerMessageBase<'closed', ClosedParameters>;

export type DiscardedMessage = ClientMessageBase<'discarded', DiscardedParameters>;

export type DisconnectMessage = ServerMessageBase<'disconnect', DisconnectParameters>;

export type ErrorMessage = ClientMessageBase<'error', ErrorParameters>;

export type EventMessage = ServerMessageBase<'event', EventParameters>;

export type OpenMessage = ClientMessageBase<'open', OpenParameters>;

export type OpenedMessage = ServerMessageBase<'opened', OpenedParameters>;

export type PauseMessage = ServerMessageBase<'pause', PauseParameters>;

export type PausedMessage = ClientMessageBase<'paused', PausedParameters>;

export type PingMessage = ClientMessageBase<'ping', PingParameters>;

export type PongMessage = ServerMessageBase<'pong', PongParameters>;

export type ReconnectMessage = ServerMessageBase<'reconnect', ReconnectParameters>;

export type ResumeMessage = ServerMessageBase<'resume', ResumeParameters>;

export type ResumedMessage = ClientMessageBase<'resumed', ResumedParameters>;

export type UpdateMessage = ClientMessageBase<'update', UpdateParameters>;

export type UpdatedMessage = ServerMessageBase<'updated', UpdatedParameters>;

export type ClientMessage =
    | CloseMessage
    | DiscardedMessage
    | ErrorMessage
    | OpenMessage
    | PausedMessage
    | PingMessage
    | ResumedMessage
    | UpdateMessage
    | DTMFMessage
    | PlaybackStartedMessage
    | PlaybackCompletedMessage;

export type ServerMessage =
    | ClosedMessage
    | DisconnectMessage
    | EventMessage
    | OpenedMessage
    | PauseMessage
    | PongMessage
    | ReconnectMessage
    | ResumeMessage
    | UpdatedMessage

export type Message = ClientMessage | ServerMessage;

export type ClientMessageType = ClientMessage['type'];
export type ClientMessageParameters = ClientMessage['parameters'];

export type ServerMessageType = ServerMessage['type'];
export type ServerMessageParameters = ServerMessage['parameters'];

export type MessageType = ClientMessageType | ServerMessageType;
export type MessageParameters = ClientMessageParameters | ServerMessageParameters;

export type SelectParametersForType<T extends string, M> = M extends {type: T, parameters: infer P} ? P : never;
export type SelectMessageForType<T extends string, M> = M extends {type: T} ? M : never;

export type MessageDispatcher<M extends Message, R = void> = {
    readonly [T in M['type']]: (message: SelectMessageForType<T, M>) => R;
};