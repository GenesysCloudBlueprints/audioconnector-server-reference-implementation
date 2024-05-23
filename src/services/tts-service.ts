/*
* This class provies TTS support for BotResource.
* This is a "dummy" implementation that will need to be replaced
* with an actual TTS engine.
* 
* See `bot-service` in this folder for more information.
*/
export class TTSService {
    // 5 seconds of silence.
    static silence: number[] = [];

    /*
    * For this implementation, we're just going to generate silence.
    A real-world implementation would use a TTS engine.
    */
    static {
        for (let x = 0; x < 40000; x++) {
            TTSService.silence[x] = 0;
        }
    }

    getAudioBytes(data: string): Promise<Uint8Array> {
        return Promise.resolve(Uint8Array.from(TTSService.silence));
    }
}