import { createHmac, timingSafeEqual } from 'crypto';
import {
    BareItem,
    Dictionary,
    encodeBareItem,
    encodeInnerList,
    encodeItem,
    InnerList,
    isBoolean,
    isByteSequence,
    isInnerList,
    isInteger,
    isItem,
    isString,
    parseDictionaryField,
} from './structured-fields';

// Maximum clock skew we allow between the client and server clock.
const MAX_CLOCK_SKEW = 3;

export type HeaderFields = Record<string, string | string[] | undefined>;

const derivedComponents = [
    '@method',
    '@authority',
    '@scheme',
    '@target-uri',
    '@request-target',
    '@path',
    '@query',
    '@status',
] as const;

export type DerivedComponentTag = typeof derivedComponents[number];

export type SignatureParameters = {
    alg?: string;
    created?: number;
    expires?: number;
    keyid?: string;
    nonce?: string;
};

// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-message-signatures-11#section-6.4
export type SignatureComponentParameter = {
    key: 'key';
    value: string;
} | {
    key: 'name';
    value: string;
} | {
    key: 'sf';
    value: boolean;
} | {
    key: 'bs';
    value: boolean;
} | {
    key: 'req';
    value: boolean;
};

const signatureComponentParameterValidator: {
    [K in SignatureComponentParameter['key']]: (arg: BareItem) => boolean;
} = {
    key: isString,
    name: isString,
    sf: isBoolean,
    bs: isBoolean,
    req: isBoolean,
};

export type SignatureComponent = {
    name: string;
    params?: SignatureComponentParameter[];
};

export type SignatureInfo = {
    readonly label: string;
    readonly parameters: SignatureParameters;
    readonly components: SignatureComponent[];
    readonly signatureBase: InnerList;
    readonly signature: Uint8Array;
};

export type VerifyResultCode = 'VERIFIED' | 'FAILED' | 'UNSIGNED' | 'EXPIRED' | 'INVALID' | 'PRECONDITION' | 'UNSUPPORTED';

export type VerifyResultFailureCode = Exclude<VerifyResultCode, 'VERIFIED'>;

export type VerifyResultFailure = {
    code: VerifyResultFailureCode;
    reason?: string;
};

export type VerifyResultSuccess = {
    code: Exclude<VerifyResultCode, VerifyResultFailureCode>;
}

export type VerifyResult = VerifyResultFailure | VerifyResultSuccess;

export const withFailure = (code: VerifyResultFailureCode, reason?: string): VerifyResultFailure => ({ code, reason });

export type SignatureSelector = (signatures: SignatureInfo[]) => string | null;

export type ExpirationTimeProvider = (parameters: SignatureParameters) => number;

export type DerivedComponentLookup = (name: DerivedComponentTag) => string | null;

export type KeyResolverResultGoodKey = {
    code: 'GOODKEY';
    key: Uint8Array;
    alg?: string;
};

export type KeyResolverResultBadKey = {
    code: 'BADKEY';
    key: Uint8Array;
    alg?: string;
};

export type KeyResolverResult = KeyResolverResultGoodKey | KeyResolverResultBadKey | VerifyResultFailure;

export type KeyResolver = (parameters: SignatureParameters) => Promise<KeyResolverResult> | KeyResolverResult;

export type VerifierOptions = {
    headerFields: HeaderFields;
    requiredComponents?: string[];
    maxSignatureAge?: number;
    signatureSelector?: SignatureSelector;
    expirationTimeProvider?: ExpirationTimeProvider;
    derivedComponentLookup?: DerivedComponentLookup;
    keyResolver: KeyResolver;
};

export const canonicalizeHeaderFieldValue = (value: string): string => (
    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-message-signatures-11#section-2.1
    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-messaging-19#section-5.2
    value.trim().replace(/[ \t]*\r\n[ \t]+/g, ' ')
);

export const queryCanonicalizedHeaderField = (headers: HeaderFields, name: string): string | null => {
    const field = headers[name];
    return field ? Array.isArray(field) ? field.map(canonicalizeHeaderFieldValue).join(', ') : canonicalizeHeaderFieldValue(field) : null;
};


const querySignatureHeaderField = (headers: HeaderFields, name: string): Dictionary => {
    const value = headers[name];
    // Note: the field value will be canonicalized implicitly as part of the parse.
    return value ? parseDictionaryField(value) : new Map();
};

