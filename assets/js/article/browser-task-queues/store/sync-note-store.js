import { compress } from "./common.js";
import { TimingReporter } from "./timing-reporter.js";
import { TraceLogger } from "./trace-logger.js";

export class SyncNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
    }

    save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        // ❗Text compression in our example takes ~4 seconds 😲
        compress(notes);
        this.traceLogger.log_called("Called compress(notes)");
        stopTimer();
        this.traceLogger.log_called("Called stopTimer()");
        this.traceLogger.log_called("Returning from save()");
    }
}