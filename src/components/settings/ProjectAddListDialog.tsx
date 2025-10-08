import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ProjectAddListDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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

export const ProjectAddListDialog = ({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: ProjectAddListDialogProps) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'mapping' | 'importing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [finalMapping, setFinalMapping] = useState<{[key: string]: string}>({});
  const [mappingQuestions, setMappingQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<{[key: string]: string}>({});
  const [savedMappingId, setSavedMappingId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Bitte nur CSV- oder Excel-Dateien hochladen');
      return;
    }

    setFile(selectedFile);
    setListName(selectedFile.name.replace(/\.(csv|xlsx|xls)$/i, ''));
    setStep('analyzing');
    setProgress(10);

    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    try {
      let headers: string[];
      let dataRows: any[];

      if (isExcel) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = async (evt) => {
            try {
              const bstr = evt.target?.result;
              const workbook = XLSX.read(bstr, { type: 'binary' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              headers = jsonData[0] as string[];
              dataRows = jsonData.slice(1).map(row => {
                const obj: any = {};
                (row as any[]).forEach((cell, idx) => {
                  obj[headers[idx]] = cell;
                });
                return obj;
              });
              resolve(null);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsBinaryString(selectedFile);
        });
      } else {
        await new Promise((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              dataRows = results.data;
              headers = results.meta.fields || [];
              resolve(null);
            },
            error: reject,
          });
        });
      }

      setCsvData(dataRows);
      setCsvHeaders(headers);
      setProgress(30);

      const { data: analysisData, error } = await supabase.functions.invoke('analyze-csv-structure', {
        body: {
          csvHeaders: headers,
          sampleRows: dataRows.slice(0, 5),
          providerId: null,
        },
      });

      if (error) throw error;

      setFinalMapping(analysisData.suggested_mapping);
      setMappingQuestions(analysisData.questions || []);
      setConfidence(analysisData.confidence);
      setSavedMappingId(analysisData.saved_mapping_id);

      setProgress(100);
      setTimeout(() => {
        setStep('mapping');
      }, 500);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Fehler bei der Analyse');
      setStep('upload');
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

  const handleConfirmMapping = async () => {
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
    const unansweredQuestions = mappingQuestions.filter(q => !questionAnswers[q.column]);
    if (unansweredQuestions.length > 0) {
      toast.error('Bitte alle Fragen beantworten');
      return;
    }

    if (!listName.trim()) {
      toast.error('Bitte einen Namen für die Liste eingeben');
      return;
    }

    setStep('importing');
    setProgress(0);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create list entry
      const { data: listData, error: listError } = await supabase
        .from('project_address_lists')
        .insert({
          project_id: projectId,
          name: listName,
          file_name: file?.name,
          status: 'importing',
          column_mapping: finalMapping,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (listError) throw listError;

      setProgress(30);

      // Upload addresses
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-street-list', {
        body: {
          projectId: projectId,
          listId: listData.id,
          csvData: csvData,
          columnMapping: finalMapping,
          questionAnswers: questionAnswers,
          skipGeocoding: true,
        },
      });

      if (uploadError) throw uploadError;

      setProgress(90);

      // Update list status
      await supabase
        .from('project_address_lists')
        .update({
          status: 'completed',
          upload_stats: {
            total: uploadData.totalRows || 0,
            successful: uploadData.successfulAddresses || 0,
            failed: uploadData.failedAddresses?.length || 0,
          },
        })
        .eq('id', listData.id);

      setProgress(100);
      toast.success(`Liste "${listName}" erfolgreich importiert! ${uploadData.successfulAddresses} Adressen hinzugefügt`);
      
      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setStep('upload');
      setFile(null);
      setListName("");
      setCsvData([]);
      setCsvHeaders([]);
      setFinalMapping({});
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Import fehlgeschlagen: ${error.message}`);
      setStep('mapping');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weitere Adressliste hinzufügen</DialogTitle>
        </DialogHeader>

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

        {step === 'analyzing' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-3 min-w-0">
              <Loader2 className="h-6 w-6 animate-spin text-primary flex-shrink-0" />
              <p className="text-lg truncate">Analysiere {file?.name}...</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="list-name">Listen-Name</Label>
              <Input
                id="list-name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="z.B. Bottrop Nord"
              />
            </div>

            {savedMappingId && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Gespeichertes Mapping gefunden ({(confidence * 100).toFixed(0)}% Übereinstimmung)
                </AlertDescription>
              </Alert>
            )}

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
                  {csvHeaders.filter((header) => 
                    finalMapping[header] !== 'ignore' && 
                    finalMapping[header] !== 'house_number_addon' && 
                    finalMapping[header] !== 'provider_address_id' && 
                    finalMapping[header] !== 'latitude' && 
                    finalMapping[header] !== 'longitude'
                  ).map((header) => {
                    const currentValue = finalMapping[header] || 'ignore';
                    const usedMappings = Object.entries(finalMapping)
                      .filter(([key, val]) => key !== header && val !== 'ignore')
                      .map(([_, val]) => val);
                    
                    return (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <Select
                            value={currentValue}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="bottom" align="start">
                              {AVAILABLE_MAPPINGS.map((mapping) => {
                                const isUsed = usedMappings.includes(mapping.value);
                                const isIgnore = mapping.value === 'ignore';
                                return (
                                  <SelectItem 
                                    key={mapping.value} 
                                    value={mapping.value}
                                    disabled={isUsed && !isIgnore}
                                  >
                                    {mapping.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {csvData[0]?.[header] || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Questions */}
            {mappingQuestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Bitte bestätigen:</h3>
                {mappingQuestions.map((question) => (
                  <div key={question.column} className="border rounded-lg p-4 space-y-3">
                    <Label>{question.question}</Label>
                    <RadioGroup
                      value={questionAnswers[question.column]}
                      onValueChange={(value) => handleQuestionAnswer(question.column, value)}
                    >
                      {question.options.map((option: string) => (
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Zurück
              </Button>
              <Button onClick={handleConfirmMapping}>
                Liste importieren
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-lg">Importiere {listName}...</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
