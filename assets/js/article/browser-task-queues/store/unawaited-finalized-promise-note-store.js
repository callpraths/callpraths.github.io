import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare, finalize } from "./common.js";

export class UnawaitedFinalizedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer();
        const result = this.saveInternal(notes);
        // ❗Another cheap operation added here (< 100 milliseconds)❗
        await finalize(notes);
        stopTimer();
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