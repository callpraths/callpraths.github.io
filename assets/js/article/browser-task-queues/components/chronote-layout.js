import {
  LitElement,
  css,
  html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

export class ChronoteLayout extends LitElement {
  static get styles() {
    return css`
          :host {
            display: block;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
          }
          #container {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            width: 100%;
            height: 100%;
            padding: 0.5rem;
            border-width: 0.0625rem;
            border-radius: 0.25rem;
            border-color: #aaaaaa;
            border-style: solid;
            box-sizing: border-box;
          }
          #header {
            background: #ffffff;
            color: #181818;
            margin-block-start: unset;
            margin-block-end: 1rem;
            padding: 0.5rem;
            border-radius: 0.25rem;
          }
          #titlebar {
            display: flex;
            flex-direction: row;
          }
          #titlebar-buffer {
            flex-grow: 1;
            width: 1px;
          }
          #list {
            flex-grow: 1;
            flex-shrink: 1;
            height: 1px;
          }
          slot {
            display: inline-flex;
          }
          ::slotted(*) {
            width: 100%;
          }
        `;
  }

  render() {
    return html`
          <div id="container">
            <h3 id="header">2,147,483,647 Chronotes</h3>
            <div id="titlebar">
              <slot name="clock" id="clock"></slot>
              <div id="titlebar-buffer"></div>
              <slot name="status" id="status"></slot>
            </div>
            <slot name="editor"></slot>
            <slot name="list" id="list"></slot>
          </div>
        `;
  }
}
