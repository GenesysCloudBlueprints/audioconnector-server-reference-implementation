import { v4 as uuid } from 'uuid';
import { WebSocket } from 'ws';
import {
    JsonStringMap,
    MediaParameter
} from '../protocol/core';
import {
    ClientMessage,
    DisconnectParameters,
    DisconnectReason,
    EventParameters,
    SelectParametersForType,
    ServerMessage,
    ServerMessageBase,
    ServerMessageType
} from '../protocol/message';
import {
    BotTurnDisposition,
    EventEntityBargeIn,
    EventEntityBotTurnResponse
} from '../protocol/voice-bots';
import { MessageHandlerRegistry } from '../websocket/message-handlers/message-handler-registry';
import {
    BotService,
    BotResource,
    BotResponse
} from '../services/bot-service';
import {
    ASRService,
    Transcript
} from '../services/asr-service';
import { DTMFService } from '../services/dtmf-service';

export class Session {
    private MAXIMUM_BINARY_MESSAGE_SIZE = 64000;
    private disconnecting = false;
    private closed = false;
    private ws;

    private messageHandlerRegistry = new MessageHandlerRegistry();
    private botService = new BotService();
    private asrService: ASRService | null = null;
    private dtmfService: DTMFService | null = null;
    private url;
    private clientSessionId;
    private conversationId: string | undefined;
    private lastServerSequenceNumber = 0;
    private lastClientSequenceNumber = 0;
    private inputVariables: JsonStringMap = {};
    private selectedMedia: MediaParameter | undefined;
    private selectedBot: BotResource | null = null;
    private isCapturingDTMF = false;
    private isAudioPlaying = false;

    constructor(ws: WebSocket, sessionId: string, url: string) {
        this.ws = ws;
        this.clientSessionId = sessionId;
        this.url = url;
    }

    close() {
        if (this.closed) {
            return;
        }

        try {
            this.ws.close();
        } catch {
        }

        this.closed = true;
    }

    setConversationId(conversationId: string) {
        this.conversationId = conversationId;
    }

    setInputVariables(inputVariables: JsonStringMap) { this.inputVariables = inputVariables; }

    setSelectedMedia(selectedMedia: MediaParameter) { this.selectedMedia = selectedMedia; }

    setIsAudioPlaying(isAudioPlaying: boolean) { this.isAudioPlaying = isAudioPlaying; }

    processTextMessage(data: string) {
        if (this.closed) {
            return;
        }

        const message = JSON.parse(data);

        if (message.seq !== this.lastClientSequenceNumber + 1) {
            console.log(`Invalid client sequence number: ${message.seq}.`);
            this.sendDisconnect('error', 'Invalid client sequence number.', {});
            return;
        }

        this.lastClientSequenceNumber = message.seq;

        if (message.serverseq > this.lastServerSequenceNumber) {
            console.log(`Invalid server sequence number: ${message.serverseq}.`);
            this.sendDisconnect('error', 'Invalid server sequence number.', {});
            return;
        }

        if (message.id !== this.clientSessionId) {
            console.log(`Invalid Client Session ID: ${message.id}.`);
            this.sendDisconnect('error', 'Invalid ID specified.', {});
            return;
        }

        const handler = this.messageHandlerRegistry.getHandler(message.type);

        if (!handler) {
            console.log(`Cannot find a message handler for '${message.type}'.`);
            return;
        }

        handler.handleMessage(message as ClientMessage, this);
    }

    createMessage<Type extends ServerMessageType, Message extends ServerMessage>(type: Type, parameters: SelectParametersForType<Type, Message>): ServerMessage {
        const message: ServerMessageBase<Type, typeof parameters> = {
            id: this.clientSessionId as string,
            version: '2',
            seq: ++this.lastServerSequenceNumber,
            clientseq: this.lastClientSequenceNumber,
            type,
            parameters
        };
    
        return message as ServerMessage;
    }

    send(message: ServerMessage) {
        if (message.type === 'event') {
            console.log(`Sending an ${message.type} message: ${message.parameters.entities[0].type}.`);
        } else {
            console.log(`Sending a ${message.type} message.`);
        }
        
        this.ws.send(JSON.stringify(message));
    }

    sendAudio(bytes: Uint8Array) {
        if (bytes.length <= this.MAXIMUM_BINARY_MESSAGE_SIZE) {
            console.log(`Sending ${bytes.length} binary bytes in 1 message.`);
            this.ws.send(bytes, { binary: true });
        } else {
            let currentPosition = 0;

            while (currentPosition < bytes.length) {
                const sendBytes = bytes.slice(currentPosition, currentPosition + this.MAXIMUM_BINARY_MESSAGE_SIZE);

                console.log(`Sending ${sendBytes.length} binary bytes in chunked message.`);
                this.ws.send(sendBytes, { binary: true });
                currentPosition += this.MAXIMUM_BINARY_MESSAGE_SIZE;
            }
        }
    }

    sendBargeIn() {
        const bargeInEvent: EventEntityBargeIn = {
            type: 'barge_in',
            data: {}
        };
        const message = this.createMessage('event', {
            entities: [bargeInEvent]
        } as SelectParametersForType<'event', EventParameters>);

        this.send(message);
    }

    sendTurnResponse(disposition: BotTurnDisposition, text: string | undefined, confidence: number | undefined) {
        const botTurnResponseEvent: EventEntityBotTurnResponse = {
            type: 'bot_turn_response',
            data: {
                disposition,
                text,
                confidence
            }
        };
        const message = this.createMessage('event', {
            entities: [botTurnResponseEvent]
        } as SelectParametersForType<'event', EventParameters>);

        this.send(message);
    }

