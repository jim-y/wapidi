export class InjectionToken {
    token = Symbol();
    description?: string;
    constructor(description?: string) {
        if (description) {
            this.description = description;
        }
    }
}
