import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, Loader2, X } from "lucide-react";
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

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: responseText,
            results: data.results,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || "Keine Antwort erhalten",
          },
        ]);
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
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent side="left" className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              KI-Assistent
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Frage mich nach Adressen oder filtere nach Status
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 mt-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-2">Wie kann ich helfen?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Versuche Fragen wie:
              </p>
              <div className="text-sm text-muted-foreground text-left space-y-2 bg-muted/30 rounded-lg p-4">
                <p>• "Zeige mir alle Adressen in der Hauptstraße"</p>
                <p>• "Welche Adressen haben Status Potenzial?"</p>
                <p>• "Suche Adressen mit PLZ 51063"</p>
                <p>• "Zeige alle Neukundenadressen"</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Stelle eine Frage..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
