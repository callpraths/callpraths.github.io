import { compressParts } from "./common.js";

export class SetTimeoutByPartsNoteStore {
    constructor(parts) {
        this.parts = parts;
        this.saveTimerHandles = new Array(parts);
    }
    async save(notes) {
        this.saveTimerHandles.forEach(
            (handle) => handle && clearTimeout(handle)
        );

        return Promise.all(
            [...Array(this.parts).keys()].map(
                (i) =>
                    new Promise((resolve) => {
                        this.saveTimerHandles[i] = setTimeout(() => {
                            compressParts(notes, this.parts, i);
                            this.saveTimerHandles[i] = undefined;
                            resolve();
                        }, 0);
                    })
            )
        );
    }
}

