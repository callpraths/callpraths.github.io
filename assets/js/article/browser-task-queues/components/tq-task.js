import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class TqTask extends LitElement {
    static get properties() {
        return {
            type: { type: String },
        };
    }

    static get styles() {
        return css`
            :host {
                display: block;
                height: auto; /* Allow growth */
            }
            .task {
                border: 0.25rem solid #999;
                padding: 0.5rem;
                border-radius: 0.25rem;
            }
            .task-header {
                font-weight: bold;
                margin-bottom: 0.5rem;
                border-bottom: 0.125rem solid rgba(0,0,0,0.1);
                padding-bottom: 0.25rem;
            }
            .task.browser-paint {
                background-color: rgba(7, 95, 56, 0.25); /* Dark green with 25% opacity */
                display: flex;
                flex-direction: column; /* Ensures vertical centering works if height is added */
                justify-content: center;
                align-items: center; /* Center horizontally too */
                padding: 1rem; /* Add some padding to give it volume */
                box-sizing: border-box;
            }
            .task.javascript-execution-queue {
                background-color: rgba(7, 95, 56, 0.25); /* Dark green with 25% opacity */
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                height: 100%;
                box-sizing: border-box;
            }
            .task.javascript-execution {
                background-color: rgba(7, 95, 56, 0.25); /* Dark green with 25% opacity */
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                height: 100%;
                box-sizing: border-box;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 0.9rem;
            }
            .content {
                display: flex;
                flex-direction: column; /* Vertical layout for children (microtasks) */
                gap: 0.5rem;
            }
        `;
    }

    render() {
        return html`
            <div class="task ${this.type}">
                <div class="task-header">Task: ${this.type}</div>
                <div class="content">
                    <slot></slot>
                </div>
            </div>
        `;
    }
}
