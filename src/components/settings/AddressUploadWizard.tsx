import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ColumnMapping {
  [csvColumn: string]: string;
}

interface Question {
  column: string;
  question: string;
  options: string[];
  type: 'radio' | 'select';
}

interface AddressUploadWizardProps {
  projectId: string;
  providerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddressUploadWizard = ({
  projectId,
  providerId,
  open,
  onOpenChange,
  onSuccess,
}: AddressUploadWizardProps) => {
  const [step, setStep] = useState<'upload' | 'analyze' | 'mapping' | 'confirm' | 'processing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [suggestedMapping, setSuggestedMapping] = useState<ColumnMapping>({});
  const [finalMapping, setFinalMapping] = useState<ColumnMapping>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<{ [column: string]: string }>({});
  const [savedMappingId, setSavedMappingId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [progress, setProgress] = useState(0);
  const [saveMapping, setSaveMapping] = useState(false);
  const [mappingName, setMappingName] = useState("");

  const AVAILABLE_MAPPINGS = [
    { value: 'street', label: 'Straße' },
    { value: 'house_number', label: 'Hausnummer' },
    { value: 'house_number_combined', label: 'Hausnummer + Zusatz (kombiniert)' },
    { value: 'postal_code', label: 'Postleitzahl' },
    { value: 'city', label: 'Ort' },
    { value: 'locality', label: 'Ortschaft' },
    { value: 'units_residential', label: 'Anzahl WE (Wohneinheiten)' },
    { value: 'units_commercial', label: 'Anzahl GE (Geschäftseinheiten)' },
    { value: 'unit_count', label: 'WEANZ (Gesamt-WE)' },
    { value: 'floor', label: 'Etage' },
    { value: 'position', label: 'Lage' },
    { value: 'customer_number', label: 'Kundennummer (→ Notiz)' },
    { value: 'customer_name', label: 'Kundenname (→ Notiz)' },
    { value: 'ignore', label: '🚫 Ignorieren' },
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Bitte nur CSV- oder Excel-Dateien hochladen');
      return;
    }

    setFile(selectedFile);
    setStep('analyze');
    setProgress(10);

    // Check if file is Excel
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (isExcel) {
      // Parse Excel file
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extract headers and data
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1).map(row => {
            const obj: any = {};
            (row as any[]).forEach((cell, idx) => {
              obj[headers[idx]] = cell;
            });
            return obj;
          });

          setCsvData(dataRows);
          setCsvHeaders(headers);
          setProgress(30);

          // Analyze structure
          try {
            const { data: analysisData, error } = await supabase.functions.invoke('analyze-csv-structure', {
              body: {
                csvHeaders: headers,
                sampleRows: dataRows.slice(0, 5),
                providerId: providerId,
              },
            });

            if (error) throw error;

            setSuggestedMapping(analysisData.suggested_mapping);
            setFinalMapping(analysisData.suggested_mapping);
            setConfidence(analysisData.confidence);
            setQuestions(analysisData.questions || []);
            setSavedMappingId(analysisData.saved_mapping_id);

            setProgress(100);
            setTimeout(() => {
              setStep('mapping');
            }, 500);
          } catch (error: any) {
            console.error('Excel analysis error:', error);
            toast.error('Fehler bei der Excel-Analyse');
            setStep('upload');
          }
        } catch (error) {
          console.error('Excel parsing error:', error);
          toast.error('Fehler beim Lesen der Excel-Datei');
          setStep('upload');
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      // Parse CSV
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = results.data;
          const headers = results.meta.fields || [];

          setCsvData(data);
          setCsvHeaders(headers);
          setProgress(30);

          // Analyze CSV structure
          try {
            const { data: analysisData, error } = await supabase.functions.invoke('analyze-csv-structure', {
              body: {
                csvHeaders: headers,
                sampleRows: data.slice(0, 5),
                providerId: providerId,
              },
            });

            if (error) throw error;

            setSuggestedMapping(analysisData.suggested_mapping);
            setFinalMapping(analysisData.suggested_mapping);
            setConfidence(analysisData.confidence);
            setQuestions(analysisData.questions || []);
            setSavedMappingId(analysisData.saved_mapping_id);

            setProgress(100);
            setTimeout(() => {
              setStep('mapping');
            }, 500);
          } catch (error: any) {
            console.error('CSV analysis error:', error);
            toast.error('Fehler bei der CSV-Analyse');
            setStep('upload');
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Fehler beim Lesen der CSV-Datei');
          setStep('upload');
        },
      });
    }
  };

  const handleMappingChange = (csvColumn: string, mapping: string) => {
    setFinalMapping(prev => ({
      ...prev,
      [csvColumn]: mapping,
    }));
  };

  const handleQuestionAnswer = (column: string, answer: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [column]: answer,
    }));
  };

  const handleConfirm = () => {
    // Validate required fields
    const hasStreet = Object.values(finalMapping).includes('street');
    const hasHouseNumber = Object.values(finalMapping).includes('house_number') || 
                           Object.values(finalMapping).includes('house_number_combined');
    const hasPostalCode = Object.values(finalMapping).includes('postal_code');
    const hasCity = Object.values(finalMapping).includes('city');

    if (!hasStreet || !hasHouseNumber || !hasPostalCode || !hasCity) {
      toast.error('Pflichtfelder fehlen: Straße, Hausnummer, PLZ, Ort');
      return;
    }

    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => !questionAnswers[q.column]);
    if (unansweredQuestions.length > 0) {
      toast.error('Bitte alle Fragen beantworten');
      return;
    }

    setStep('confirm');
  };

  const handleUpload = async () => {
    setStep('processing');
    setProgress(0);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Save mapping if requested
      if (saveMapping && providerId) {
        const { error: mappingError } = await supabase
          .from('csv_column_mappings')
          .insert({
            provider_id: providerId,
            mapping_name: mappingName || `${new Date().toLocaleDateString()} Upload`,
            column_mapping: finalMapping,
            created_by: userData.user.id,
          });

        if (mappingError) console.error('Error saving mapping:', mappingError);
      }

      // Update usage count if using saved mapping
      if (savedMappingId) {
        const { data: currentMapping } = await supabase
          .from('csv_column_mappings')
          .select('usage_count')
          .eq('id', savedMappingId)
          .single();

        if (currentMapping) {
          await supabase
            .from('csv_column_mappings')
            .update({ usage_count: (currentMapping.usage_count || 0) + 1 })
            .eq('id', savedMappingId);
        }
      }

      // Upload CSV with mapping
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-street-list', {
        body: {
          projectId: projectId,
          csvData: csvData,
          columnMapping: finalMapping,
          questionAnswers: questionAnswers,
        },
      });

      if (uploadError) throw uploadError;

      setProgress(100);
      toast.success(`Upload erfolgreich! ${uploadData.successful} Adressen importiert`);
      
      if (uploadData.skipped > 0) {
        toast.warning(`${uploadData.skipped} Zeilen übersprungen (siehe Upload-Log)`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload fehlgeschlagen: ${error.message}`);
      setStep('mapping');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adressliste hochladen</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  CSV- oder Excel-Datei hier ablegen oder klicken zum Auswählen
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </Label>
          </div>
        )}

        {/* Step 2: Analyze */}
        {step === 'analyze' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-lg">Analysiere CSV-Struktur...</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Step 3: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-6">
            {/* Saved mapping alert */}
            {savedMappingId && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Wir haben ein gespeichertes Mapping gefunden ({(confidence * 100).toFixed(0)}% Übereinstimmung)
                </AlertDescription>
              </Alert>
            )}

            {/* Mapping table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV-Spalte</TableHead>
                    <TableHead>Zuordnung</TableHead>
                    <TableHead>Beispiel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvHeaders.filter((header) => finalMapping[header] !== 'ignore' && finalMapping[header] !== 'house_number_addon' && finalMapping[header] !== 'provider_address_id').map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={finalMapping[header] || 'ignore'}
                          onValueChange={(value) => handleMappingChange(header, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MAPPINGS.map((mapping) => (
                              <SelectItem key={mapping.value} value={mapping.value}>
                                {mapping.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {csvData[0]?.[header] || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Questions */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Bitte bestätigen:</h3>
                {questions.map((question) => (
                  <div key={question.column} className="border rounded-lg p-4 space-y-3">
                    <Label>{question.question}</Label>
                    <RadioGroup
                      value={questionAnswers[question.column]}
                      onValueChange={(value) => handleQuestionAnswer(question.column, value)}
                    >
                      {question.options.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.column}-${option}`} />
                          <Label htmlFor={`${question.column}-${option}`} className="cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}

            {/* Save mapping option */}
            {providerId && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save-mapping"
                    checked={saveMapping}
                    onChange={(e) => setSaveMapping(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="save-mapping" className="cursor-pointer">
                    Mapping für zukünftige Uploads speichern
                  </Label>
                </div>
                {saveMapping && (
                  <Input
                    placeholder="Mapping-Name (optional)"
                    value={mappingName}
                    onChange={(e) => setMappingName(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Zurück
              </Button>
              <Button onClick={handleConfirm}>
                Weiter
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bereit zum Upload von <strong>{csvData.length} Adressen</strong>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Zurück
              </Button>
              <Button onClick={handleUpload}>
                Upload starten
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Processing */}
        {step === 'processing' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-lg">Importiere Adressen...</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
