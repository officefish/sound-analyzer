// src/services/BaseService.ts

export abstract class BaseService {
  protected listeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
  
  protected emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
  
  abstract dispose(): void;
}