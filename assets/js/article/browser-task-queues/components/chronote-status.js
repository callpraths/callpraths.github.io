import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteStatus extends LitElement {
    static get properties() {
        return {
            status: {
                type: String, // Values: [saving, ready]
            },
        };
    }
    static get styles() {
        return css`
          .container {
            display: inline-block;
            position: relative;
            width: 2rem;
            height: 2rem;
          }
          .container div {
            display: inline-block;
            position: absolute;
            left: 0.2rem;
            width: 0.4rem;
          }
          .container div:nth-child(1) {
            left: 0.2rem;
            animation-delay: -0.24s;
          }
          .container div:nth-child(2) {
            left: 0.8rem;
            animation-delay: -0.12s;
          }
          .container div:nth-child(3) {
            left: 1.4rem;
            animation-delay: 0;
          }

          .ready div {
            background: rgb(100, 245, 191);
            animation: none;
            height: 0.8rem;
            top: 0.6rem;
          }

          .saving div {
            background: #fff;
            animation: saving 0.6s cubic-bezier(0, 0.5, 0.5, 1) infinite;
          }
          @keyframes saving {
            0% {
              top: 0.2rem;
              height: 1.6rem;
            }
            50%,
            100% {
              top: 0.6rem;
              height: 0.8rem;
            }
          }
        `;
    }
    render() {
        return html`<div class="container ${this.status}">
          <div></div>
          <div></div>
          <div></div>
        </div>`;
    }
}