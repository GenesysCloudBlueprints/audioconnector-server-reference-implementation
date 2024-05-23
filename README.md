# AudioConnector Server Reference Guide

### Purpose
This repository contains a sample implementation for an AudioConnector Server. This is to be used as a guide to help understand some of the basics of setting up an AudioConnector Server. It is not intended for production purposes. Protocol documentation can be found on the [Genesys Developer Portal](https://developer.genesys.cloud/devapps/audiohook/).

### Things to look at to get started

#### The main session object
The [Session](./src/common/session.ts) class contains methods and logic that handle communicating with the AudioConnector Client.

The [ASRService](./src/services/asr-service.ts) class is responsible for interpreting the incoming audio from the AudioConnector Server. A fake implementation has been provided, and will need to be replaced with an actual ASR engine.

The [BotService](./src/services/bot-service.ts) class is responsible for getting the metadata for a specified Bot, as well as interacting with the Bot itself. For example, this service would be used to match a Bot's response to the input received/interpreted from the `ASRService` and `DTMFService` services. A fake implementation has been provided, and will need to be replaced with an actual Bot engine.

The [DTMFService](./src/services/dtmf-service.ts) class is responsible for interpreting any DTMF digits received from the AudioConnector Client. A base implementation has been provded as a start, but will need to be adjusted to meet any specific requirements for the AudioConnector Server.

The [SecretService](./src/services/secret-service.ts) class is responsible for looking up the secret from a given API Key used during the initial authentication process. A fake implementation has been provided, and will need to be replaced to lookup secrets with whatever service they are stored in.

The [TTSService](./src/services/tts-service.ts) class is responsible for converting text-based responses from the Bot to the appropriate audio to be sent to the AudioConnector Client. A fake implementation has been provided, and will need to be replaces with an actial TTS engine.

### Running the server

#### Requirements
This implementation was written using NodeJS 18.16.0 as a target. If you are using a Node version manager, there is a [nvmrc](./.nvmrc) file that specifies this version.

#### Steps to run the server locally
1) Run `npm install` in the root of the project.
2) Run `npm run start` in the root of the project to start the server. The port can be adjusted from within the [environment](./.env) file.