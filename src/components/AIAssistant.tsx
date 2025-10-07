import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, Loader2, X, Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Fehler bei der Spracherkennung");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Spracherkennung wird nicht unterstützt");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-address-assistant", {
        body: { message: userMessage },
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

          // Show addresses on map
          if (onShowAddresses) {
            const addressIds = data.results.map((r: any) => r.id);
            onShowAddresses(addressIds);
          }
        }

        const assistantMessage = {
          role: "assistant" as const,
          content: responseText,
          results: data.results,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        speakText(responseText);
      } else {
        const assistantMessage = {
          role: "assistant" as const,
          content: data.message || "Keine Antwort erhalten",
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        speakText(assistantMessage.content);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler bei der Kommunikation mit dem KI-Assistenten");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">KI-Assistent</h2>
              <p className="text-xs text-muted-foreground">
                {isListening ? "Ich höre zu..." : isSpeaking ? "Ich spreche..." : "Bereit zu helfen"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-xl mb-3">Wie kann ich helfen?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Stelle mir Fragen zu deinen Adressen per Text oder Sprache
              </p>
              <div className="grid grid-cols-1 gap-3 w-full max-w-md">
                {[
                  "Zeige mir alle Adressen in der Hauptstraße",
                  "Welche Adressen haben Status Potenzial?",
                  "Suche Adressen mit PLZ 51063",
                  "Zeige alle Neukundenadressen"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(example)}
                    className="text-sm text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-primary/20"
                  >
                    💬 {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[75%] shadow-sm",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                        : "bg-muted/80 backdrop-blur-sm"
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in-50">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-muted/80">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-6 border-t bg-background/50 backdrop-blur-sm">
          <div className="flex gap-2">
            <Button
              onClick={toggleListening}
              size="icon"
              variant={isListening ? "default" : "outline"}
              className={cn(
                "h-11 w-11 flex-shrink-0 transition-all",
                isListening && "animate-pulse shadow-lg shadow-primary/50"
              )}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Stelle eine Frage oder nutze das Mikrofon..."
              disabled={isLoading || isListening}
              className="flex-1 h-11 bg-background/50"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 flex-shrink-0 shadow-md"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
