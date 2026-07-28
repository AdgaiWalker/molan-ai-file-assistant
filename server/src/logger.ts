export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogSink = (line: string) => void;

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const forbiddenKeys = /^(authorization|cookie|accessToken|refreshToken|code|content|body|payload)$/i;

export class JsonLogger {
  constructor(
    private readonly minimumLevel: LogLevel,
    private readonly sink: LogSink = (line) => process.stdout.write(`${line}\n`),
  ) {}

  write(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
    if (levels[level] < levels[this.minimumLevel]) return;
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([key]) => !forbiddenKeys.test(key)),
    );
    this.sink(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...safeFields,
    }));
  }
}
