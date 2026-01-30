export class TimingReporter {
    constructor(elem) {
        this.elem = elem;
    }

    startTimer() {
        const tag = "chronote-save"
        const startTag = `${tag}--start`;
        const stopTag = `${tag}--stop`;
        performance.mark(startTag);
        return () => {
            performance.mark(stopTag);
            const measure = performance.measure(tag, startTag, stopTag);
            this.elem.dispatchEvent(
                new CustomEvent("report-perf-measurement", {
                    detail: {
                        name: measure.name,
                        duration: measure.duration,
                    },
                    bubbles: true,
                    composed: true,
                })
            );
        };
    }
}
