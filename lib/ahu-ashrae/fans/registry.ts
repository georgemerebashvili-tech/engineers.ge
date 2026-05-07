// Fan models registry — load JSON datasets shipped with the project.

import type { FanModel } from './types';
import b3p190ec072907 from './data/B3P190-EC072-907.json';

export const FAN_MODELS: FanModel[] = [
  b3p190ec072907 as unknown as FanModel,
];

export function getFanByCode(code: string): FanModel | undefined {
  return FAN_MODELS.find((m) => m.code === code);
}

export function listFanCodes(): string[] {
  return FAN_MODELS.map((m) => m.code);
}
