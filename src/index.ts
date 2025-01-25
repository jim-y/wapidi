import { Store } from './container';
import type { Container } from './types';

export { default as InjectionToken } from './InjectionToken';
export * from './decorators';
export * from './bind';
export * from './types';
export * from './errors';

export const container: Container = new Store();
