import { compress } from "./common.js";
import { TimingReporter } from "./timing-reporter.js";

export class SyncNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);

    }

    save(notes) {
        const stopTimer = this.timingReporter.startTimer();
        // ❗Text compression in our example takes ~4 seconds 😲
        compress(notes);
        stopTimer();
    }
}