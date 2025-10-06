import { Check } from "lucide-react";

interface OrderCounterProps {
  count: number;
}

export const OrderCounter = ({ count }: OrderCounterProps) => {
  // Bestimme Farbe und Style basierend auf Count
  const getCardStyle = () => {
    if (count === 0) {
      return {
        borderColor: "border-red-500",
        bgColor: "bg-red-50 dark:bg-red-950/20",
        textColor: "text-red-600 dark:text-red-400",
        iconBg: "bg-red-500",
        shimmer: false,
        emoji: null
      };
    } else if (count <= 2) {
      return {
        borderColor: "border-yellow-500",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
        textColor: "text-yellow-600 dark:text-yellow-400",
        iconBg: "bg-yellow-500",
        shimmer: false,
        emoji: null
      };
    } else if (count <= 5) {
      return {
        borderColor: "border-green-500",
        bgColor: "bg-green-50 dark:bg-green-950/20",
        textColor: "text-green-600 dark:text-green-400",
        iconBg: "bg-green-500",
        shimmer: false,
        emoji: null
      };
    } else if (count < 10) {
      return {
        borderColor: "border-gray-400",
        bgColor: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
        textColor: "text-gray-700 dark:text-gray-300",
        iconBg: "bg-gray-500",
        shimmer: true,
        shimmerColor: "silver",
        emoji: "🤩"
      };
    } else {
      return {
        borderColor: "border-yellow-600",
        bgColor: "bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-900/40",
        textColor: "text-yellow-700 dark:text-yellow-400",
        iconBg: "bg-yellow-600",
        shimmer: true,
        shimmerColor: "gold",
        emoji: "🏆"
      };
    }
  };

  const style = getCardStyle();

  return (
    <div className="relative">
      <div
        className={`relative rounded-lg border-2 ${style.borderColor} ${style.bgColor} p-4 overflow-hidden transition-all duration-300`}
      >
        {/* Shimmer Effect */}
        {style.shimmer && (
          <div
            className={`absolute inset-0 ${
              style.shimmerColor === "gold"
                ? "bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent animate-shimmer-gold"
                : "bg-gradient-to-r from-transparent via-gray-300/30 to-transparent animate-shimmer-silver"
            }`}
            style={{
              animation: style.shimmerColor === "gold" 
                ? "shimmer 2s infinite" 
                : "shimmer 2.5s infinite"
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[100px]">
          <div className={`text-4xl font-bold ${style.textColor} mb-1`}>
            {count}
          </div>
          <div className={`text-sm font-medium ${style.textColor}`}>
            Aufträge heute
          </div>
        </div>

        {/* Icon unten rechts */}
        <div className="absolute bottom-2 right-2">
          {style.emoji ? (
            <div className="text-2xl">{style.emoji}</div>
          ) : (
            <div className={`${style.iconBg} rounded-full p-1.5`}>
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
