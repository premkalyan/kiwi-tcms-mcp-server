// Logger utility for Kiwi TCMS MCP Server

export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} [${level}] ${this.component}:`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      console.error(this.formatMessage('ERROR', message, {
        message: error.message,
        stack: error.stack
      }));
    } else if (error) {
      console.error(this.formatMessage('ERROR', message, error));
    } else {
      console.error(this.formatMessage('ERROR', message));
    }
  }

  debug(message: string, data?: any): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }
}
