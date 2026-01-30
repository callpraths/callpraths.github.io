import {
    LitElement,
    css,
    html,
} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

import { SetTimeoutNoteStore } from "../store/set-timeout-note-store.js";
import { SetTimeoutByPartsNoteStore } from "../store/set-timeout-by-parts-note-store.js";
import { AwaitedPromiseNoteStore } from "../store/awaited-promise-note-store.js";
import { UnawaitedPreparedPromiseNoteStore } from "../store/unawaited-prepared-promise-note-store.js";
import { UnawaitedPromiseNoteStore } from "../store/unawaited-promise-note-store.js";
import { UnawaitedFinalizedPromiseNoteStore } from "../store/unawaited-finalized-promise-note-store.js";
import { InstantNoteStore } from "../store/instant-note-store.js";
import { SyncNoteStore } from "../store/sync-note-store.js";

export class Chronote extends LitElement {
    static get properties() {
        return {
            // store: 'setTimeout' | 'setTimeoutByParts' | 'awaitedPromise'
            store: { type: String },
            // Only effective when store === 'setTimeoutByParts'.
            parts: { type: Number },
            // Status: 'ready' | 'saving'
            status: { type: String, state: true },
            // notes: [{ timestamp: Date, text: String }]
            notes: { type: Array, state: true },
        };
    }

    constructor() {
        super();
    }

    // No styles in this component.
    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();
        this.status = "ready";
        this.notes = [];
    }

    attributeChangedCallback(name, old, value) {
        super.attributeChangedCallback(name, old, value);

        switch (name) {
            case "store":
                switch (value) {
                    case "instant":
                        this.noteStore = new InstantNoteStore(this);
                        break;
                    case "sync":
                        this.noteStore = new SyncNoteStore(this);
                        break;
                    case "setTimeout":
                        this.noteStore = new SetTimeoutNoteStore(this);
                        break;
                    case "setTimeoutByParts":
                        this.noteStore = new SetTimeoutByPartsNoteStore(
                            this.parts ?? 1
                        );
                        break;
                    case "awaitedPromise":
                        this.noteStore = new AwaitedPromiseNoteStore(this);
                        break;
                    case "unawaitedPreparedPromise":
                        this.noteStore = new UnawaitedPreparedPromiseNoteStore(this);
                        break;
                    case "unawaitedPromise":
                        this.noteStore = new UnawaitedPromiseNoteStore(this);
                        break;
                    case "unawaitedFinalizedPromise":
                        this.noteStore = new UnawaitedFinalizedPromiseNoteStore(this);
                        break;
                }
                break;
            case "parts":
                if (this.store === "setTimeoutByParts") {
                    this.noteStore = new SetTimeoutByPartsNoteStore(this, this.parts ?? 1);
                }
                break;
        }
    }

    addNote(event) {
        const text = event.detail.note;
        this.notes = [{ timestamp: new Date(), text }, ...this.notes];
        this.saveNotes(this.notes);
    }

    async saveNotes() {
        this.status = "saving";
        await this.noteStore.save();
        this.status = "ready";
    }

    render() {
        return html`
          <x-chronote-layout>
            <x-chronote-clock slot="clock"></x-chronote-clock>
            <x-chronote-status
              slot="status"
              status="${this.status}"
            ></x-chronote-status>
            <x-chronote-editor
              slot="editor"
              @x-chronote-add="${this.addNote}"
            ></x-chronote-editor>
            <x-chronote-list slot="list">
              ${this.notes.map(
            (note) => html`
                  <x-chronote-item .timestamp=${note.timestamp}
                    >${note.text}</x-chronote-item
                  >
                `
        )}
            </x-chronote-list>
          </x-chronote-layout>
        `;
    }
}
