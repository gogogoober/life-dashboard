import { useRef, useEffect, useState } from "react";
import { Player } from "@lordicon/react";

const ICONS = [
  { hash: "lewtedlh", name: "cup-prize" },
  { hash: "surcxhka", name: "location-pin" },
  { hash: "jeuxydnh", name: "home" },
  { hash: "vpbspaec", name: "envelope-send" },
  { hash: "gmzxduhd", name: "home (outline)" },
  { hash: "wxnxiano", name: "book-morph" },
  { hash: "tdrtiskw", name: "error" },
  { hash: "puvaffet", name: "edit-document" },
  { hash: "msoeawqm", name: "magnifier-zoom-search" },
  { hash: "gqjpawbc", name: "confetti" },
  { hash: "dxjqoygy", name: "avatar" },
  { hash: "axteoudt", name: "help-center" },
  { hash: "yxczfiyc", name: "info" },
  { hash: "zpxybbhl", name: "consultation" },
  { hash: "fpmskzsv", name: "folder" },
  { hash: "egmlnyku", name: "consultation (wired)" },
  { hash: "sbiheqdr", name: "tool" },
  { hash: "yeallgsa", name: "savings-pig" },
  { hash: "nkmsrxys", name: "gift" },
  { hash: "rjzlnunf", name: "love-heart" },
  { hash: "pbrgppbb", name: "shopping" },
  { hash: "rhvddzym", name: "envelope-mail-send" },
  { hash: "qhkvfxpn", name: "trending-up" },
  { hash: "imamsnbq", name: "avatar-man-nodding" },
  { hash: "vfzqittk", name: "cross" },
  { hash: "zsaomnmb", name: "bar-chart" },
  { hash: "wpyrrmcq", name: "trash" },
  { hash: "xfzuyvam", name: "avatar (wired)" },
  { hash: "fqbvgezn", name: "demand" },
  { hash: "jdalicnn", name: "personal (current)" },
];

function IconCard({ hash, name }: { hash: string; name: string }) {
  const playerRef = useRef<Player>(null);
  const [iconData, setIconData] = useState<object | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`https://cdn.lordicon.com/${hash}.json`)
      .then((r) => r.json())
      .then(setIconData)
      .catch(() => setError(true));
  }, [hash]);

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
        />
      ) : (
        <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: error ? "#f44" : "#555", fontSize: 12 }}>
          {error ? "err" : "..."}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>{name}</div>
      <div style={{ fontSize: 9, color: "#666", fontFamily: "monospace" }}>{hash}</div>
    </div>
  );
}

export default function IconsPage() {
  return (
    <div style={{ padding: 32, background: "#0a0a1a", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff", fontSize: 24, marginBottom: 8 }}>Lordicon Library</h1>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
        {ICONS.length} icons found. Click to replay animation.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        {ICONS.map((icon) => (
          <IconCard key={icon.hash} hash={icon.hash} name={icon.name} />
        ))}
      </div>
    </div>
  );
}
