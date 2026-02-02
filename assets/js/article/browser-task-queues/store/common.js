// Use an odd number so that latency is visually different from the faster
// `preapre` and `finalize` calls.
const TIME_TO_BLOCK_MS = 1133;

const PREP_FINALIZE_BLOCK_MS = 97;

// "compress" the notes.
//
// This function spins for 2 seconds to simulate the notes being compressed
// before being saved.
// This delay is what is hidden from the user / interrupts the user / freezes
// the UI, based on how the UI waits for compression to finish.
export function compress(notes) {
    const start = new Date();
    while (new Date() - start < TIME_TO_BLOCK_MS) { }
}

// A simulation method similar to `compress`.
//
// In this case, compression "happens" in parts,
// by waiting for the overall wasted time fractionally in steps.
export function compressParts(notes, parts, _i) {
    const start = new Date();
    while (new Date() - start < TIME_TO_BLOCK_MS / parts) { }
}

export async function prepare(notes) {
    return new Promise(resolve => {
        const start = new Date();
        while (new Date() - start < PREP_FINALIZE_BLOCK_MS) { }
        resolve();
    });
}

export async function finalize(notes) {
    return new Promise(resolve => {
        const start = new Date();
        while (new Date() - start < PREP_FINALIZE_BLOCK_MS) { }
        resolve();
    });
}