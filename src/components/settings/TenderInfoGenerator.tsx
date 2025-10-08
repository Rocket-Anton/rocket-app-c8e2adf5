import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, StopCircle, Loader2, Wand2, Check, BookMarked } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TenderInfoGeneratorProps {
  value: string;
  onChange: (value: string) => void;
  providerName?: string;
  providerId?: string;
  projectId?: string;
  areaName?: string;
  projectName?: string;
}

export const TenderInfoGenerator = ({ 
  value, 
  onChange,
  providerName,
  providerId,
  projectId,
  areaName,
  projectName
}: TenderInfoGeneratorProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [improvementInstruction, setImprovementInstruction] = useState("");
  const [isRecordingImprovement, setIsRecordingImprovement] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveScope, setSaveScope] = useState<'provider' | 'project'>('provider');
  const [saveCategory, setSaveCategory] = useState('general');
  const [lastImprovementText, setLastImprovementText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const improvementMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const improvementAudioChunksRef = useRef<Blob[]>([]);

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

  const startImprovementRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      improvementAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          improvementAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      improvementMediaRecorderRef.current = mediaRecorder;
      setIsRecordingImprovement(true);
      toast.info("Aufnahme gestartet");
    } catch (error) {
      console.error("Fehler beim Starten der Aufnahme:", error);
      toast.error("Mikrofon-Zugriff fehlgeschlagen");
    }
  };

  const stopImprovementRecording = () => {
    return new Promise<Blob>((resolve) => {
      if (improvementMediaRecorderRef.current && improvementMediaRecorderRef.current.state !== 'inactive') {
        improvementMediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(improvementAudioChunksRef.current, { type: 'audio/webm' });
          improvementMediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };
        improvementMediaRecorderRef.current.stop();
        setIsRecordingImprovement(false);
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
              providerId,
              projectId,
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

  const handleImprove = async (instructionText?: string) => {
    const instruction = instructionText || improvementInstruction;
    if (!instruction.trim()) {
      toast.error("Bitte geben Sie eine Verbesserungsanweisung ein");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tender-info', {
        body: { 
          existingText: value,
          improvementInstruction: instruction,
          context: {
            providerName,
            providerId,
            projectId,
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
        setLastImprovementText(instruction);
        setImprovementInstruction("");
      }
    } catch (error) {
      console.error("Fehler:", error);
      toast.error("Fehler bei der Verarbeitung");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImprovementVoice = async () => {
    if (isRecordingImprovement) {
      setIsProcessing(true);
      try {
        const audioBlob = await stopImprovementRecording();
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          
          if (!base64Audio) {
            toast.error("Fehler beim Verarbeiten der Aufnahme");
            setIsProcessing(false);
            return;
          }

          // Transcribe the audio first
          const formData = new FormData();
          const audioFile = new Blob([audioBlob], { type: 'audio/webm' });
          formData.append('file', audioFile, 'audio.webm');
          formData.append('model', 'whisper-1');
          formData.append('language', 'de');

          const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            },
            body: formData,
          });

          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json();
            const transcribedText = transcriptionData.text;
            setImprovementInstruction(transcribedText);
            await handleImprove(transcribedText);
          } else {
            toast.error("Fehler bei der Transkription");
          }
          setIsProcessing(false);
        };
      } catch (error) {
        console.error("Fehler:", error);
        toast.error("Fehler bei der Verarbeitung");
        setIsProcessing(false);
      }
    } else {
      startImprovementRecording();
    }
  };

  const handleSaveInstruction = async () => {
    if (!lastImprovementText.trim()) {
      toast.error("Keine Anweisung zum Speichern vorhanden");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Nicht angemeldet");
        return;
      }

      if (saveScope === 'provider' && providerId) {
        const { error } = await supabase.from('provider_ai_instructions').insert({
          provider_id: providerId,
          instruction_text: lastImprovementText,
          instruction_category: saveCategory,
          created_by: userData.user.id,
        });

        if (error) throw error;
        toast.success(`Anweisung für ${providerName} gespeichert`);
      } else if (saveScope === 'project' && projectId) {
        const { error } = await supabase.from('project_ai_instructions').insert({
          project_id: projectId,
          area_name: areaName || null,
          instruction_text: lastImprovementText,
          created_by: userData.user.id,
        });

        if (error) throw error;
        toast.success('Projekt-Anweisung gespeichert');
      }

      setShowSaveDialog(false);
      setLastImprovementText('');
    } catch (error) {
      console.error("Fehler:", error);
      toast.error("Fehler beim Speichern");
    }
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    toast.success("Text bestätigt");
  };

  return (
    <div className="space-y-3">
      {/* Rich text editor with dictation button inside */}
      <div className="relative">
        <div
          contentEditable={!isConfirmed && !isProcessing}
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: value }}
          className={cn(
            "min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "hover:border-primary/50 focus:border-primary transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "pb-12 resize-y overflow-auto",
            (isConfirmed || isProcessing) && "opacity-50 cursor-not-allowed"
          )}
          style={{ minHeight: '150px', maxHeight: '500px' }}
          data-placeholder="Informationen für die Ausschreibung eingeben oder diktieren..."
        />
        
        {/* Bottom bar with dictation button */}
        {!value && (
          <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-border bg-background rounded-b-md flex items-center justify-end px-3 gap-2">
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
        )}
      </div>

      {/* Improvement section - shown after text is generated */}
      {value && !isConfirmed && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
          <label className="text-sm font-medium">Anweisungen zur Anpassung</label>
          <div className="relative">
            <Textarea
              value={improvementInstruction}
              onChange={(e) => setImprovementInstruction(e.target.value)}
              placeholder="z.B. 'Mache es kürzer' oder 'Betone mehr die Vorteile'"
              rows={2}
              disabled={isProcessing}
              className="bg-background resize-y pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleImprovementVoice}
              disabled={isProcessing}
              className={cn(
                "absolute bottom-2 right-2 h-7 w-7 p-0",
                isRecordingImprovement && "animate-pulse text-destructive"
              )}
            >
              {isRecordingImprovement ? (
                <StopCircle className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImprove()}
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
            {lastImprovementText && providerId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2"
              >
                <BookMarked className="w-4 h-4" />
                Anweisung speichern
              </Button>
            )}
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

      {/* Save Instruction Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anweisung speichern</DialogTitle>
            <DialogDescription>
              Soll diese Anweisung für zukünftige Generierungen verwendet werden?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Geltungsbereich</Label>
              <Select value={saveScope} onValueChange={(v) => setSaveScope(v as 'provider' | 'project')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provider">
                    Für alle {providerName}-Projekte
                  </SelectItem>
                  {projectId && (
                    <SelectItem value="project">
                      Nur für dieses Projekt{areaName ? ` (${areaName})` : ''}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {saveScope === 'provider' && (
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={saveCategory} onValueChange={setSaveCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Allgemein</SelectItem>
                    <SelectItem value="tone">Tonalität</SelectItem>
                    <SelectItem value="content">Inhalt</SelectItem>
                    <SelectItem value="formatting">Formatierung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-3 bg-muted rounded text-sm">
              <strong>Anweisung:</strong>
              <p className="mt-1">{lastImprovementText}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveInstruction}>
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        [contenteditable] strong {
          font-weight: 600;
        }
        [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] p {
          margin: 0.5em 0;
        }
      `}</style>
    </div>
  );
};
