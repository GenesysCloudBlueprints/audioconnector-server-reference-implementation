import { EventEntityBase, JsonValue } from './core';
import {
    EventEntityBargeIn,
    EventEntityBotTurnResponse
} from './voice-bots';
//import { EventEntityTranscript } from './entities-transcript';

//export type EventEntityPredefined =
//    | EventEntityTranscript
//    | EventEntityBargeIn
//    | EventEntityBotTurnResponse;

export type EventEntityPredefined =
    | EventEntityBargeIn
    | EventEntityBotTurnResponse;

export type EventEntity = 
     | EventEntityPredefined
     | EventEntityBase<string, JsonValue>

export type EventEntities = EventEntity[];
