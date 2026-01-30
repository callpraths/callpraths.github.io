import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteTraceViewer extends LitElement {
    static get properties() {
        return {
            collapsed: { type: Boolean, reflect: true, attribute: "collapsed" },
        };
    }

    constructor() {
        super();
        this.collapsed = true;
    }

    toggle() {
        this.collapsed = !this.collapsed;
        this.dispatchEvent(
            new CustomEvent("toggle", {
                detail: { collapsed: this.collapsed },
                bubbles: true,
                composed: true,
            })
        );
    }

    static get styles() {
        return css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: #181818; /* Dark background */
        border: 0.0625rem solid #aaaaaa; /* Match chronote border */
        border-radius: 0.25rem;
        box-sizing: border-box;
        overflow: hidden;
        transition: width 0.3s ease;
        color: #ffffff;
      }

      :host([collapsed]) {
        width: 2rem;
      }

      :host(:not([collapsed])) {
        flex: 1;
        width: auto;
        min-width: 15rem;
      }

      #header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.25rem;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      button {
        width: 1.5rem;
        height: 1.5rem;
        border: 0.0625rem solid #aaaaaa;
        background: #333;
        color: #fff;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      button:hover {
        background: #555;
      }

      #title {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        white-space: nowrap;
        font-weight: bold;
        color: #ddd;
        margin-top: 0.5rem;
      }

      #content {
        margin-left: 2rem;
        margin-top: -2rem; /* Pull up to align with header/title area visually if needed, or just let flex flow */
        padding: 0.5rem;
        display: none;
        flex: 1;
      }

      :host(:not([collapsed])) #content {
        display: block;
        margin-top: 0;
        margin-left: 0;
        padding-left: 0.5rem;
      }

      /* Layout for expanded state: keeping header on left, content on right */
      :host(:not([collapsed])) {
        flex-direction: row;
      }

      :host(:not([collapsed])) #header {
        border-right: 1px solid #aaaaaa;
        height: 100%;
        justify-content: flex-start;
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: #ddd;
      }
    `;
    }

    render() {
        return html`
      <div id="header">
        <button @click="${this.toggle}">
          ${this.collapsed ? "+" : "-"}
        </button>
        <div id="title">Trace Viewer</div>
      </div>
      <div id="content">
        <p>Trace Viewer Content</p>
        <p>Here are some details.</p>
        <p>Showing captured traces.</p>
        <p>More information here.</p>
        <p>End of sample text.</p>
      </div>
    `;
    }
}
