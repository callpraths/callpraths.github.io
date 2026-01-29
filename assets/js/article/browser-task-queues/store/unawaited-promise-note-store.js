import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare } from "./common.js";

export class UnawaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer();
        // ❗`saveInternal` returned a `Promise` that we did not `await`❗
        const result = this.saveInternal(notes);
        stopTimer();
        // ❗We still stopped the timer before returning❗
        return result;
    }

    async saveInternal(notes) {
        await prepare(notes);
        return new Promise((resolve) => {
            compress(notes);
            resolve();
        });
    }
}