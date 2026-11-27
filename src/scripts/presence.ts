// live discord presence via lanyard (https://github.com/phineas/lanyard).
// one shared websocket for the whole page; components subscribe with
// onPresence(). when there's no data (id unset, not tracked, lanyard down)
// subscribers get null and should fall back to their static behavior.

export const DISCORD_ID = "338232948237139981";

export interface Activity {
    type: number;
    name: string;
    details?: string | null;
    state?: string | null;
    application_id?: string;
}

export interface Spotify {
    track_id: string | null;
    timestamps: { start: number; end: number };
    song: string;
    artist: string;
    album: string;
    album_art_url: string | null;
}

export interface Presence {
    discord_status: "online" | "idle" | "dnd" | "offline";
    active_on_discord_desktop: boolean;
    active_on_discord_mobile: boolean;
    listening_to_spotify: boolean;
    spotify: Spotify | null;
    activities: Activity[];
    // lanyard's public key-value store, set from discord with /set
    kv?: Record<string, string>;
}

type Listener = (p: Presence | null) => void;

const SOCKET = "wss://api.lanyard.rest/socket";
const MAX_RETRIES = 6;

const listeners = new Set<Listener>();
let latest: Presence | null = null;
let started = false;

function emit(p: Presence | null): void {
    latest = p;
    listeners.forEach((fn) => fn(p));
}

function connect(retries = 0): void {
    let heartbeat: number | undefined;
    let ws: WebSocket;
    try {
        ws = new WebSocket(SOCKET);
    } catch {
        return;
    }

    ws.addEventListener("message", (e) => {
        let msg: { op: number; t?: string; d?: any };
        try {
            msg = JSON.parse(e.data);
        } catch {
            return;
        }

        if (msg.op === 1) {
            // hello: subscribe, then keep the connection alive
            ws.send(
                JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }),
            );
            heartbeat = window.setInterval(() => {
                if (ws.readyState === WebSocket.OPEN)
                    ws.send(JSON.stringify({ op: 3 }));
            }, msg.d?.heartbeat_interval ?? 30_000);
            retries = 0;
        } else if (
            msg.op === 0 &&
            (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")
        ) {
            // an untracked id comes back as an empty object
            emit(msg.d?.discord_status ? (msg.d as Presence) : null);
        }
    });

    ws.addEventListener("close", () => {
        window.clearInterval(heartbeat);
        // keep showing the last presence through a brief reconnect; only
        // give up (and fall back) once retries run out
        if (retries >= MAX_RETRIES) {
            emit(null);
            return;
        }
        const delay = Math.min(30_000, 1000 * 2 ** retries);
        window.setTimeout(() => connect(retries + 1), delay);
    });
}

export function onPresence(fn: Listener): void {
    listeners.add(fn);
    if (latest) fn(latest);
    if (!started && DISCORD_ID) {
        started = true;
        connect();
    }
}

const KV_CACHE = "lanyard-kv";

export function onKV(fn: (kv: Record<string, string>) => void): void {
    if (!DISCORD_ID) return;
    try {
        const cached = localStorage.getItem(KV_CACHE);
        if (cached) fn(JSON.parse(cached));
    } catch {}

    onPresence((p) => {
        if (!p) return;
        const kv = p.kv ?? {};
        try {
            localStorage.setItem(KV_CACHE, JSON.stringify(kv));
        } catch {}
        fn(kv);
    });
}

export function kvText(value: unknown, max: number): string | null {
    if (typeof value !== "string") return null;
    const s = value.replace(/\s+/g, " ").trim();
    if (!s) return null;
    return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// dev only: preview any state from the console, e.g.
// __presence({ discord_status: "online", activities: [], ... })
if (import.meta.env.DEV) (window as any).__presence = emit;
