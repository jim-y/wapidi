import { randomUUID } from 'node:crypto';

export default class InjectionToken<T> {
	token = randomUUID();
	constructor(private description?: string) {}
}
