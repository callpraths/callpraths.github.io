import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteList extends LitElement {
    static get styles() {
        return css`
          #container {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            overflow-y: scroll;
            width: 100%;
            height: 100%;
          }
          #container::-webkit-scrollbar {
            width: 0px;
          }
        `;
    }
    render() {
        return html`<div id="container"><slot></slot></div>`;
    }
}