export const verifySignature = async (options: VerifierOptions): Promise<VerifyResult> => {
    const {
        headerFields,
        requiredComponents,
        maxSignatureAge,
        signatureSelector,
        derivedComponentLookup,
        keyResolver,
    } = options;

    let signatureInputFields;
    let signatureFields;
    try {
        signatureInputFields = querySignatureHeaderField(headerFields, 'signature-input');
    } catch(err) {
        return withFailure('INVALID', 'Failed to parse "signature-input" header field');
    }
    try {
        signatureFields = querySignatureHeaderField(headerFields, 'signature');
    } catch(err) {
        return withFailure('INVALID', 'Failed to parse "signature" header field');
    }
    if (signatureInputFields.size === 0) {
        if(signatureFields.size === 0) {
            return withFailure('UNSIGNED', 'No "signature" and "signature-input" header fields');
        }
        return withFailure('INVALID', 'Found "signature" but no "signature-input" header field');
    } else if (signatureFields.size === 0) {
        return withFailure('INVALID', 'Found "signature-input" but no "signature" header field');
    }

    const signatures: SignatureInfo[] = [];
    for(const [label, signatureBase] of signatureInputFields) {
        const signature = signatureFields.get(label);
        if (!signature) {
            return withFailure('INVALID', `Signature with label ${encodeBareItem(label)} not found`);
        }
        if (!isItem(signature) || !isByteSequence(signature.value)) {
            return withFailure('INVALID', `Invalid "signature" header field value (label: ${encodeBareItem(label)})`);
        }
        if (!isInnerList(signatureBase)) {
            return withFailure('INVALID', `Invalid "signature-input" header field value for label ${encodeBareItem(label)}: (Dictionary member value must be an Inner List)`);
        }

        const components: SignatureComponent[] = [];
        for(const { value, params } of signatureBase.value) {
            if(!isString(value)) {
                return withFailure('INVALID', 'Invalid "signature-input" header field value (not an Inner List of Strings)');
            }
            if(params) {
                if(!params.every(({ key, value }) => ((key in signatureComponentParameterValidator) && (signatureComponentParameterValidator.key?.(value) ?? false)))) {
                    return withFailure('INVALID', `Invalid signature component: ${encodeItem({ value, params })}`);
                }
                components.push({ name: value, params: params as SignatureComponentParameter[] });
            } else {
                components.push({ name: value });
            }
        }

        if (!signatureBase.params) {
            return withFailure('INVALID', 'Invalid "signature-input" header field value (no parameters)');
        }
    
        const parameters: SignatureParameters = {};
        for (const { key, value } of signatureBase.params) {
            switch (key) {
                case 'alg':
                    if (!isString(value)) {
                        return withFailure('INVALID', `Invalid "signature-input" header field value (${encodeBareItem(key)} parameter must be a String)`);
                    }
                    parameters.alg = value;
                    break;
    
                case 'created':
                    if (!isInteger(value) || (value < 0)) {
                        return withFailure('INVALID', `Invalid "signature-input" header field value (${encodeBareItem(key)} parameter must be an Integer)`);
                    }
                    parameters.created = value;
                    break;
    
                case 'expires':
                    if (!isInteger(value) || (value < 0)) {
                        return withFailure('INVALID', `Invalid "signature-input" header field value (${encodeBareItem(key)} parameter must be an Integer)`);
                    }
                    parameters.expires = value;
                    break;
    
                case 'keyid':
                    if (!isString(value)) {
                        return withFailure('INVALID', `Invalid "signature-input" header field value (${encodeBareItem(key)} parameter must be a String)`);
                    }
                    parameters.keyid = value;
                    break;
    
                case 'nonce':
                    if (!isString(value)) {
                        return withFailure('INVALID', `Invalid "signature-input" header field value (${encodeBareItem(key)} parameter must be a String)`);
                    }
                    parameters.nonce = value;
                    break;
    
                default:
                    return withFailure('INVALID', `Invalid "signature-input" header field value (unknown parameter ${encodeBareItem(key)})`);
            }
        }        

        signatures.push({
            label,
            parameters,
            components,
            signatureBase,
            signature: signature.value,
        });
    }

    // If there is a signature selector, let it choose which one (usually more useful if there is more than one).
    // If no selector specified, pick the first one.
    const label = signatureSelector ? signatureSelector(signatures) : signatures[0].label;
    if(!label) {
        return withFailure('PRECONDITION', 'Multiple signatures and none met selection criteria');
    }
    const {
        parameters,
        components,
        signatureBase,
        signature
    } = signatures.find(x => x.label === label) ?? signatures[0];

    // Check whether the signature has expired
    if (parameters.created || parameters.expires || maxSignatureAge) {
        const now = options.expirationTimeProvider?.(parameters) ?? (Date.now() / 1000);
        if (parameters.created && (parameters.created > (now + MAX_CLOCK_SKEW))) {
            return withFailure('PRECONDITION', 'Invalid "created" parameter value (time in the future)');
        }
        if (parameters.expires && (parameters.expires < (now + MAX_CLOCK_SKEW))) {
            return withFailure('EXPIRED');
        }
        if (maxSignatureAge) {
            if (!parameters.created) {
                return withFailure('PRECONDITION', 'Cannot determine signature age (no "created" signature parameter)');
            }
            if ((parameters.created + maxSignatureAge) < (now + MAX_CLOCK_SKEW)) {
                return withFailure('EXPIRED');
            }
        }
    }

    // Now assemble the input lines for the signature data to verify
    const remainingRequired = new Set<string>(requiredComponents);
    const includedComponents = new Set<string>();
    const inputLines: string[] = [];
    for (const { name, params } of components) {
        const encoded = encodeItem({ value: name, params });
        let value: string;
        if (name[0] === '@') {
            // It's a derived component
            if (name === '@signature-params') {
                return withFailure('INVALID', 'The "@signature-params" MUST NOT be listed in covered components.');
            }
            if (name === '@query-params') {
                return withFailure('UNSUPPORTED', `Derived component ${encoded} is not yet supported.`);
            }
            if (!(derivedComponents as readonly string[]).includes(name)) {
                return withFailure('INVALID', `Unknown derived component (${encoded}) in signature base.`);
            }
            if(params && (params.length !== 0)) {
                if(params.some(({ key, value }) => (key === 'req') && value)) {
                    return withFailure('UNSUPPORTED', `Related request indicator (req) not yet supported (${encoded}).`);
                }
                return withFailure('INVALID', `Derived component (${encoded}) does not support component parameters.`);
            }
            if (includedComponents.has(encoded)) {
                return withFailure('INVALID', `Duplicate ${encoded} component reference`);
            }
            let tmp = derivedComponentLookup?.(name as DerivedComponentTag);
            if (!tmp) {
                if(name === '@authority') {
                    tmp = queryCanonicalizedHeaderField(headerFields, 'host');
                }
                if(!tmp) {
                    return withFailure('PRECONDITION', `Cannot resolve reference to ${encoded} component`);
                }
            }
            value = tmp;

        } else {
            // It's a regular header field
            if(name === 'signature') {
                return withFailure('UNSUPPORTED', `Reference to component ${encoded} is not yet supported.`);
            }
            if(params && (params.length !== 0)) {
                if(params.some(({ key, value }) => (key === 'sf') && value)) {
                    return withFailure('UNSUPPORTED', `Known structured field component parameter (sf) not yet supported (${encoded}).`);
                }
                if(params.some(({ key, value }) => (key === 'bs') && value)) {
                    return withFailure('UNSUPPORTED', `Byte sequence wrapping indicator parameter (bs) not yet supported (${encoded}).`);
                }
                if(params.some(({ key, value }) => (key === 'req') && value)) {
                    return withFailure('UNSUPPORTED', `Related request indicator (req) not yet supported (${encoded}).`);
                }
                return withFailure('INVALID', `Invalid component parameter(s) for component: ${encoded}`);
            }
            const field = queryCanonicalizedHeaderField(headerFields, name);
            if (!field) {
                return withFailure('PRECONDITION', `Header field ${encodeBareItem(name)} not present`);
            } 
            value = field;
        }
        inputLines.push(`${encodeItem({ value: name, params })}: ${value}`);
        includedComponents.add(encoded);  
        remainingRequired.delete(name);
    }
    if (remainingRequired.size !== 0) {
        return withFailure('PRECONDITION', `Signature does not cover some of the required component(s): ${[...remainingRequired].map(encodeBareItem).join(',')}`);
    }

    // Note that we are re-encoding the signature base from the parsed and validated representation.
    // This reduces the risk for padding and other attacks and makes sure the signer was strict.
    inputLines.push(`"@signature-params": ${encodeInnerList(signatureBase)}`);
    const signatureData = inputLines.join('\n');

    const resolverResult = await keyResolver(parameters);
    if((resolverResult.code !== 'GOODKEY') && (resolverResult.code !== 'BADKEY'))   {
        return resolverResult;
    }
    const alg = resolverResult.alg ?? parameters.alg ?? 'hmac-sha256';
    const badAlg = (alg !== 'hmac-sha256') ? withFailure('UNSUPPORTED', `Signature algorithm ${encodeBareItem(alg)} is not supported`) : null;

    const computedSignature = createHmac('sha256', resolverResult.key).update(signatureData).digest();

    // The following code tries to minimize timing dependency on the key--irrespective whether its good/known or bad/unknown.
    // Note that there are likely a lot of timing dependencies of the key resolver, such as locating the key associated 
    // with a keyid. Implementations should consider additional mitigation, such as a fixed overall response 
    // delay on any failed signature match no matter the reason. 
    // Here, we attempt to reduce the timing dependence even in the unlikely case a BADKEY happens to cause a signature match. 
    if (timingSafeEqual(signature, computedSignature)) {
        if(badAlg) {
            return badAlg;
        } else if(resolverResult.code === 'GOODKEY') {
            return { code: 'VERIFIED' };
        } else {
            return withFailure('FAILED', 'Signatures do not match');    
        }
    } else {
        if(badAlg) {
            return badAlg;
        } else if(resolverResult.code === 'BADKEY') {
            return withFailure('FAILED', 'Signatures do not match');
        } else {
            return withFailure('FAILED', 'Signatures do not match');
        }
    }
};
