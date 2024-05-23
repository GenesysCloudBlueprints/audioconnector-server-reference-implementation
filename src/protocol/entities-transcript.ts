import {
    Duration,
    EventEntityBase,
    MediaChannel,
    LanguageCode,
    Uuid,
} from './core';

export type EventEntityTranscript = EventEntityBase<'transcript', EventEntityDataTranscript>;

export type EventEntityDataTranscript = {
    id: Uuid;
    channel: MediaChannel;
    isFinal: boolean;
    position?: Duration;
    duration?: Duration;
    alternatives: TranscriptAlternative[];
};

export type TranscriptAlternative = {
    confidence: number;
    languages?: LanguageCode[];
    interpretations: TranscriptInterpretation[];
};

export type TranscriptInterpretationType = 'lexical' | 'normalized';

export type TranscriptInterpretation = {
    type: TranscriptInterpretationType;
    transcript: string;
    tokens?: TranscriptToken[];
};

export type TranscriptTokenType = 'word' | 'punctuation';

export type TranscriptToken = {
    type: TranscriptTokenType;
    value: string;
    confidence: number;
    position: Duration;
    duration: Duration;
    language?: LanguageCode;
};

/*
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const example1: EventEntityDataTranscript = {
    id: '802095c6-80d2-4dbe-8a9b-57af2d094f53',
    channel: 'external',
    isFinal: true,
    position: 'PT123.4S',
    duration: 'PT1.4S',
    alternatives: [
        {
            confidence: 0.98,
            languages: ['en-US'],
            interpretations: [
                {
                    type: 'lexical',
                    transcript: 'is my name john',
                    tokens: [
                        {
                            type: 'word',
                            value: 'is',
                            confidence: 0.95,
                            position: 'PT123.4S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'my',
                            confidence: 0.95,
                            position: 'PT123.6S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'name',
                            confidence: 0.96,
                            position: 'PT123.8S'
                            duration: 'PT0.6S'
                        },

                        {
                            type: 'word',
                            value: 'john',
                            confidence: 0.99,
                            position: 'PT124.2S'
                            duration: 'PT0.6S'
                        }
                    ]
                },
                {
                    type: 'normalized',
                    transcript: 'Is my name John?',
                    tokens: [
                        {
                            type: 'word',
                            value: 'Is',
                            confidence: 0.94,
                            position: 'PT123.4S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'my',
                            confidence: 0.96,
                            position: 'PT123.8S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'name',
                            confidence: 0.97,
                            position: 'PT123.9S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'John',
                            confidence: 0.99,
                            position: 'PT124.2S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'punctuation',
                            value: '?',
                            confidence: 0.75,
                            position: 'PT124.4S'
                            duration: 'PT0S'
                        },
                    ]
                }
            ]
        }
    ]
};


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const example2: EventEntityDataTranscript = {
    id: '802095c6-80d2-4dbe-8a9b-57af2d094f53',
    channel: 'external',
    isFinal: true,
    position: 'PT120.2S'
    duration: 'PT0S',
    alternatives: [
        {
            confidence: 0.98,
            languages: ['en-US'],
            interpretations: [
                {
                    type: 'normalized',
                    transcript: 'My phone number is 812-327-0943',
                    tokens: [
                        {
                            type: 'word',
                            value: 'My',
                            confidence: 0.94,
                            position: 'PT120.2S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'phone',
                            confidence: 0.96,
                            position: 'PT121.2S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'number',
                            confidence: 0.97,
                            position: 'PT122.2S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: 'is',
                            confidence: 0.97,
                            position: 'PT123.2S'
                            duration: 'PT0.6S'
                        },
                        {
                            type: 'word',
                            value: '812-327-0943',
                            confidence: 0.99,
                            position: 'PT124.2S'
                            duration: 'PT3.2S'
                        },
                    ]
                },
            ]
        }
    ]
};


*/
