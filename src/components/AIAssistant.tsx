import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Loader2, X, Mic, Square, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import rokkiAvatar from "@/assets/rokki-avatar.png";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import confetti from "canvas-confetti";

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
  const [textInput, setTextInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewportRef.current) {
      const viewport = scrollViewportRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
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
    console.log("🎤 startRecording called, isLoading:", isLoading, "isRecording:", isRecording);
    
    if (isLoading) {
      console.log("⚠️ Cannot start recording - isLoading is true");
      return;
    }
    
    try {
      console.log("📱 Requesting microphone access...");
      
      // Sofort als "Recording" markieren für besseres UX
      setIsRecording(true);
      console.log("🔴 Recording UI started immediately");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("✅ Microphone access granted");
      
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
        console.log("⏹️ Recording stopped, processing audio...");
        // Stop audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("📦 Audio blob size:", audioBlob.size);
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      console.log("🎙️ MediaRecorder started");
    } catch (error) {
      console.error("❌ Error accessing microphone:", error);
      setIsRecording(false); // Zurücksetzen bei Fehler
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

  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    try {
      console.log("Sending text message...");
      
      // Add user message
      setMessages(prev => [...prev, { 
        role: "user", 
        content: text 
      }]);

      // Add loading message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Einen Moment... 🤔" 
      }]);

      setIsLoading(true);
      setTextInput("");
      
      const { data, error } = await supabase.functions.invoke('ai-address-assistant-v2', {
        body: { 
          text: text
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      console.log("Received response:", data);

      // Remove loading message
      setMessages(prev => prev.slice(0, -1));

      if (data.type === 'action') {
        const { action, parameters, message } = data;
        
        // Add assistant message with confirmation
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: message 
        }]);
        
        // Execute action
        setTimeout(() => {
          switch (action) {
            case 'set_filter':
              if (onSetFilter) onSetFilter(parameters);
              break;
            case 'clear_filters':
              if (onClearFilters) onClearFilters();
              break;
            case 'toggle_polygon_draw':
              if (onTogglePolygon) onTogglePolygon(parameters.enabled);
              break;
            case 'navigate_to':
              if (onNavigate) onNavigate(parameters.page);
              break;
            case 'close_chat':
              onClose();
              return;
            case 'goal_set':
              // Goal is already set in edge function
              break;
          }
          
          // Follow-up
          setTimeout(() => {
            setMessages(prev => [...prev, { role: "assistant", content: "Kann ich noch etwas für dich tun? 😊" }]);
          }, 800);
        }, 300);
      } else {
        // Add assistant text response
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message 
        }]);
        
        // Follow-up
        setTimeout(() => {
          setMessages(prev => [...prev, { role: "assistant", content: "Brauchst du noch was? 😊" }]);
        }, 800);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error sending text message:", error);
      setIsLoading(false);
      
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          role: "assistant", 
          content: "Entschuldigung, ich hatte ein Problem beim Verarbeiten deiner Nachricht. Versuche es bitte nochmal." 
        }
      ]);
      
      toast.error("Nachricht konnte nicht verarbeitet werden");
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    setMessages((prev) => [...prev, { role: "user", content: "🎤 Sprachnachricht", audioUrl }]);
    
    // Sofortige Reaktion
    setMessages((prev) => [...prev, { role: "assistant", content: "Einen Moment, ich höre mir deine Nachricht jetzt an... 👂" }]);
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

        // Die "Einen Moment" Nachricht bleibt stehen - keine Löschung!

        if (data.type === "action") {
          // Handle action commands from AI
          const { action, parameters, message } = data;
          
          // Bestätigungs-Nachricht anzeigen
          setMessages((prev) => [...prev, { role: "assistant", content: message }]);
          
          // Bei close_chat - Fenster schließen
          if (action === "close_chat") {
            setTimeout(() => {
              onClose(); // Chat schließen
            }, 1000);
            return;
          }
          
          // Dann Aktion ausführen
          setTimeout(() => {
            let confirmationMsg = "";
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
                // Persönliche Bestätigung
                if (parameters.status && parameters.status.length > 0) {
                  const statusLabels = parameters.status.map((s: string) => {
                    const labels: Record<string, string> = {
                      "offen": "offene",
                      "potenzial": "Potenzial",
                      "neukunde": "Neukunden",
                      "bestandskunde": "Bestandskunden",
                      "termin": "Termin",
                      "nicht-angetroffen": "nicht angetroffene",
                      "kein-interesse": "kein Interesse",
                      "karte-eingeworfen": "Karte eingeworfen"
                    };
                    return labels[s] || s;
                  }).join(", ");
                  confirmationMsg = `✅ Perfekt! Du siehst jetzt alle ${statusLabels} Adressen.`;
                } else {
                  confirmationMsg = "✅ Erledigt! Filter wurden angewendet.";
                }
                break;
              case "clear_filters":
                if (onClearFilters) onClearFilters();
                confirmationMsg = "✅ Alles klar! Alle Filter wurden zurückgesetzt.";
                break;
              case "toggle_polygon_draw":
                if (onTogglePolygon) onTogglePolygon(parameters.enabled);
                confirmationMsg = parameters.enabled 
                  ? "✅ Polygon-Zeichnen ist jetzt aktiviert! Zeichne einen Bereich auf der Karte." 
                  : "✅ Polygon-Modus deaktiviert.";
                break;
              case "navigate_to":
                if (onNavigate) onNavigate(parameters.page);
                const pageNames: Record<string, string> = {
                  "laufliste": "Laufliste",
                  "karte": "Karte",
                  "dashboard": "Dashboard"
                };
                confirmationMsg = `✅ Ich habe die ${pageNames[parameters.page]} für dich geöffnet!`;
                break;
            }
            
            setMessages((prev) => [...prev, { role: "assistant", content: confirmationMsg }]);
            
            // Folgefrage nach kurzer Pause
            setTimeout(() => {
              setMessages((prev) => [...prev, { role: "assistant", content: "Soll ich noch was für dich tun? 😊" }]);
            }, 800);
          }, 300);
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
          
          // Folgefrage
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: "assistant", content: "Brauchst du noch was? 😊" }]);
          }, 800);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message || "Keine Antwort erhalten" }]);
          
          // Folgefrage
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: "assistant", content: "Kann ich noch etwas für dich tun? 😊" }]);
          }, 800);
        }
      };
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler bei der Kommunikation mit dem Assistenten");
      setMessages((prev) => [...prev, { role: "assistant", content: "Entschuldigung, es ist ein Fehler aufgetreten. 😕" }]);
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
    console.log("👆 Button clicked! isLoading:", isLoading, "isRecording:", isRecording);
    
    if (isLoading) {
      console.log("⚠️ Button disabled - isLoading is true");
      return;
    }
    
    if (isRecording) {
      console.log("⏹️ Stopping recording...");
      // Stop and send
      stopRecording();
    } else {
      console.log("▶️ Starting recording...");
      // Start recording
      startRecording();
      setIsLocked(true); // Auto-lock for desktop
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarOffset = showListsSidebar ? "right-[400px]" : "right-6";
  
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
          <ScrollArea className="flex-1 px-3" ref={scrollViewportRef}>
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

          {/* Input Area - Text + Voice */}
          <div className="p-3 border-t bg-background rounded-b-2xl">
            <div className="flex items-center gap-2">
              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault();
                      sendTextMessage(textInput);
                    }
                  }}
                  placeholder="Nachricht eingeben..."
                  disabled={isLoading || isRecording}
                  className="w-full h-11 px-4 pr-10 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                />
                {textInput.trim() && !isRecording && (
                  <button
                    onClick={() => sendTextMessage(textInput)}
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Voice Input Button */}
              <div className="relative flex-shrink-0">
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
