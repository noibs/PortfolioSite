// centering a card on its trigger can push it past a viewport edge on
// narrow screens. before each open, measure and store the nudge needed to
// keep it fully visible (with a small margin) in --shift-x, which the card's
// transform in global.css adds to its centering offset.
const MARGIN = 12;

export function place(card: HTMLElement): void {
    card.style.setProperty("--shift-x", "0px");
    const r = card.getBoundingClientRect();
    let shift = 0;
    if (r.left < MARGIN) shift = MARGIN - r.left;
    else if (r.right > window.innerWidth - MARGIN)
        shift = window.innerWidth - MARGIN - r.right;
    if (shift) card.style.setProperty("--shift-x", `${shift}px`);
}
