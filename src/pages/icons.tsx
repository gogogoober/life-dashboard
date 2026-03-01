import { useRef, useEffect, useState, useMemo } from "react";
import { Player } from "@lordicon/react";
import iconRegistry from "../assets/icons/icon-registry.json";

type IconEntry = { hash: string; name: string; tags: string[] };

const ALL_ICONS: IconEntry[] = Object.entries(
  iconRegistry as Record<string, { name: string; tags: string[] }>
).map(([hash, { name, tags }]) => ({ hash, name, tags }));

const iconModules = import.meta.glob<{ default: object }>(
  "../assets/icons/lordicon/*.json"
);

function useIconData(hash: string): { data: object | null; error: boolean } {
  const [data, setData] = useState<object | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    const key = `../assets/icons/lordicon/${hash}.json`;
    const loader = iconModules[key];
    if (!loader) {
      setError(true);
      return;
    }
    loader().then((mod) => setData(mod.default)).catch(() => setError(true));
  }, [hash]);

  return { data, error };
}

function IconCard({ hash, name, tags }: IconEntry) {
  const playerRef = useRef<Player>(null);
  const { data: iconData, error } = useIconData(hash);

  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
      }}
      onClick={() => playerRef.current?.playFromBeginning()}
    >
      {iconData ? (
        <Player
          ref={playerRef}
          icon={iconData}
          size={64}
          colorize="#ffffff"
          onReady={() => playerRef.current?.playFromBeginning()}
          onComplete={() => {
            setTimeout(() => playerRef.current?.playFromBeginning(), 2000);
          }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: error ? "#f44" : "#555",
            fontSize: 12,
          }}
        >
          {error ? "err" : "..."}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: "#666", fontFamily: "monospace" }}>
        {hash}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "center",
          marginTop: 4,
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 9,
              color: "#8a8aff",
              background: "rgba(138,138,255,0.1)",
              border: "1px solid rgba(138,138,255,0.2)",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 60;

export default function IconsPage() {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ICONS;
    const q = search.toLowerCase().trim();
    return ALL_ICONS.filter(
      (icon) =>
        icon.name.toLowerCase().includes(q) ||
        icon.hash.includes(q) ||
        icon.tags.some((t) => t.includes(q))
    );
  }, [search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div style={{ padding: 32, background: "#0a0a1a", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff", fontSize: 24, marginBottom: 8 }}>
        Lordicon Library
      </h1>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
        {filtered.length} of {ALL_ICONS.length} icons. Click to replay
        animation.
      </p>
      <input
        type="text"
        placeholder="Search by name, hash, or tag…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "8px 12px",
          marginBottom: 24,
          background: "#1a1a2e",
          border: "1px solid #333",
          borderRadius: 6,
          color: "#fff",
          fontSize: 14,
          outline: "none",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map((icon) => (
          <IconCard
            key={icon.hash}
            hash={icon.hash}
            name={icon.name}
            tags={icon.tags}
          />
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            style={{
              padding: "8px 24px",
              background: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
