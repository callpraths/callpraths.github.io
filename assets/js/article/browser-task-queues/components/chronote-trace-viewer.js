import {
  LitElement,
  css,
  html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteTraceViewer extends LitElement {
  static get properties() {
    return {
      target: { type: String },
      collapsed: { type: Boolean, reflect: true, attribute: "collapsed" },
      logLength: { type: Number, state: true },
    };
  }

  constructor() {
    super();
    this.log = [];
    this.collapsed = true;
    this.logLength = 0;
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
        margin-top: -2rem;
        padding: 0.5rem;
        display: none;
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #ffffff transparent;
      }

      #content::-webkit-scrollbar {
        width: 0.5rem;
      }

      #content::-webkit-scrollbar-track {
        background: transparent;
      }

      #content::-webkit-scrollbar-thumb {
        background-color: #ffffff;
        border-radius: 0.25rem;
        border: 2px solid transparent;
        background-clip: content-box;
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
    this.maybeUpdateEventListener();
    return html`
      <div id="header">
        <button @click="${this.toggle}">
          ${this.collapsed ? "+" : "-"}
        </button>
        <div id="title">Trace Viewer</div>
      </div>
      <div id="content">
        ${this.renderContent()}
      </div>
    `;
  }

  renderContent() {
    if (this.logLength === 0) {
      return html`<p>No traces captured yet.</p>`;
    }
    return html`
      ${this.log.map((log) => html`<p>${log}</p>`)}
    `;
  }

  maybeUpdateEventListener() {
    if (this.target === this.oldTarget) {
      return;
    }
    if (this.oldTarget) {
      const target = document.getElementById(this.oldTarget);
      if (target) {
        target.remoteEventListener("trace-log", (ev) => {
          if (this.collapsed) {
            return;
          }
          const { log } = ev.detail;
          this.log.push(log);
          this.logLength = this.log.length;
        });
        target.remoteEventListener("trace-new", (ev) => {
          if (this.collapsed) {
            return;
          }
          this.log = [];
          this.logLength = 0;
        });
      }
    }

    const target = document.getElementById(this.target);
    if (target) {
      target.addEventListener("trace-log", (ev) => {
        if (this.collapsed) {
          return;
        }
        const { log } = ev.detail;
        this.log.push(log);
        this.logLength = this.log.length;
      });
      target.addEventListener("trace-new", (ev) => {
        if (this.collapsed) {
          return;
        }
        this.log = [];
        this.logLength = 0;
      });
    }
    this.oldTarget = this.target;
  }
}
