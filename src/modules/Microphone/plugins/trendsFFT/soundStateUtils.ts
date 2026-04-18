// src/plugins/microphone2/utils/soundStateUtils.ts

import { SOUND_STATES, SoundStateKey } from './types';

/**
 * Получить состояние звука по ключу
 * @param key - ключ состояния (BIRDS, PEOPLE, WIND, DRONE, EXPLOSION, QUIET, TRAFFIC)
 * @returns объект состояния или undefined
 */
export function getSoundStateByKey(key: string) {
  return SOUND_STATES[key as SoundStateKey];
}

/**
 * Получить все состояния звуков в виде массива
 * @returns массив состояний с ключами (без дублирования key)
 */export function getAllSoundStates() {
  return Object.entries(SOUND_STATES).map(([key, value]) => ({
    ...value,
    key: key as SoundStateKey, // Перемещаем key в конец, чтобы он не перезаписывался
  }));
}

/**
 * Получить список всех ключей состояний
 * @returns массив ключей состояний
 */
export function getAllStateKeys(): SoundStateKey[] {
  return Object.keys(SOUND_STATES) as SoundStateKey[];
}

/**
 * Получить состояние с максимальной оценкой
 * @param scores - объект с оценками по состояниям
 * @returns лучшее состояние или null
 */
export function getBestState(scores: Record<string, number>) {
  let bestState: string | null = null;
  let bestScore = -1;
  
  for (const [state, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestState = state;
    }
  }
  
  return bestState ? getSoundStateByKey(bestState) : null;
}

/**
 * Проверить, находится ли значение в диапазоне состояния
 * @param stateKey - ключ состояния
 * @param param - параметр для проверки ('centroid', 'flux', 'rms')
 * @param value - значение для проверки
 * @returns true если значение в диапазоне
 */
export function isValueInStateRange(
  stateKey: string,
  param: 'centroid' | 'flux' | 'rms',
  value: number
): boolean {
  const state = getSoundStateByKey(stateKey);
  if (!state) return false;
  
  const range = state.thresholds[param];
  return value >= range.min && value <= range.max;
}

/**
 * Получить процент соответствия состояния для сэмпла
 * @param stateKey - ключ состояния
 * @param centroid - значение центра масс
 * @param flux - значение спектрального потока
 * @param rms - значение громкости
 * @returns процент соответствия (0-100)
 */
export function getStateMatchPercentage(
  stateKey: string,
  centroid: number,
  flux: number,
  rms: number
): number {
  const state = getSoundStateByKey(stateKey);
  if (!state) return 0;
  
  let matchCount = 0;
  let totalChecks = 0;
  
  if (centroid >= state.thresholds.centroid.min && centroid <= state.thresholds.centroid.max) {
    matchCount++;
  }
  totalChecks++;
  
  if (flux >= state.thresholds.flux.min && flux <= state.thresholds.flux.max) {
    matchCount++;
  }
  totalChecks++;
  
  if (rms >= state.thresholds.rms.min && rms <= state.thresholds.rms.max) {
    matchCount++;
  }
  totalChecks++;
  
  return (matchCount / totalChecks) * 100;
}

/**
 * Найти лучшее состояние для сэмпла
 * @param centroid - значение центра масс
 * @param flux - значение спектрального потока
 * @param rms - значение громкости
 * @returns объект с лучшим состоянием и процентом соответствия
 */
export function findBestStateForSample(
  centroid: number,
  flux: number,
  rms: number
): { state: string; stateName: string; stateIcon: string; confidence: number } {
  let bestState = 'UNKNOWN';
  let bestConfidence = 0;
  let bestStateName = 'Неизвестно';
  let bestStateIcon = '❓';
  
  for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
    const confidence = getStateMatchPercentage(stateKey, centroid, flux, rms);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestState = stateKey;
      bestStateName = state.name;
      bestStateIcon = state.icon;
    }
  }
  
  return {
    state: bestState,
    stateName: bestStateName,
    stateIcon: bestStateIcon,
    confidence: bestConfidence,
  };
}

/**
 * Получить цвет состояния для UI
 * @param stateKey - ключ состояния
 * @returns цвет в формате hex
 */
export function getStateColor(stateKey: string): string {
  const state = getSoundStateByKey(stateKey);
  return state?.color || '#999';
}

/**
 * Получить иконку состояния для UI
 * @param stateKey - ключ состояния
 * @returns иконка emoji
 */
export function getStateIcon(stateKey: string): string {
  const state = getSoundStateByKey(stateKey);
  return state?.icon || '❓';
}

/**
 * Получить название состояния для UI
 * @param stateKey - ключ состояния
 * @returns название на русском
 */
export function getStateName(stateKey: string): string {
  const state = getSoundStateByKey(stateKey);
  return state?.name || 'Неизвестно';
}

/**
 * Получить описание состояния
 * @param stateKey - ключ состояния
 * @returns описание
 */
export function getStateDescription(stateKey: string): string {
  const state = getSoundStateByKey(stateKey);
  return state?.description || 'Описание отсутствует';
}

/**
 * Получить пороги для состояния
 * @param stateKey - ключ состояния
 * @returns объект с порогами
 */
export function getStateThresholds(stateKey: string) {
  const state = getSoundStateByKey(stateKey);
  return state?.thresholds || null;
}

/**
 * Получить временные паттерны для состояния
 * @param stateKey - ключ состояния
 * @returns объект с временными паттернами
 */
export function getStateTemporalPatterns(stateKey: string) {
  const state = getSoundStateByKey(stateKey);
  return state?.temporalPatterns || null;
}