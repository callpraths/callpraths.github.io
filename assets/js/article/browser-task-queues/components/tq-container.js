import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class TqContainer extends LitElement {
    static get styles() {
        return css`
            :host {
                display: block;
            }
            .content-wrapper {
                display: flex;
                flex-direction: column; /* Vertical layout */
                gap: 0.25rem;
                width: 80%;
                margin: 1rem auto; /* Centered with 1rem vertical margin */
                align-items: stretch; /* Stretch tasks to fill container width */
            }
        `;
    }

    render() {
        return html`
            <div class="content-wrapper">
                <slot></slot>
            </div>
        `;
    }
}
