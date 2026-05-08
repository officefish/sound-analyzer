export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'flac', 'aac', 'opus', 'wma'];

export function isAudioFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? AUDIO_EXTENSIONS.includes(ext) : false;
}

export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'opus': 'audio/opus',
    'wma': 'audio/x-ms-wma',
  };
  return mimeTypes[ext || ''] || 'audio/mpeg';
}

export function isSupportedAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || isAudioFile(file.name);
}