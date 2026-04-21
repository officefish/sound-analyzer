// import { IPlugin
//    // , IPluginContext
//  } from '../../../types/plugins';

// class SoundEffectPluginClass implements IPlugin {
//   id = 'stopwatch-sound-effects';
//   name = 'Звуковые эффекты';
//   version = '1.0.0';
//   description = 'Воспроизводит звуки при старте, паузе и сбросе';
//   icon = '🔊';
//   moduleId = 'unknown' as const;
//   enabled = false;
  
//   availableActions = ['test', 'setVolume', 'getVolume', 'playSound', 'mute', 'unmute', 'isMuted'];
  
//   settings = {
//     volume: 0.5,
//     soundOnStart: true,
//     soundOnPause: true,
//     soundOnReset: true,
//     soundOnLap: true,
//   };
  
//   private audioContext: AudioContext | null = null;
//   private isMuted = false;
  
//   private initAudioContext(): AudioContext {
//     if (!this.audioContext) {
//       this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
//     }
//     return this.audioContext;
//   }
  
//   private playSoundInternal(frequency: number, duration: number, volume: number): void {
//     if (this.isMuted) return;
    
//     const ctx = this.initAudioContext();
//     const now = ctx.currentTime;
//     const gainNode = ctx.createGain();
//     const oscillator = ctx.createOscillator();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = frequency;
//     gainNode.gain.value = volume * (this.settings.volume || 0.5);
    
//     oscillator.start();
//     gainNode.gain.exponentialRampToValueAtTime(0.00001, now + duration);
//     oscillator.stop(now + duration);
    
//     ctx.resume();
//   }
  
//   private getFrequencyForAction(action: string): number {
//     const frequencies: Record<string, number> = {
//       start: 523.25,
//       pause: 392.00,
//       reset: 329.63,
//       lap: 659.25,
//     };
//     return frequencies[action] || 440;
//   }
  
//   private getDurationForAction(action: string): number {
//     const durations: Record<string, number> = {
//       start: 0.3,
//       pause: 0.2,
//       reset: 0.4,
//       lap: 0.15,
//     };
//     return durations[action] || 0.2;
//   }
  
//   onModuleEvent(event: string
//    // , data: any, context?: IPluginContext
//  ): void {
//     const soundOnMap: Record<string, boolean> = {
//       start: this.settings.soundOnStart || false,
//       pause: this.settings.soundOnPause || false,
//       reset: this.settings.soundOnReset || false,
//       lap: this.settings.soundOnLap || false,
//     };
    
//     if (soundOnMap[event]) {
//       const frequency = this.getFrequencyForAction(event);
//       const duration = this.getDurationForAction(event);
//       this.playSoundInternal(frequency, duration, 1);
//     }
//   }
  
//   testSound(): boolean {
//     this.playSoundInternal(440, 0.5, 1);
//     return true;
//   }
  
//   setVolume(volume: number): void {
//     this.settings.volume = Math.max(0, Math.min(1, volume));
//   }
  
//   getVolume(): number {
//     return this.settings.volume || 0.5;
//   }
  
//   mute(): void {
//     this.isMuted = true;
//   }
  
//   unmute(): void {
//     this.isMuted = false;
//   }
  
//   isMutedState(): boolean {
//     return this.isMuted;
//   }
  
//   playSound(frequency: number, duration: number): void {
//     this.playSoundInternal(frequency, duration, 1);
//   }
  
//   onActivate(): void {
//     console.log('🔊 Sound Effects Plugin activated');
//   }
  
//   onDeactivate(): void {
//     if (this.audioContext) {
//       this.audioContext.close();
//       this.audioContext = null;
//     }
//   }
  
//   execute(action: string, data?: any
//     //, context?: IPluginContext
// ): any {
//     switch (action) {
//       case 'test':
//         return this.testSound();
//       case 'setVolume':
//         return this.setVolume(data);
//       case 'getVolume':
//         return this.getVolume();
//       case 'playSound':
//         return this.playSound(data?.frequency, data?.duration);
//       case 'mute':
//         return this.mute();
//       case 'unmute':
//         return this.unmute();
//       case 'isMuted':
//         return this.isMutedState();
//       default:
//         return null;
//     }
//   }
// }

// export const SoundEffectPlugin = new SoundEffectPluginClass();