    sendDisconnect(reason: DisconnectReason, info: string, outputVariables: JsonStringMap) {
        this.disconnecting = true;
        
        const disconnectParameters: DisconnectParameters = {
            reason,
            info,
            outputVariables
        };
        const message = this.createMessage('disconnect', disconnectParameters);

        this.send(message);
    }

    sendClosed() {
        const message = this.createMessage('closed', {});
        this.send(message);
    }

    /*
    * This method is using during the open process to validate that the information supplied points
    * to a valid Bot Resource. There are a two places that can be looked at to get the required
    * information to locate a Bot Resource: The connection URL, and Input Variables.
    * 
    * In the connectionId field for an AudioConnector Bot in an Inbound Call Flow is where Bot information
    * can be added. The baseUri property on the AudioConnector Integration is appened with the connectionId
    * field, to form the end-result connection URL. Identifying Bot information can be in the form of URL
    * path parts and/or Query String values. You may also use Input Variables to provide further customization
    * if necessary.
    * 
    * This part has a "dummy" implementation that will need to be replaced with an actual implementation.
    * 
    * See `bot-service` in the `services` folder for more information.
    */
    checkIfBotExists(): Promise<boolean> {
        return this.botService.getBotIfExists(this.url, this.inputVariables)
            .then((selectedBot: BotResource | null) => {
                this.selectedBot = selectedBot;
                return this.selectedBot != null;
            });
    }

    /*
    * This method is used to provide the initial response from the Bot to the Client.
    *
    * This part has a "dummy" implementation that will need to be replaced with an actual implementation.
    *
    * See `bot-service` in the `services` folder for more information.
    */
    processBotStart() {
        if (!this.selectedBot) {
            return;
        }

        this.selectedBot.getInitialResponse()
            .then((response: BotResponse) => {
                if (response.text) {
                    this.sendTurnResponse(response.disposition, response.text, response.confidence);
                }

                if (response.audioBytes) {
                    this.sendAudio(response.audioBytes);
                }
            });
    }

    /*
    * This method is used to process the incoming audio data from the Client.
    * This part has a "dummy" implementation that will need to be replaced
    * with a proper ASR engine.
    * 
    * See `asr-service` in the `services` folder for more information.
    */
    processBinaryMessage(data: Uint8Array) {
        if (this.disconnecting || this.closed || !this.selectedBot) {
            return;
        }

        // Ignore audio if we are capturing DTMF
        if (this.isCapturingDTMF) {
            return;
        }

        /*
        * For this implementation, we are going to ignore input while there
        * is audio playing. You may choose to continue to process audio if
        * you want to enable support for Barge-In scenarios.
        */
        if (this.isAudioPlaying) {
            this.asrService = null;
            this.dtmfService = null;
            return;
        }

        if (!this.asrService || this.asrService.getState() === 'Complete') {
            this.asrService = new ASRService()
                .on('error', (error: any) => {
                    if (this.isCapturingDTMF) {
                        return;
                    }
                    
                    const message = 'Error during Speech Recognition.';
                    console.log(`${message}: ${error}`);
                    this.sendDisconnect('error', message, {});
                })
                .on('final-transcript', (transcript: Transcript) => {
                    if (this.isCapturingDTMF) {
                        return;
                    }
                    
                    this.selectedBot?.getBotResponse(transcript.text)
                        .then((response: BotResponse) => {
                            if (response.text) {
                                this.sendTurnResponse(response.disposition, response.text, response.confidence);
                            }

                            if (response.audioBytes) {
                                this.sendAudio(response.audioBytes);
                            }

                            if (response.endSession) {
                                this.sendDisconnect('completed', '', {});
                            }
                        });
                });
        }

        this.asrService.processAudio(data);
    }

    /*
    * This method is used to process the incoming DTMF digits from the Client.
    * This part has a "dummy" implementation that will need to be replaced
    * with proper logic.
    * 
    * See `dtmf-service` in the `services` folder for more information.
    */
    processDTMF(digit: string) {
        if (this.disconnecting || this.closed || !this.selectedBot) {
            return;
        }

        /*
        * For this implementation, we are going to ignore input while there
        * is audio playing. You may choose to continue to process DTMF if
        * you want to enable support for Barge-In scenarios.
        */
        if (this.isAudioPlaying) {
            this.asrService = null;
            this.dtmfService = null;
            return;
        }

        // If we are capturing DTMF, flag it so we stop capturing audio,
        // and close down the audio capturing.
        if (!this.isCapturingDTMF) {
            this.isCapturingDTMF = true;
            this.asrService = null;
        }

        if (!this.dtmfService || this.dtmfService.getState() === 'Complete') {
            this.dtmfService = new DTMFService()
                .on('error', (error: any) => {
                    const message = 'Error during DTMF Capture.';
                    console.log(`${message}: ${error}`);
                    this.sendDisconnect('error', message, {});
                })
                .on('final-digits', (digits) => {
                    this.selectedBot?.getBotResponse(digits)
                        .then((response: BotResponse) => {
                            if (response.text) {
                                this.sendTurnResponse(response.disposition, response.text, response.confidence);
                            }

                            if (response.audioBytes) {
                                this.sendAudio(response.audioBytes);
                            }

                            if (response.endSession) {
                                this.sendDisconnect('completed', '', {});
                            }

                            this.isCapturingDTMF = false;
                        });
                });
        }

        this.dtmfService.processDigit(digit);
    }
};
