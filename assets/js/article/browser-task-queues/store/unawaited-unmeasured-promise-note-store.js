import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare } from "./common.js";

export class UnawaitedUnmeasuredPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "unawaited-unmeasured-promise-note-store-save"
        );
        this.saveInternal();
        stopTimer();
    }

    async saveInternal(notes) {
        await prepare(notes);
        compress(notes);
    }
}