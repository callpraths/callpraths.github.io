import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteLatency extends LitElement {
    constructor() {
        super();
        this.oldTarget = undefined;
    }

    static get properties() {
        return {
            target: { type: String },
            latency: { type: Number },
        };
    }

    static get styles() {
        return css`
          #container {
            background-color: #aaaaaa;
            color: #181818;
            padding: 0.25rem;
            margin: 0.25rem;
            border-radius: 0.25rem;
            text-align: center;
          }
          :host {
            display: block;
            align-items: center;
            width: 80%;
          }
        `;
    }

    render() {
        this.maybeUpdateEventListener();
        return html`<div id="container">Latency: ${this.renderLatency()}</div>`;
    }

    renderLatency() {
        if (this.latency === undefined) {
            return "N/A";
        }
        return `${Math.round(this.latency)} milliseconds`;
    }

    maybeUpdateEventListener() {
        if (this.target === this.oldTarget) {
            return;
        }


        if (this.oldTarget) {
            const target = document.getElementById(this.oldTarget);
            if (target) {
                target.remoteEventListener("report-perf-measurement", (ev) => {
                    const { duration } = ev.detail;
                    this.latency = duration;
                });
            }
        }
        const target = document.getElementById(this.target);
        if (target) {
            target.addEventListener("report-perf-measurement", (ev) => {
                const { duration } = ev.detail;
                this.latency = duration;
            });
        }
        this.oldTarget = this.target;
    }
}

