export class TraceLogger {
    constructor(elem) {
        this.elem = elem;
    }

    log_called(line) {
        this.elem.dispatchEvent(
            new CustomEvent("trace-log", {
                detail: {
                    log: `[${new Date().toISOString().slice(14, 19)}] ${line}`,
                },
                bubbles: true,
                composed: true,
            })
        );
    }

    start_new() {
        this.elem.dispatchEvent(
            new CustomEvent("trace-new", {
                bubbles: true,
                composed: true,
            })
        );
    }
}
