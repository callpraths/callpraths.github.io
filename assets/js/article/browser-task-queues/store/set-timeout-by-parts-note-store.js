import { compressParts } from "./common.js";
import { TimingReporter } from "./timing-reporter.js";
import { TraceLogger } from "./trace-logger.js";

export class SetTimeoutByPartsNoteStore {
    constructor(elem, parts) {
        this.parts = parts;
        this.saveTimerHandles = new Array(parts);
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
    }

    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");
        this.saveTimerHandles.forEach(
            (handle) => handle && clearTimeout(handle)
        );
        let result = new Promise(async resolve => {
            this.traceLogger.log_called("Initial timeout fired.");
            await Promise.all(
                // ❗Preconfigured number of parts to split work into❗
                [...Array(this.parts).keys()].map(
                    (i) =>
                        new Promise((resolve) => {
                            this.saveTimerHandles[i] = setTimeout(() => {
                                this.traceLogger.log_called("Timeout for part" + i + " fired.");
                                // ❗Blocking, but quicker, compression of a part❗
                                compressParts(notes, this.parts, i);
                                this.traceLogger.log_called("Called compressParts() for part " + i);
                                this.saveTimerHandles[i] = undefined;
                                resolve();
                            }, 0);
                        })
                )
            );
            this.traceLogger.log_called("Resuming after all timeouts processed.");
            stopTimer();
            this.traceLogger.log_called("Called stopTimer()");
            resolve();
        });
        this.traceLogger.log_called("Returning from save()");
        return result;
    }
}

