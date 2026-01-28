import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteClock extends LitElement {
    static get properties() {
        return {
            now: { type: Date },
        };
    }
    static get styles() {
        return css`
          #container {
            background-color: rgb(24, 24, 24);
            color: rgb(255, 255, 255);
            border-radius: 0.25rem;
            font-weight: bolder;
            margin-right: 0.125rem;
            min-width: 10rem;
            padding: 0.25rem;
          }
        `;
    }
    connectedCallback() {
        super.connectedCallback();
        this.timer = setInterval(this.tick.bind(this), 1000);
        this.tick();
    }
    disconnectedCallback() {
        this.timer && clearInterval(this.timer);
        this.timer = undefined;
        super.disconnectedCallback();
    }
    tick() {
        this.now = new Date();
    }
    render() {
        return html`
          <div id="container">
            ${this.now.getHours()}:${this.now.getMinutes()}:${this.now.getSeconds()}
          </div>
        `;
    }
}
