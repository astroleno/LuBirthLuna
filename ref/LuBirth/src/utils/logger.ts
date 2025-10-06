// Lightweight logger with in-memory buffer and toggleable output

type LogEntry = {
  ts: string;
  tag: string;
  data: any;
  level: 'log' | 'warn' | 'error';
};

class Logger {
  private enabled = false;
  private buffer: LogEntry[] = [];

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  isEnabled() {
    return this.enabled;
  }

  clear() {
    this.buffer = [];
  }

  getBuffer() {
    return this.buffer.slice();
  }

  log(tag: string, data?: any) {
    if (!this.enabled) return;
    const entry: LogEntry = { ts: new Date().toISOString(), tag, data, level: 'log' };
    this.buffer.push(entry);
    try { (window as any).__LuBirthLogs = this.getBuffer(); } catch {}
    try { console.log(`[LuBirth] ${tag}`, data); } catch {}
  }

  warn(tag: string, data?: any) {
    if (!this.enabled) return;
    const entry: LogEntry = { ts: new Date().toISOString(), tag, data, level: 'warn' };
    this.buffer.push(entry);
    try { (window as any).__LuBirthLogs = this.getBuffer(); } catch {}
    try { console.warn(`[LuBirth] ${tag}`, data); } catch {}
  }

  error(tag: string, data?: any) {
    if (!this.enabled) return;
    const entry: LogEntry = { ts: new Date().toISOString(), tag, data, level: 'error' };
    this.buffer.push(entry);
    try { (window as any).__LuBirthLogs = this.getBuffer(); } catch {}
    try { console.error(`[LuBirth] ${tag}`, data); } catch {}
  }
}

export const logger = new Logger();
