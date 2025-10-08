import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, StopCircle, Loader2, Wand2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TenderInfoGeneratorProps {
  value: string;
  onChange: (value: string) => void;
  providerName?: string;
  areaName?: string;
  projectName?: string;
}

export const TenderInfoGenerator = ({ 
  value, 
  onChange,
  providerName,
  areaName,
  projectName
}: TenderInfoGeneratorProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [improvementInstruction, setImprovementInstruction] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.info("Aufnahme gestartet - sprechen Sie jetzt");
    } catch (error) {
      console.error("Fehler beim Starten der Aufnahme:", error);
      toast.error("Mikrofon-Zugriff fehlgeschlagen");
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    });
  };

  const handleStopAndGenerate = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = await stopRecording();
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          toast.error("Fehler beim Verarbeiten der Aufnahme");
          return;
        }

        // Call edge function to transcribe and generate
        const { data, error } = await supabase.functions.invoke('generate-tender-info', {
          body: { 
            audio: base64Audio,
            existingText: value,
            improvementInstruction: improvementInstruction || undefined,
            context: {
              providerName,
              areaName,
              projectName
            }
          }
        });

        if (error) {
          console.error("Fehler:", error);
          toast.error("Fehler bei der Textgenerierung");
          return;
        }

        if (data?.generatedText) {
          onChange(data.generatedText);
          toast.success("Text erfolgreich generiert");
          setImprovementInstruction("");
        }
      };
    } catch (error) {
      console.error("Fehler:", error);
      toast.error("Fehler bei der Verarbeitung");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImprove = async () => {
    if (!improvementInstruction.trim()) {
      toast.error("Bitte geben Sie eine Verbesserungsanweisung ein");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tender-info', {
        body: { 
          existingText: value,
          improvementInstruction: improvementInstruction,
          context: {
            providerName,
            areaName,
            projectName
          }
        }
      });

      if (error) {
        console.error("Fehler:", error);
        toast.error("Fehler bei der Textverbesserung");
        return;
      }

      if (data?.generatedText) {
        onChange(data.generatedText);
        toast.success("Text erfolgreich verbessert");
        setImprovementInstruction("");
      }
    } catch (error) {
      console.error("Fehler:", error);
      toast.error("Fehler bei der Verarbeitung");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    toast.success("Text bestätigt");
  };

  return (
    <div className="space-y-3">
      {/* Textarea with dictation button inside */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Informationen für die Ausschreibung eingeben oder diktieren..."
          rows={6}
          disabled={isConfirmed || isProcessing}
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors resize-none pr-28 pb-12"
        />
        
        {/* Bottom bar with dictation button */}
        <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-border bg-muted/30 rounded-b-md flex items-center justify-end px-3 gap-2">
          {!isRecording ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startRecording}
              disabled={isProcessing || isConfirmed}
              className="flex items-center gap-1.5 h-7"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="text-xs">Diktieren</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleStopAndGenerate}
              disabled={isProcessing}
              className="flex items-center gap-1.5 h-7 animate-pulse"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Verarbeite...</span>
                </>
              ) : (
                <>
                  <StopCircle className="w-3.5 h-3.5" />
                  <span className="text-xs">Stoppen & Generieren</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Improvement section - shown after text is generated */}
      {value && !isConfirmed && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
          <label className="text-sm font-medium">Anweisungen zur Anpassung</label>
          <Textarea
            value={improvementInstruction}
            onChange={(e) => setImprovementInstruction(e.target.value)}
            placeholder="z.B. 'Mache es kürzer' oder 'Betone mehr die Vorteile'"
            rows={2}
            disabled={isProcessing}
            className="bg-background"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleImprove}
              disabled={isProcessing || !improvementInstruction.trim()}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Anpasse...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Anpassen
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Bestätigen
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation indicator */}
      {isConfirmed && (
        <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-sm text-green-800 dark:text-green-400">
          <Check className="w-4 h-4" />
          Text wurde bestätigt
        </div>
      )}
    </div>
  );
};
