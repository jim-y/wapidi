import { Container } from 'wapidi';
import { ENV } from './tokens';

export interface Logger {
    log(message?: any, ...optionalParams: any[]): void;
}

export const factory = (container: Container) => {
    if (container.get(ENV) === 'development') {
        return {
            log: console.log,
        } as Logger;
    } else {
        return () => {};
    }
};
