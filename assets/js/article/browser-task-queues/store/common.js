const TIME_TO_BLOCK_MS = 2000;

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
        while (new Date() - start < 100) { }
        resolve();
    });
}
