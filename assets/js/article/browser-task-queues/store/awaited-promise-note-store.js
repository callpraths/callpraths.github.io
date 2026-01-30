import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";
import { TraceLogger } from "./trace-logger.js";

export class AwaitedPromiseNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
    }

    // ❗Save is now asynchronous.❗
    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        await this.saveInternal(notes);
        this.traceLogger.log_called("Resuming after await saveInternal(notes)");
        stopTimer();
        this.traceLogger.log_called("Called stopTimer()");
        this.traceLogger.log_called("Returning from save()");
    }

    // ❗Make compression asychronous by wrapping in a promise.❗
    async saveInternal(notes) {
        return new Promise((resolve) => {
            compress(notes);
            this.traceLogger.log_called("Called compress(notes)");
            resolve();
        });
    }
}
