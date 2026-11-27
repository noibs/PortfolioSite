// evens out the right edge of a ragged paragraph.
//
// long unbreakable words (like the email address) can leave the line before
// them visibly short. browsers don't fix that for long paragraphs:
// text-wrap: pretty only guards the last line, and text-wrap: balance gives
// up past a handful of lines. so: try the paragraph at its full width and a
// few slightly narrower widths, and keep whichever leaves the line endings
// most even. the left edge never moves, only where lines break.

const STEPS = 10; // try up to 10 narrower widths...
const STEP = 0.008; // ...each 0.8% narrower, so at most 8% in total
const NARROWING_COST = 0.004; // prefer full width unless it's clearly worse

interface Line {
    mid: number;
    right: number;
}

function lines(p: HTMLElement): Line[] {
    const out: Line[] = [];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node: Node | null;
    while ((node = walker.nextNode())) {
        // tooltip cards, hidden sentences and screen-reader text aren't
        // part of the visible paragraph
        if (node.parentElement?.closest(".card, [hidden], .sr-only")) continue;
        if (!node.textContent?.trim()) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
            if (r.width === 0) continue;
            const mid = r.top + r.height / 2;
            const line = out.find((l) => Math.abs(l.mid - mid) < r.height / 2);
            if (line) line.right = Math.max(line.right, r.right);
            else out.push({ mid, right: r.right });
        }
    }
    return out.sort((a, b) => a.mid - b.mid);
}

// lower is better: squared gaps at the end of every line but the last,
// plus a penalty if the last line ends up nearly empty
function score(p: HTMLElement, width: number): number {
    const left = p.getBoundingClientRect().left;
    const ls = lines(p);
    if (ls.length < 2) return 0;
    let s = 0;
    for (const l of ls.slice(0, -1)) s += (1 - (l.right - left) / width) ** 2;
    if ((ls.at(-1)!.right - left) / width < 0.2) s += 1;
    return s;
}

export function evenRag(p: HTMLElement): void {
    p.style.maxWidth = "";
    const full = p.getBoundingClientRect().width;
    if (!full) return;

    let best = { width: full, score: score(p, full) };
    for (let k = 1; k <= STEPS; k++) {
        const width = full * (1 - k * STEP);
        p.style.maxWidth = `${width}px`;
        const s = score(p, width) + k * NARROWING_COST;
        if (s < best.score) best = { width, score: s };
    }
    p.style.maxWidth = best.width < full ? `${best.width}px` : "";
}

// keeps a paragraph evened as the window resizes and once the web font
// (whose widths differ from the fallback's) has loaded. returns a function
// to re-run it by hand, e.g. after the text changes
export function keepRagEven(p: HTMLElement): () => void {
    let frame = 0;
    const run = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => evenRag(p));
    };
    evenRag(p);
    document.fonts?.ready.then(run);
    window.addEventListener("resize", run);
    return run;
}
