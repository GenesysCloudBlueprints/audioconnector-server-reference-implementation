export type Uuid = string;             // UUID as defined by RFC#4122

export type SequenceNumber = number;   // Non-negative integer

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray | JsonStringMap;

export type JsonArray = JsonValue[];

export type JsonObject = {
    [key: string]: JsonValue
};

export type JsonStringMap = {
    [key: string]: string
};

export type EmptyObject = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in any] : never
};

export type Duration = `PT${number}S`; // ISO8601 duration in seconds, where 'number' in non-negative decimal representation

export type MediaChannel = 'external' | 'internal';

export type MediaChannels = MediaChannel[];

export type MediaType = 'audio';

export type MediaFormat = 'PCMU' | 'L16';

export type MediaRate = 8000;

export type MediaParameter = {
    type: MediaType;
    format: MediaFormat;
    channels: MediaChannels;
    rate: MediaRate;
};

export type MediaParameters = MediaParameter[];

export type LanguageCode = string;

export type EventEntityBase<T extends string, D extends JsonValue> = {
    type: T;
    data: D;
};
