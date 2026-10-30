import { type LogDb, type LogSource } from './sqlite';
export interface LogUi {
    url: string;
    close: () => Promise<void>;
}
export interface LogUiOptions {
    port: number;
    env: NodeJS.ProcessEnv;
    source?: LogSource;
    logs?: LogDb;
    providers?: () => Promise<Record<string, string>>;
}
export declare const startLogUi: (options: LogUiOptions) => Promise<LogUi>;
//# sourceMappingURL=ui.d.ts.map