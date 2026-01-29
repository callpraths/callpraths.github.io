import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

// Usage:
// <x-chronote-with-latency>
//   <xchronote ...></chronote>
// </x-chronote-with-latency>
export class ChronoteWithLatency extends LitElement {
    constructor() {
        super();
        this.childId = undefined;
    }

    static get properties() {
        return {
            childId: { type: String, state: true },
        };
    }

    static get styles() {
        return css`
           #container {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            width: 100%;
            height: 100%;
            padding: 0.5rem;
            gap: 0.25rem;
            align-items: center;
          }
          #chronos-slot {
            flex: 1;
          }
          :host {
            display: block;
            width: fit-content;
          }
        `;
    }

    render() {
        return html`
            <div id="container">
                <slot id="chronos-slot"></slot>
                <x-chronote-latency target="${this.childId}"></x-chronote-latency>
            </div>`;
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

