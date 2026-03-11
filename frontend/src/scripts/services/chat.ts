export class ChatService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldReconnect = true;
    const wsUrl = (import.meta.env.VITE_API_URL as string)
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');

    this.ws = new WebSocket(`${wsUrl}/ws/messages`);

    this.ws.onopen = () => {
      console.log('[ChatService] WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.error('[ChatService] Malformed message', event.data);
        return;
      }

      this.emit(data.type, data);
    };

    this.ws.onclose = () => {
      console.log('[ChatService] WebSocket closed');
      this.ws = null;
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[ChatService] WebSocket error', err);
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(to: string, content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ChatService] WebSocket not connected, cannot send');
      return;
    }
    this.ws.send(JSON.stringify({ type: 'message', to, content }));
  }

  on(event: string, cb: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }

  off(event: string, cb: Function): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(cb);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  private emit(event: string, data: any): void {
    const cbs = this.listeners.get(event) || [];
    cbs.forEach(cb => cb(data));
  }
}

export const chatService = new ChatService();
