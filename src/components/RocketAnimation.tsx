import { useEffect, useState } from "react";
import rocketIcon from "@/assets/rocket-icon-transparent.png";

interface RocketAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

export const RocketAnimation = ({ show, onComplete }: RocketAnimationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      console.log("🚀 Raketen-Animation gestartet!");
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-[10001] w-32 h-32">
      <img
        src={rocketIcon}
        alt="Rocket"
        className="w-full h-full object-contain animate-rocket-launch"
      />
    </div>
  );
};
