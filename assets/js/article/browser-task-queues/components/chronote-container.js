import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

// Usage:
// <x-chronote-container>
//   <xchronote ...></chronote>
// </x-chronote-container>
export class ChronoteContainer extends LitElement {
    constructor() {
        super();
        this.childId = undefined;
    }

    static get properties() {
        return {
            withLatency: { type: Boolean, reflect: true },
            withTraceViewer: { type: Boolean, reflect: true },
            childId: { type: String, state: true },
        };
    }

    static get styles() {
        return css`
           #layout-row {
            display: flex;
            flex-direction: row;
            width: 100%;
            height: 100%;
            gap: 0.25rem;
            align-items: flex-start;
            box-sizing: border-box;
            padding-inline: 1rem; /* Padding on left/right of entire container */
          }
          #chronote-column {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            width: 20rem; /* Fixed width for chronote column */
            flex-shrink: 0;
            box-sizing: border-box;
            height: 100%;
          }
           #container {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            width: 100%;
            height: 100%;
            padding: 0.5rem;
            align-items: center;
            box-sizing: border-box;
          }
          #chronos-slot {
            flex: 1;
            width: 100%;
            display: block;
            box-sizing: border-box;
          }
          ::slotted(*) {
            width: 100%;
            height: 100%;
            display: block;
            box-sizing: border-box;
          }
          :host {
            display: block;
            width: 20rem;
            height: 15rem;
            box-sizing: border-box;
          }
          :host([withLatency]) {
            height: 17rem;
          }
          :host([withTraceViewer]) {
            width: 100%;
            min-width: 23rem; /* 20rem (chronote) + 0.25rem (gap) + 2rem (collapsed viewer) */
          }
          x-chronote-trace-viewer {
             height: 100%;
             margin-block: 0.5rem; /* Align with chronote content (which has 0.5rem padding) */
             height: calc(100% - 1rem); /* Account for margin */
          }
        `;
    }

    render() {
        const chronoteContent = html`
            <div id="container">
                <slot id="chronos-slot"></slot>
                ${this.withLatency ? html`<x-chronote-latency target="${this.childId}"></x-chronote-latency>` : html``}
            </div>
        `;

        if (this.withTraceViewer) {
            return html`
                <div id="layout-row">
                    <div id="chronote-column">
                        ${chronoteContent}
                    </div>
                    <x-chronote-trace-viewer></x-chronote-trace-viewer>
                </div>
            `;
        }
        return chronoteContent;
    }

    firstUpdated() {
        const slot = this.shadowRoot.getElementById("chronos-slot");
        if (!slot) {
            return;
        }
        const chronote = slot.assignedElements()[0];
        if (chronote) {
            this.childId = chronote.id;
        }
    }
}

