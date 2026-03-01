import { useRef, useMemo, useEffect } from "react";
import { Player } from "@lordicon/react";

const iconModules = import.meta.glob<{ default: object }>(
  "../assets/icons/lordicon/*.json",
  { eager: true }
);

function useIconData(hash: string): { data: object | null; error: boolean } {
  return useMemo(() => {
    const key = `../assets/icons/lordicon/${hash}.json`;
    const mod = iconModules[key];
    if (!mod) return { data: null, error: true };
    return { data: mod.default, error: false };
  }, [hash]);
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
  iconHash = "wghpqwxd",
  size = 48,
  primary = "#4f6ee2",
  secondary = "#364579",
  animateOn = "load",
  pauseFor = 2000,
}: AnimatedIconProps) {
  const playerRef = useRef<Player>(null);
  const { data: iconData, error } = useIconData(iconHash);

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

  // Trigger first play after mount — onReady doesn't fire reliably
  useEffect(() => {
    if (animateOn === "load") {
      requestAnimationFrame(() => {
        playerRef.current?.playFromBeginning();
      });
    }
  }, [animateOn]);

  return (
    <div
      style={{ width: size, height: size }}
      onMouseEnter={
        animateOn === "hover"
          ? () => playerRef.current?.playFromBeginning()
          : undefined
      }
      onClick={
        animateOn === "click"
          ? () => playerRef.current?.playFromBeginning()
          : undefined
      }
    >
      <Player
        ref={playerRef}
        icon={iconData}
        size={size}
        {...colorProps}
        onComplete={
          animateOn === "load"
            ? () => {
                setTimeout(
                  () => playerRef.current?.playFromBeginning(),
                  pauseFor
                );
              }
            : undefined
        }
      />
    </div>
  );
}
