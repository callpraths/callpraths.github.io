import { compressParts } from "./common.js";
import { TimingReporter } from "./timing-reporter.js";

export class SetTimeoutByPartsNoteStore {
    constructor(elem, parts) {
        this.parts = parts;
        this.saveTimerHandles = new Array(parts);
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        const stopTimer = this.timingReporter.startTimer(
            "set-timeout-by-parts-note-store-save"
        );
        this.saveTimerHandles.forEach(
            (handle) => handle && clearTimeout(handle)
        );
        return new Promise(async resolve => {
            await Promise.all(
                [...Array(this.parts).keys()].map(
                    (i) =>
                        new Promise((resolve) => {
                            this.saveTimerHandles[i] = setTimeout(() => {
                                compressParts(notes, this.parts, i);
                                this.saveTimerHandles[i] = undefined;
                                resolve();
                            }, 0);
                        })
                )
            );
            stopTimer();
            resolve();
        })



    }
}

