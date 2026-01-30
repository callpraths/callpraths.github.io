import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare } from "./common.js";

export class UnawaitedPreparedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer();
        const result = this.saveInternal(notes);
        stopTimer();
        return result;
    }

    async saveInternal(notes) {
        // ❗A quick operation (< 100 milliseconds)❗
        await prepare(notes);
        return new Promise((resolve) => {
            compress(notes);
            resolve();
        });
    }
}
