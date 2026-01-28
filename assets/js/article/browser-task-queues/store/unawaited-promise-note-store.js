import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare } from "./common.js";

export class UnawaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "unawaited-promise-note-store-save"
        );
        const result = this.saveInternal();
        stopTimer();
        return result;
    }

    async saveInternal(notes) {
        await prepare(notes);
        compress(notes);
    }
}