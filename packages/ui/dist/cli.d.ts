export declare const HELP: string;
export interface CliIo {
    env: NodeJS.ProcessEnv;
    stdout: {
        write(chunk: string): unknown;
    };
    stderr: {
        write(chunk: string): unknown;
    };
}
export declare const main: (argv: string[], io: CliIo) => Promise<number>;
//# sourceMappingURL=cli.d.ts.map