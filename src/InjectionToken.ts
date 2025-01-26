export class InjectionToken {
    token = Symbol();
    constructor(public description?: string) {}
}
