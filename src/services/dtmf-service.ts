import EventEmitter from 'events';

/*
* This class provides DTMF support for the incoming DTMF digits from the Client.
* The following events are expected from the session:
* 
*   Name; error
*   Parameters: Error message string or error object.
* 
*   Name: final-digits
*   Parameters: A string representing all of the captured DTMF digits.
* 
* The current usage of this class requires that a new instance be created for
* each set of DTMF digits received. Once a terminating digit is received, a
* new instance must be created.
*/
export class DTMFService {
    private emitter = new EventEmitter();
    private state = 'None';
    private digits = '';

    on(event: string, listener: (...args: any[]) => void): DTMFService {
        this.emitter?.addListener(event, listener);
        return this;
    }

    getState(): string {
        return this.state;
    }

    /*
    * For this implementation, we are just going to continue to capture digits until we
    * received a terminating digit (specifically, #). A more robust implementation will
    * need to be able to handle the case where a terminating digit is not received - for
    * that case, an inter-digit timeout should be implemented.
    */
    processDigit(digit: string): DTMFService {
        if (this.state === 'Complete') {
            this.emitter.emit('error', 'DTMF digits already received.');
            return this;
        }

        this.state = 'Processing';
        
        // If we get a terminating digit, mark this instance as complete, send out the event,
        // and reset the digits to help prevent possible leaking of digits if this instance is
        // attempted to be reused.
        if (digit === '#') {
            this.state = 'Complete';
            this.emitter.emit('final-digits', this.digits);
            this.digits = '';
            return this;
        }

        this.digits += digit;
        return this;
    }
}