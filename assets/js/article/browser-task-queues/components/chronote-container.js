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
        `;
    }

    render() {
        return html`
            <div id="container">
                <slot id="chronos-slot"></slot>
                ${this.withLatency ? html`<x-chronote-latency target="${this.childId}"></x-chronote-latency>` : html``}
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

