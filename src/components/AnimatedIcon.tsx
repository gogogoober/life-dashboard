import { useRef, useEffect, useState } from "react";
import { Player } from "@lordicon/react";

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
    loader()
      .then((mod) => setData(mod.default))
      .catch(() => setError(true));
  }, [hash]);

  return { data, error };
}

interface AnimatedIconProps {
  iconHash: string;
  size: number;
  primary?: string;
  secondary?: string;
  animateOn: "load" | "hover" | "click";
  pauseFor?: number;
}

export function AnimatedIcon({
  iconHash,
  size,
  primary,
  secondary,
  animateOn,
  pauseFor,
}: AnimatedIconProps) {
  const playerRef = useRef<Player>(null);
  const { data: iconData, error } = useIconData(iconHash);

  const play = () => playerRef.current?.playFromBeginning();

  const colorProps = secondary
    ? { colors: `primary:${primary},secondary:${secondary}` }
    : { colorize: primary };

  if (!iconData) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: error ? "#f44" : "#555",
          fontSize: 12,
        }}
      >
        {error ? "err" : "..."}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      onMouseEnter={animateOn === "hover" ? play : undefined}
      onClick={animateOn === "click" ? play : undefined}
    >
      <Player
        ref={playerRef}
        icon={iconData}
        size={size}
        {...colorProps}
        onReady={animateOn === "load" ? play : undefined}
        onComplete={
          animateOn === "load" && pauseFor != null
            ? () => {
                setTimeout(play, pauseFor);
              }
            : undefined
        }
      />
    </div>
  );
}
