import { TimingReporter } from "./timing-reporter.js";
import { compress } from "./common.js";
import { TraceLogger } from "./trace-logger.js";

export class SetTimeoutNoteStore {
    constructor(elem) {
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
        this.saveTimerHandle = undefined;
    }

    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        if (this.saveTimerHandle) {
            clearTimeout(this.saveTimerHandle);
        }
        let result = new Promise((resolve) => {
            // ❗Create a task instead of a micro-task❗
            this.saveTimerHandle = setTimeout(() => {
                this.traceLogger.log_called("Timeout fired.");
                compress(notes);
                this.traceLogger.log_called("Called compress(notes)");
                this.saveTimerHandle = undefined;
                stopTimer();
                this.traceLogger.log_called("Called stopTimer()");
                resolve();
            }, 0);
        });
        this.traceLogger.log_called("Returning from save()");
        return result;
    }
}