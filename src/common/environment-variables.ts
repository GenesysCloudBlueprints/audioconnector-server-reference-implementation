const DEFAULT_PORT = 8080;

export function getPort(): number {
    const envPort: string | undefined = process.env.PORT;

    if (envPort) {
        return Number(envPort);
    }

    return DEFAULT_PORT;
};