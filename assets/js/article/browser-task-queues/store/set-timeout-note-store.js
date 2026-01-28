import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";

export class SetTimeoutNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
        this.saveTimerHandle = undefined;
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "set-timeout-note-store-save"
        );
        if (this.saveTimerHandle) {
            clearTimeout(this.saveTimerHandle);
        }
        return new Promise((resolve) => {
            this.saveTimerHandle = setTimeout(() => {
                compress(notes);
                this.saveTimerHandle = undefined;
                stopTimer();
                resolve();
            }, 0);
        });
    }
}