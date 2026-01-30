import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";
import { TraceLogger } from "./trace-logger.js";

export class UnawaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
    }

    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        // ❗`saveInternal` returned a `Promise` that we did not `await`❗
        const result = this.saveInternal(notes);
        this.traceLogger.log_called("Called result = this.saveInternal(notes)");
        stopTimer();
        this.traceLogger.log_called("Called stopTimer()");
        // ❗We still stopped the timer before returning❗
        this.traceLogger.log_called("Returning from save()");
        return result;
    }

    async saveInternal(notes) {
        return new Promise((resolve) => {
            compress(notes);
            this.traceLogger.log_called("Called compress(notes)");
            resolve();
        });
    }
}