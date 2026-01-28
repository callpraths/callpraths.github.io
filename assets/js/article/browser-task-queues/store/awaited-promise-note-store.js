import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";

export class AwaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "awaited-promise-note-store-save"
        );
        await this.saveInternal();
        stopTimer();
    }

    async saveInternal(notes) {
        return new Promise((resolve) => {
            compress(notes);
            resolve();
        });
    }
}
