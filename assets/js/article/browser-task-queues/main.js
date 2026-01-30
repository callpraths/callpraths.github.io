
import { ChronoteLayout } from "./components/chronote-layout.js";
import { Chronote } from "./components/chronote.js";
import { ChronoteStatus } from "./components/chronote-status.js";
import { ChronoteItem } from "./components/chronote-item.js";
import { ChronoteList } from "./components/chronote-list.js";
import { ChronoteEditor } from "./components/chronote-editor.js";
import { ChronoteClock } from "./components/chronote-clock.js";
import { ChronoteLatency } from "./components/chronote-latency.js";
import { ChronoteContainer } from "./components/chronote-container.js";

function defineComponents() {
  window.customElements.define("x-chronote-status", ChronoteStatus);
  window.customElements.define("x-chronote-item", ChronoteItem);
  window.customElements.define("x-chronote-list", ChronoteList);
  window.customElements.define("x-chronote-editor", ChronoteEditor);
  window.customElements.define("x-chronote-clock", ChronoteClock);
  window.customElements.define("x-chronote-layout", ChronoteLayout);
  window.customElements.define("x-chronote", Chronote);
  window.customElements.define("x-chronote-container", ChronoteContainer);
  window.customElements.define("x-chronote-latency", ChronoteLatency);
}

defineComponents();