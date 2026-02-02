import { compressParts } from "./common.js";
import { TimingReporter } from "./timing-reporter.js";
import { TraceLogger } from "./trace-logger.js";

export class SetTimeoutByPartsNoteStore {
    constructor(elem, parts) {
        this.parts = parts;
        this.timingReporter = new TimingReporter(elem);
        this.traceLogger = new TraceLogger(elem);
    }

    async save(notes) {
        this.traceLogger.start_new();
        const stopTimer = this.timingReporter.startTimer();
        this.traceLogger.log_called("Called startTimer()");

        const partsCount = this.parts;
        let result = new Promise(async resolve => {
            const savePart = (partIndex) => {
                this.traceLogger.log_called("Timeout fired for part " + partIndex + " of " + partsCount)
                // ❗Blocking, but quicker, compression of a part❗
                compressParts(notes, partsCount, partIndex);
                this.traceLogger.log_called("Called compressParts() for part " + partIndex + " of " + partsCount)
                if (partIndex === partsCount) {
                    stopTimer();
                    resolve();
                } else {
                    //❗Schedule next part.
                    setTimeout(() => savePart(partIndex + 1), 0)
                }
            }
            setTimeout(() => savePart(0), 0);
        });
        this.traceLogger.log_called("Returning from save()");
        return result;
    }
}

