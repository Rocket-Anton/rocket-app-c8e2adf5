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
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-end justify-center">
      <img
        src={rocketIcon}
        alt="Rocket"
        className="w-20 h-20 animate-rocket-launch"
        style={{
          animation: "rocketLaunch 3s ease-out forwards"
        }}
      />
    </div>
  );
};
