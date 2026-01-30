import { TimingReporter } from "./timing-reporter.js";
import { compress, prepare, finalize } from "./common.js";
import { TraceLogger } from "./trace-logger.js";

export class UnawaitedFinalizedPromiseNoteStore {
    constructor(elem) {
        this.traceLogger = new TraceLogger(elem);
        this.timingReporter = new TimingReporter(elem);
    }

    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        const result = this.saveInternal(notes);
        this.traceLogger.log_called("Called result = this.saveInternal(notes)");
        // ❗Another quick operation (< 100 milliseconds)❗
        await finalize(notes);
        this.traceLogger.log_called("Resuming after await finalize(notes)");
        stopTimer();
        this.traceLogger.log_called("Called stopTimer()");
        this.traceLogger.log_called("Returning from save()");
        return result;
    }

    async saveInternal(notes) {
        await prepare(notes);
        this.traceLogger.log_called("Resuming after await prepare(notes)");
        return new Promise((resolve) => {
            compress(notes);
            this.traceLogger.log_called("Called compress(notes)");
            resolve();
        });
    }
}