import { IPlugin, IPluginContext } from '../../../types/plugins';

class NoiseGatePluginClass implements IPlugin {
  id = 'microphone-noise-gate';
  name = 'Шумоподавитель';
  version = '1.0.0';
  description = 'Фильтрует фоновый шум ниже заданного порога';
  icon = '🔇';
  moduleId = 'microphone' as const;
  enabled = false;
  
  availableActions = ['process', 'isGateOpen', 'getThreshold', 'setThreshold', 'getReduction', 'setReduction', 'reset'];
  
  settings = {
    threshold: 0.15,
    attackTime: 10,
    releaseTime: 50,
    reduction: 0.8,
  };
  
  private lastVolume = 0;
  private isGateOpenFlag = false;
  
  private calculateAttack(currentVolume: number, targetVolume: number): number {
    const attackTimeMs = this.settings.attackTime;
    const step = attackTimeMs / 100;
    return Math.min(targetVolume, currentVolume + step);
  }
  
  private calculateRelease(currentVolume: number): number {
    const releaseTimeMs = this.settings.releaseTime;
    const step = releaseTimeMs / 100;
    return Math.max(0, currentVolume - step);
  }
  
  private processAudio(volume: number): number {
    const { threshold, reduction } = this.settings;
    
    if (volume > threshold) {
      this.isGateOpenFlag = true;
      this.lastVolume = this.calculateAttack(this.lastVolume, 1);
      return volume * this.lastVolume;
    } else {
      this.lastVolume = this.calculateRelease(this.lastVolume);
      if (this.lastVolume <= 0) this.isGateOpenFlag = false;
      return volume * (1 - reduction) * (this.lastVolume > 0 ? this.lastVolume : 0);
    }
  }
  
  private resetState(): void {
    this.lastVolume = 0;
    this.isGateOpenFlag = false;
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    if (event === 'audioFrame' && data?.volume !== undefined) {
      const processed = this.processAudio(data.volume);
      if (data.onProcessed) {
        data.onProcessed(processed);
      }
    }
  }
  
  onActivate(): void {
    console.log('🔇 Noise Gate Plugin activated');
    this.resetState();
  }
  
  onDeactivate(): void {
    console.log('🔇 Noise Gate Plugin deactivated');
    this.resetState();
  }
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'process':
        return this.processAudio(data?.volume || 0);
      case 'isGateOpen':
        return this.isGateOpenFlag;
      case 'getThreshold':
        return this.settings.threshold;
      case 'setThreshold':
        this.settings.threshold = data;
        return true;
      case 'getReduction':
        return this.settings.reduction;
      case 'setReduction':
        this.settings.reduction = data;
        return true;
      case 'reset':
        return this.resetState();
      default:
        return null;
    }
  }
}

export const NoiseGatePlugin = new NoiseGatePluginClass();