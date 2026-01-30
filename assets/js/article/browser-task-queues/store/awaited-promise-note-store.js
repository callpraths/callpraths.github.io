import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";

export class AwaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    // ❗Save is now asynchronous.❗
    async save(notes) {
        const stopTimer = this.timingReporter.startTimer();
        await this.saveInternal(notes);
        stopTimer();
    }

    // ❗Make compression asychronous by wrapping in a promise.❗
    async saveInternal(notes) {
        return new Promise((resolve) => {
            compress(notes);
            resolve();
        });
    }
}
