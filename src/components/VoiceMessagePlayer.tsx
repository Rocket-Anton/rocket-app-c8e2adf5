import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  isUserMessage?: boolean;
}

export function VoiceMessagePlayer({ audioUrl, isUserMessage = false }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate waveform bars with varying heights
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const height = Math.sin(i * 0.5) * 0.4 + 0.6; // Wave pattern
    return height * 100;
  });

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isUserMessage 
            ? "bg-white/20 hover:bg-white/30 text-white" 
            : "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Container */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform Bars */}
        <div className="flex items-center gap-[1px] h-6 relative">
          {waveformBars.map((height, index) => {
            const isActive = (index / waveformBars.length) * 100 <= progress;
            return (
              <div
                key={index}
                className={cn(
                  "flex-1 rounded-full transition-all",
                  isUserMessage
                    ? isActive 
                      ? "bg-white" 
                      : "bg-white/30"
                    : isActive 
                      ? "bg-blue-500" 
                      : "bg-muted"
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Time Display */}
      <span className={cn(
        "text-xs flex-shrink-0 min-w-[35px] text-right",
        isUserMessage ? "text-white/80" : "text-muted-foreground"
      )}>
        {formatTime(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
}
