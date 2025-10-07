import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Loader2, X, Mic, Square, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
  results?: any[];
}

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
  onShowAddresses?: (addressIds: number[]) => void;
}

export function AIAssistant({ open, onClose, onShowAddresses }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const { state } = useSidebar();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
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
    setMessages((prev) => [...prev, { role: "user", content: "🎤 Sprachnachricht" }]);
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

        if (data.type === "tool_result") {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    startRecording();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRecording) return;
    const currentY = e.clientY;
    const diff = startYRef.current - currentY;
    
    if (diff > 80 && !isLocked) {
      setIsLocked(true);
      setSlideOffset(0);
    } else if (!isLocked) {
      setSlideOffset(Math.max(0, diff));
    }
  };

  const handleMouseUp = () => {
    if (!isRecording) return;
    if (isLocked) return;
    stopRecording();
  };

  const sidebarOffset = state === "collapsed" ? "right-6" : "right-[calc(1.5rem+14rem)]";
  
  return (
    <>
      {/* 3D Floating Action Button */}
      {!open && (
        <button
          onClick={() => onClose()}
          className={cn(
            "fixed bottom-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50 group animate-in zoom-in",
            sidebarOffset
          )}
          style={{
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.1), inset 0 -5px 15px rgba(0, 0, 0, 0.2), inset 0 5px 15px rgba(255, 255, 255, 0.3)'
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Bot className="h-6 w-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
          </div>
        </button>
      )}

      {/* Floating Chat Window */}
      {open && (
        <div className={cn(
          "fixed bottom-6 w-80 h-[420px] flex flex-col bg-background rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 fade-in duration-300",
          sidebarOffset
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-background rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">
                  {userFirstName ? `Hey ${userFirstName}!` : "Rocket Assistent"}
                </h2>
                <p className="text-xs text-muted-foreground">Bereit zu helfen</p>
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2 shadow">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Wie kann ich helfen?</h3>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                  Halte die Mikrofon-Taste gedrückt und stelle deine Frage
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
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
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
              {isLocked && isRecording && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 flex flex-col items-center gap-2">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs">
                    Aufnahme läuft...
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-lg transition-colors"
                  >
                    <Square className="h-5 w-5 text-white fill-white" />
                  </button>
                </div>
              )}
              
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
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  disabled={isLoading}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all select-none",
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 scale-110" 
                      : "bg-blue-500 hover:bg-blue-600",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    transform: !isLocked && isRecording ? `translateY(-${Math.min(slideOffset, 80)}px) scale(1.1)` : undefined
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Mic className="h-6 w-6 text-white" />
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
