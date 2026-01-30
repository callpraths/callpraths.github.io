import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class TqMicrotask extends LitElement {
    static get styles() {
        return css`
            :host {
                display: block;
            }
            .microtask {
                border: 0.125rem solid #c8a0a0;
                background-color: rgba(65, 7, 12, 0.25); /* Dark pink with 25% opacity */
                padding: 0.5rem;
                border-radius: 0.25rem;
            }
            .header {
                font-size: 0.8em;
                font-weight: bold;
                margin-bottom: 0.25rem;
            }
            .content {
                font-family: monospace;
                font-size: 0.9rem;
                white-space: pre-wrap;
            }
        `;
    }

    render() {
        return html`
            <div class="microtask">
                <div class="header">JavaScript Micro-Task</div>
                <div class="content"><slot></slot></div>
            </div>
        `;
    }
}
