import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Loader2, X, Mic, Square, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import rokkiAvatar from "@/assets/rokki-avatar.png";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

interface Message {
  role: "user" | "assistant";
  content: string;
  results?: any[];
  audioUrl?: string;
}

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
  onShowAddresses?: (addressIds: number[]) => void;
  onSetFilter?: (filters: { status?: string[]; street?: string; postalCode?: string; city?: string; houseNumber?: string }) => void;
  onClearFilters?: () => void;
  onTogglePolygon?: (enabled: boolean) => void;
  onNavigate?: (page: "laufliste" | "karte" | "dashboard") => void;
  showListsSidebar?: boolean;
}

export function AIAssistant({ open, onClose, onShowAddresses, onSetFilter, onClearFilters, onTogglePolygon, onNavigate, showListsSidebar = false }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Wie kann ich dir heute helfen?");
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const greetings = [
    "Wie kann ich dir heute helfen?",
    "Wie kann ich dir behilflich sein?",
    "Was kann ich für dich tun?",
    "Schön, dich wiederzusehen! Wie kann ich helfen?",
    "Hey! Was steht heute an?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Set random greeting when opening
  useEffect(() => {
    if (open && messages.length === 0) {
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      setGreeting(randomGreeting);
    }
  }, [open]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profile?.name) {
          const firstName = profile.name.split(' ')[0];
          setUserFirstName(firstName);
        }
      }
    };
    fetchProfile();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Setup audio analysis for visual feedback
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Monitor audio levels
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const normalizedLevel = Math.min(average / 128, 1);
        setAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Mikrofon konnte nicht aktiviert werden");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLocked(false);
      setSlideOffset(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      setIsLocked(false);
      setSlideOffset(0);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    setMessages((prev) => [...prev, { role: "user", content: "🎤 Sprachnachricht", audioUrl }]);
    setIsLoading(true);

    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const { data, error } = await supabase.functions.invoke("ai-address-assistant", {
          body: { audio: base64Audio },
        });

        if (error) throw error;

        console.log("AI Response:", data);

        if (data.type === "action") {
          // Handle action commands from AI
          const { action, parameters, message } = data;
          
          switch (action) {
            case "set_filter":
              if (onSetFilter) {
                onSetFilter({
                  status: parameters.status,
                  street: parameters.street,
                  postalCode: parameters.postal_code,
                  city: parameters.city,
                  houseNumber: parameters.house_number,
                });
              }
              break;
            case "clear_filters":
              if (onClearFilters) onClearFilters();
              break;
            case "toggle_polygon_draw":
              if (onTogglePolygon) onTogglePolygon(parameters.enabled);
              break;
            case "navigate_to":
              if (onNavigate) onNavigate(parameters.page);
              break;
          }

          setMessages((prev) => [...prev, { role: "assistant", content: message }]);
        } else if (data.type === "tool_result") {
          const resultCount = data.results?.length || 0;
          let responseText = data.message || `${resultCount} Adressen gefunden`;

          if (resultCount > 0) {
            responseText += `\n\n`;
            data.results.slice(0, 5).forEach((addr: any) => {
              const unitCount = addr.units?.length || 0;
              responseText += `• ${addr.street} ${addr.house_number}, ${addr.postal_code} ${addr.city} (${unitCount} Einheiten)\n`;
            });

            if (resultCount > 5) {
              responseText += `\n...und ${resultCount - 5} weitere`;
            }

            if (onShowAddresses) {
              const addressIds = data.results.map((r: any) => r.id);
              onShowAddresses(addressIds);
            }
          }

          setMessages((prev) => [...prev, { role: "assistant", content: responseText, results: data.results }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message || "Keine Antwort erhalten" }]);
        }
      };
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler bei der Kommunikation mit dem Assistenten");
      setMessages((prev) => [...prev, { role: "assistant", content: "Entschuldigung, es ist ein Fehler aufgetreten." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording) return;
    const currentY = e.touches[0].clientY;
    const diff = startYRef.current - currentY;
    
    if (diff > 80 && !isLocked) {
      setIsLocked(true);
      setSlideOffset(0);
    } else if (!isLocked) {
      setSlideOffset(Math.max(0, diff));
    }
  };

  const handleTouchEnd = () => {
    if (!isRecording) return;
    if (isLocked) return; // Keep recording if locked
    stopRecording();
  };

  const handleClick = () => {
    if (isLoading) return;
    
    if (isRecording) {
      // Stop and send
      stopRecording();
    } else {
      // Start recording
      startRecording();
      setIsLocked(true); // Auto-lock for desktop
    }
  };

  const sidebarOffset = showListsSidebar ? "right-[400px]" : "right-4";
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <>
      {/* 3D Floating Action Button */}
      {!open && (
        <button
          onClick={() => onClose()}
          className={cn(
            "fixed bottom-6 rounded-full shadow-2xl z-50 transition-all duration-300 hover:scale-110 group animate-in zoom-in overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
            sidebarOffset,
            isMobile ? "h-12 w-12" : "h-16 w-16"
          )}
          style={{
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.1)'
          }}
        >
          <img 
            src={rokkiAvatar} 
            alt="Rokki" 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </button>
      )}

      {/* Floating Chat Window */}
      {open && (
        <div className={cn(
          "fixed bottom-6 flex flex-col bg-background rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 fade-in duration-300",
          sidebarOffset,
          isMobile ? "w-[calc(100vw-2rem)] h-[70vh] max-w-sm" : "w-80 h-[420px]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-background rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-500/20">
                <img 
                  src={rokkiAvatar} 
                  alt="Rokki" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-semibold text-sm">
                  Rokki
                </h2>
                <p className="text-xs text-muted-foreground">Dein Rocket Assistent</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg mb-3 ring-2 ring-blue-500/20 hover-scale">
                  <img 
                    src={rokkiAvatar} 
                    alt="Rokki" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-sm mb-1">
                  {userFirstName ? `Hey ${userFirstName}! 👋` : "Hey! 👋"}
                </h3>
                <p className="text-xs text-muted-foreground px-4 mt-1">
                  Halte die Mikrofon-Taste gedrückt 🎤
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2 animate-in fade-in-50",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 mt-auto">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 max-w-[80%]",
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      )}
                    >
                      {msg.audioUrl ? (
                        <VoiceMessagePlayer 
                          audioUrl={msg.audioUrl} 
                          isUserMessage={msg.role === "user"}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="rounded-2xl px-3 py-2 bg-muted rounded-tl-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Voice Input - WhatsApp Style */}
          <div className="p-3 border-t bg-background rounded-b-2xl">
            <div className="relative flex items-center justify-center">
              
              <div className="relative">
                {!isLocked && isRecording && slideOffset > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <ChevronUp className={cn(
                      "h-6 w-6 text-blue-500 transition-opacity",
                      slideOffset > 40 ? "opacity-100" : "opacity-50"
                    )} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {slideOffset > 60 ? "Loslassen zum Sperren" : "Nach oben schieben"}
                    </span>
                  </div>
                )}
                
                <button
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={handleClick}
                  disabled={isLoading}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all select-none relative",
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-blue-500 hover:bg-blue-600",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    transform: !isLocked && isRecording 
                      ? `translateY(-${Math.min(slideOffset, 80)}px) scale(${1.1 + audioLevel * 0.4})` 
                      : isRecording 
                      ? `scale(${1 + audioLevel * 0.5})`
                      : 'scale(1)',
                    transition: isRecording ? 'transform 0.05s ease-out' : 'transform 0.3s ease-out'
                  }}
                >
                  {isRecording && (
                    <div 
                      className="absolute inset-0 rounded-full bg-red-400 animate-pulse"
                      style={{
                        opacity: audioLevel * 0.4,
                        transform: `scale(${1 + audioLevel * 0.3})`
                      }}
                    />
                  )}
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin relative z-10" />
                  ) : (
                    <Mic className="h-6 w-6 text-white relative z-10" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
