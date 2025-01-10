import { EventEntityBase, JsonValue } from './core';
import {
    EventEntityBargeIn,
    EventEntityBotTurnResponse
} from './voice-bots';

export type EventEntityPredefined =
    | EventEntityBargeIn
    | EventEntityBotTurnResponse;

export type EventEntity = 
     | EventEntityPredefined
     | EventEntityBase<string, JsonValue>

export type EventEntities = EventEntity[];
