import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteEditor extends LitElement {
    static get styles() {
        return css`
          #container {
            border-width: 0.125rem;
            border-radius: 0.25rem;
            border-color: #cccccc;
            border-style: solid;
            background-color: rgb(24, 24, 24);
            color: rgb(187, 187, 187);
            padding: 0.125rem;
            display: flex;
            flex-direction: row;
          }
          #text {
            flex-grow: 1;
            background-color: inherit;
            border-style: none;
            color: inherit;
            margin-left: 0.125rem;
          }
          #text:focus {
            outline: none;
          }
          #accept {
            background-color: rgb(224, 251, 241);
            border-radius: 0.5rem;
            color: #181818;
            min-width: 3rem;
            text-align: center;
          }
        `;
    }
    render() {
        return html`
          <div id="container">
            <input type="text" id="text" name="text" placeholder="Quick, add a note..." required @keydown=${this.handleKeyPress}></input>
            <button id="accept" @click="${this.accept}">✓</button>
          </div>
        `;
    }
    handleKeyPress(event) {
        // Enter
        if (event.keyCode == 13) {
            this.accept();
        }
    }
    accept() {
        const textBox = this.shadowRoot.getElementById("text");
        const note = textBox.value;
        if (note === "") {
            return;
        }

        textBox.value = "";
        this.dispatchEvent(
            new CustomEvent("x-chronote-add", {
                detail: {
                    note,
                },
                bubbles: true,
                composed: true,
            })
        );
    }
}