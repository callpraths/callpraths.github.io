import { TimingReporter } from "./timing-reporter.js";

export class InstantNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);

    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "instant-note-store-save"
        );

        return new Promise((resolve) => {
            // Delay update by a little bit to give UI indication that save is
            // in progress.
            setTimeout(() => {
                // No compression, that's why we're instant!
                // compress(notes)
                stopTimer();
                resolve();
            }, 200)
        });
    }
}