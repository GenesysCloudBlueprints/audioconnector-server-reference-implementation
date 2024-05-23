import {
    EmptyObject,
    EventEntityBase
} from './core';

import { ClientMessageBase } from './message';

// Begin Client messages
export type DTMFParameters = {
    digit: string;
};
export type DTMFMessage = ClientMessageBase<'dtmf', DTMFParameters>;

export type PlaybackStartedParameters = EmptyObject;
export type PlaybackStartedMessage = ClientMessageBase<'playback_started', PlaybackStartedParameters>;

export type PlaybackCompletedParameters = EmptyObject;
export type PlaybackCompletedMessage = ClientMessageBase<'playback_completed', PlaybackCompletedParameters>;

// Begin Server events
export type EventEntityDataBargeIn = EmptyObject;
export type EventEntityBargeIn = EventEntityBase<'barge_in', EventEntityDataBargeIn>;

export type BotTurnDisposition = 'no_input' | 'no_match' | 'match';
export type EventEntityDataBotTurnResponse = {
    disposition: BotTurnDisposition;
    text?: string;
    confidence?: number;
};
export type EventEntityBotTurnResponse = EventEntityBase<'bot_turn_response', EventEntityDataBotTurnResponse>;