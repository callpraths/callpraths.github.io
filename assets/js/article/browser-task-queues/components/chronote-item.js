import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteItem extends LitElement {
    static get properties() {
        return {
            timestamp: { type: Date },
        };
    }
    static get styles() {
        return css`
          #container {
            color: #181818;
            display: flex;
            flex-direction: row;
          }
          #timestamp {
            background-color: #aaaaaa;
            border-radius: 0.25rem;
            font-weight: bolder;
            margin-right: 0.125rem;
            min-width: 10rem;
            padding: 0.25rem;
          }
          #note {
            background-color: #cccccc;
            border-radius: 0.25rem;
            flex-grow: 1;
            padding: 0.25rem;
          }
        `;
    }
    render() {
        return html` <div id="container">
          <div id="timestamp">${this.renderTimestamp()}</div>
          <div id="note"><slot></slot></div>
        </div>`;
    }
    renderTimestamp() {
        const t = this.timestamp;
        if (!t) {
            return html``;
        }
        return html`${t.getHours()}:${t.getMinutes()}:${t.getSeconds()}`;
    }
}

