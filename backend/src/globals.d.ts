declare module 'ws' {
  export default class WebSocket {
    once(event: string, handler: (...args: unknown[]) => void): void
    send(data: string): void
    close(code?: number, reason?: string): void
  }
}
