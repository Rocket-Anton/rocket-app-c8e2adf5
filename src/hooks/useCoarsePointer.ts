import { useEffect, useState } from "react";

export function useCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsCoarse(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return isCoarse;
}
