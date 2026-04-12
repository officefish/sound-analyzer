// src/services/StopwatchService.ts

import { BaseService } from "../../../services/BaseService";

export interface StopwatchState {
  elapsedTime: number;
  isRunning: boolean;
  laps: Lap[];
}

export interface Lap {
  id: number;
  number: number;
  time: string;
  timestamp: number;
}

export interface StopwatchServiceEvents {
  onTick?: (elapsedTime: number) => void;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onLap?: (lap: Lap) => void;
}

export class StopwatchService extends BaseService {
  private elapsedTime: number = 0;
  private isRunningFlag: boolean = false;
  private startTime: number = 0;
  private timerId: number | null = null;
  private lapCounter: number = 0;
  private laps: Lap[] = [];
  
  getState(): StopwatchState {
    return {
      elapsedTime: this.elapsedTime,
      isRunning: this.isRunningFlag,
      laps: this.laps,
    };
  }
  
  start(): void {
    console.log('service start')
    if (this.isRunningFlag) return;
    
    console.log('🕐 StopwatchService.start() called');
    console.log('   Current elapsedTime:', this.elapsedTime);
    
    this.startTime = Date.now() - this.elapsedTime;
    this.timerId = window.setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      console.log('   Tick:', this.elapsedTime);
      this.emit('onTick', this.elapsedTime);
    }, 10);
    
    this.isRunningFlag = true;
    this.emit('onStart');
  }
  
  pause(): void {
    if (!this.isRunningFlag) return;
    
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    
    this.isRunningFlag = false;
    this.emit('onPause');
  }
  
  reset(): void {
    this.pause();
    this.elapsedTime = 0;
    this.laps = [];
    this.lapCounter = 0;
    this.emit('onTick', 0);
    this.emit('onReset');
  }
  
  addLap(): void {
    if (!this.isRunningFlag) return;
    
    this.lapCounter++;
    const lap: Lap = {
      id: Date.now(),
      number: this.lapCounter,
      time: this.formatTime(this.elapsedTime),
      timestamp: Date.now(),
    };
    
    this.laps = [...this.laps, lap];
    this.emit('onLap', lap);
  }
  
  private formatTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }
  
  dispose(): void {
    this.pause();
    this.listeners.clear();
  }
}