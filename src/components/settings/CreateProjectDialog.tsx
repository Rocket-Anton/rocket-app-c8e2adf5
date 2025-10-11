import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Loader2, CheckCircle, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CityPreviewMap } from "@/components/CityPreviewMap";
import { calculateWorkingDays } from "@/utils/holidays";
import type { DateRange } from "react-day-picker";
import { TenderInfoGenerator } from "./TenderInfoGenerator";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface CreateProjectDialogProps {
  providers: any[];
  onClose: () => void;
}

const FEDERAL_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
];

const STATUS_OPTIONS = ['In Planung', 'Läuft', 'Abgeschlossen'];

const MARKETING_TYPES = [
  { value: 'VVM', color: 'bg-green-100 text-green-800' },
  { value: 'BVM', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'RVM', color: 'bg-pink-100 text-pink-800' },
  { value: 'NVM', color: 'bg-blue-100 text-blue-800' },
  { value: 'ENERGIE', color: 'bg-purple-100 text-purple-800' },
  { value: 'PV LEADS', color: 'bg-teal-100 text-teal-800' },
  { value: 'ADRESSERMITTLUNG', color: 'bg-orange-100 text-orange-800' },
  { value: 'GEE-VERTRIEB', color: 'bg-rose-100 text-rose-800' },
  { value: 'VVM-BK', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'FLYER', color: 'bg-amber-100 text-amber-800' },
];

const QUOTA_TYPES = [
  { value: 'GesamtWE', color: 'bg-purple-100 text-purple-800' },
  { value: 'SaleableWE', color: 'bg-cyan-100 text-cyan-800' },
];

const YES_NO_OPTIONS = [
  { value: 'Ja', color: 'bg-green-100 text-green-800' },
  { value: 'Nein', color: 'bg-orange-100 text-orange-800' },
];

const TG_GROUP_OPTIONS = [
  { value: 'Ja', color: 'bg-green-100 text-green-800' },
  { value: 'Nein', color: 'bg-orange-100 text-orange-800' },
  { value: 'TG Gruppe existiert', color: 'bg-purple-100 text-purple-800' },
];

export const CreateProjectDialog = ({ providers, onClose }: CreateProjectDialogProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [areaName, setAreaName] = useState("");
  const [federalState, setFederalState] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cityLookupLoading, setCityLookupLoading] = useState(false);
  const [cityCoordinates, setCityCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [postalCodeSuggestions, setPostalCodeSuggestions] = useState<string[]>([]);
  const cityDebounceRef = useRef<number | null>(null);
  const areaNameSetRef = useRef<boolean>(false); // Track if areaName was auto-set
  const [marketingType, setMarketingType] = useState<string | undefined>(undefined);
  const [rocketCount, setRocketCount] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [shiftDate, setShiftDate] = useState<Date>();
  const [unitCount, setUnitCount] = useState("");
  
  // Bestandskunden
  const [hasExistingCustomers, setHasExistingCustomers] = useState(false);
  const [existingCustomerCount, setExistingCustomerCount] = useState("");
  const [canWriteExistingCustomers, setCanWriteExistingCustomers] = useState<string | undefined>(undefined);
  
  // WE Reduktion / Saleable WE
  const [hasWeReduction, setHasWeReduction] = useState(false);
  const [weReductionCount, setWeReductionCount] = useState("");
  const [saleableUnitsManual, setSaleableUnitsManual] = useState("");
  const [lastEditedField, setLastEditedField] = useState<'reduction' | 'saleable' | null>(null);
  
  const [quotaType, setQuotaType] = useState<string | undefined>(undefined);
  const [targetQuota, setTargetQuota] = useState("");
  
  // Raketen Vorschlag
  const [acceptRocketSuggestion, setAcceptRocketSuggestion] = useState<boolean | undefined>(undefined);
  
  const [importantInfo, setImportantInfo] = useState("");
  const [projectManager, setProjectManager] = useState<string | undefined>(undefined);
  const [telegramGroupCreate, setTelegramGroupCreate] = useState<string | undefined>(undefined);
  const [telegramGroupExists, setTelegramGroupExists] = useState<string | undefined>(undefined);
  const [postJobBooster, setPostJobBooster] = useState<string | undefined>(undefined);
  const [tenderInfo, setTenderInfo] = useState("");
  const [projectWithBonus, setProjectWithBonus] = useState<boolean | undefined>(undefined);
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CSV Mapping states
  const [mappingStep, setMappingStep] = useState<'none' | 'analyzing' | 'mapping' | 'confirmed'>('none');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [suggestedMapping, setSuggestedMapping] = useState<{[key: string]: string}>({});
  const [finalMapping, setFinalMapping] = useState<{[key: string]: string}>({});
  const [mappingQuestions, setMappingQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<{[key: string]: string}>({});
  const [savedMappingId, setSavedMappingId] = useState<string | null>(null);
  const [mappingConfidence, setMappingConfidence] = useState(0);

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
    { value: 'unit_note', label: 'WE-Notiz (→ Systemnotiz)' },
    { value: 'ignore', label: '🚫 Ignorieren' },
  ];

  // Load selected provider details 
  // Query to fetch provider info including projects_with_bonus setting
  const { data: selectedProviderData } = useQuery({
    queryKey: ['provider-details', selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return null;
      const { data, error } = await supabase
        .from("providers")
        .select('*')
        .eq('id', selectedProvider)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProvider,
  });

  // Load tariffs for selected provider
  const { data: tariffs = [] } = useQuery({
    queryKey: ['tariffs', selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return [];
      const { data, error } = await supabase
        .from("tariffs")
        .select('*')
        .eq('provider_id', selectedProvider)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProvider,
  });

  // Load addons for selected provider
  const { data: addons = [] } = useQuery({
    queryKey: ['addons', selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return [];
      const { data, error } = await supabase
        .from("addons")
        .select('*')
        .eq('provider_id', selectedProvider)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProvider,
  });

  // Load project managers (users with project_manager role)
  const { data: projectManagers = [] } = useQuery({
    queryKey: ['project-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-Vervollständigung: Ort -> Bundesland, PLZ-Vorschläge + Kartenpunkt
  useEffect(() => {
    if (cityDebounceRef.current) window.clearTimeout(cityDebounceRef.current);

    if (!city || city.trim().length < 2) {
      setPostalCodeSuggestions([]);
      setCityCoordinates(null);
      return;
    }

    cityDebounceRef.current = window.setTimeout(async () => {
      setCityLookupLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('city-lookup', { body: { city } });
        if (!error && data?.matches?.length) {
          const match = data.matches[0];
          
          // Nur Bundesland, PLZ und Koordinaten setzen, aber Stadt NICHT überschreiben
          if (match?.state) setFederalState((prev) => prev || match.state);
          if (Array.isArray(match?.postalCodes)) {
            setPostalCodeSuggestions(match.postalCodes);
            if (match.postalCodes.length > 0 && !postalCode) {
              setPostalCode(match.postalCodes[0]);
            }
          }
          setCityCoordinates(match?.coordinates ?? null);
        } else {
          setPostalCodeSuggestions([]);
          setCityCoordinates(null);
        }
      } catch (e) {
        console.error('city-lookup failed', e);
        setPostalCodeSuggestions([]);
        setCityCoordinates(null);
      } finally {
        setCityLookupLoading(false);
      }
    }, 500);

    return () => {
      if (cityDebounceRef.current) window.clearTimeout(cityDebounceRef.current);
    };
  }, [city]);

  // Auto-Befüllung: Gebiet Name = Ort (nur wenn Ort erkannt wurde)
  useEffect(() => {
    if (city && cityCoordinates && !areaNameSetRef.current) {
      setAreaName(city); // Nutzt die bereits korrigierte Schreibweise vom Ort
      areaNameSetRef.current = true;
    }
    // Update areaName wenn city geändert wurde (nach Auto-Korrektur)
    if (city && areaNameSetRef.current && areaName && areaName.toLowerCase() === city.toLowerCase() && areaName !== city) {
      setAreaName(city);
    }
    // Reset flag wenn city leer wird
    if (!city) {
      areaNameSetRef.current = false;
    }
  }, [city, cityCoordinates, areaName]);

  // Berechne Werktage, Samstage und Feiertage
  const workingDaysInfo = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !federalState) {
      return null;
    }
    return calculateWorkingDays(dateRange.from, dateRange.to, federalState);
  }, [dateRange, federalState]);

  // Berechne Saleable WE basierend auf letzter Bearbeitung
  const saleableUnits = useMemo(() => {
    if (!hasWeReduction) return null;
    
    const units = parseInt(unitCount) || 0;
    const existingCount = parseInt(existingCustomerCount) || 0;
    
    // Wenn Saleable WE manuell bearbeitet wurde, verwende diesen Wert
    if (lastEditedField === 'saleable' && saleableUnitsManual) {
      return parseInt(saleableUnitsManual) || 0;
    }
    
    // Sonst berechne aus WE Reduktion
    const reductionCount = parseInt(weReductionCount) || 0;
    let saleable = units;
    
    // Bestandskunden abziehen wenn aktiv und können nicht beschrieben werden
    if (hasExistingCustomers && canWriteExistingCustomers === 'Nein') {
      saleable -= existingCount;
    }
    
    saleable -= reductionCount;
    return Math.max(0, saleable);
  }, [unitCount, hasExistingCustomers, existingCustomerCount, canWriteExistingCustomers, hasWeReduction, weReductionCount, saleableUnitsManual, lastEditedField]);

  // Berechne WE Reduktion basierend auf letzter Bearbeitung
  const calculatedReduction = useMemo(() => {
    if (!hasWeReduction) return null;
    
    // Wenn Reduktion manuell bearbeitet wurde, verwende diesen Wert
    if (lastEditedField === 'reduction' && weReductionCount) {
      return parseInt(weReductionCount) || 0;
    }
    
    // Sonst berechne aus Saleable WE
    if (!saleableUnitsManual) return parseInt(weReductionCount) || 0;
    
    const units = parseInt(unitCount) || 0;
    const existingCount = parseInt(existingCustomerCount) || 0;
    const saleable = parseInt(saleableUnitsManual) || 0;
    
    let reduction = units - saleable;
    
    // Bestandskunden abziehen wenn aktiv und können nicht beschrieben werden
    if (hasExistingCustomers && canWriteExistingCustomers === 'Nein') {
      reduction -= existingCount;
    }
    
    return Math.max(0, reduction);
  }, [unitCount, hasExistingCustomers, existingCustomerCount, canWriteExistingCustomers, hasWeReduction, weReductionCount, saleableUnitsManual, lastEditedField]);

  // Berechne Zielaufträge
  const targetOrders = useMemo(() => {
    if (!targetQuota || !quotaType) return null;
    
    const quota = parseFloat(targetQuota) / 100;
    const units = parseInt(unitCount) || 0;
    
    if (quotaType === 'GesamtWE') {
      return Math.round(units * quota);
    } else if (quotaType === 'SaleableWE' && saleableUnits !== null) {
      return Math.round(saleableUnits * quota);
    }
    
    return null;
  }, [targetQuota, quotaType, unitCount, saleableUnits]);

  // Berechne tägliche Aufträge
  const dailyOrdersNeeded = useMemo(() => {
    if (!targetOrders || !workingDaysInfo?.effectiveDays) return null;
    return (targetOrders / workingDaysInfo.effectiveDays).toFixed(1);
  }, [targetOrders, workingDaysInfo]);

  // Berechne Raketen Vorschlag
  const rocketSuggestion = useMemo(() => {
    const units = parseInt(unitCount) || 0;
    if (!units) return null;
    return Math.ceil(units / 400);
  }, [unitCount]);

  // Berechne durchschnittliche WE pro Rakete
  const avgWePerRocket = useMemo(() => {
    const units = parseInt(unitCount) || 0;
    const rockets = acceptRocketSuggestion 
      ? rocketSuggestion 
      : parseInt(rocketCount) || 0;
    
    if (!units || !rockets) return null;
    return Math.round(units / rockets);
  }, [unitCount, rocketCount, acceptRocketSuggestion, rocketSuggestion]);

  // Automatisch Raketen setzen wenn Vorschlag akzeptiert
  useEffect(() => {
    if (acceptRocketSuggestion && rocketSuggestion) {
      setRocketCount(rocketSuggestion.toString());
    }
  }, [acceptRocketSuggestion, rocketSuggestion]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Bitte nur CSV- oder Excel-Dateien hochladen');
      return;
    }

    setCsvFile(selectedFile);
    setMappingStep('analyzing');

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

      const { data: analysisData, error } = await supabase.functions.invoke('analyze-csv-structure', {
        body: {
          csvHeaders: headers,
          sampleRows: dataRows.slice(0, 5),
          providerId: selectedProvider,
        },
      });

      if (error) throw error;

      setSuggestedMapping(analysisData.suggested_mapping);
      setFinalMapping(analysisData.suggested_mapping);
      setMappingConfidence(analysisData.confidence);
      setMappingQuestions(analysisData.questions || []);
      setSavedMappingId(analysisData.saved_mapping_id);

      setMappingStep('mapping');
      toast.success('Datei analysiert - bitte Zuordnung überprüfen');
    } catch (error: any) {
      console.error('File analysis error:', error);
      toast.error('Fehler beim Analysieren der Datei');
      setCsvFile(null);
      setMappingStep('none');
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

  const handleConfirmMapping = () => {
    const hasStreet = Object.values(finalMapping).includes('street');
    const hasHouseNumber = Object.values(finalMapping).includes('house_number') || 
                           Object.values(finalMapping).includes('house_number_combined');
    const hasPostalCode = Object.values(finalMapping).includes('postal_code');
    const hasCity = Object.values(finalMapping).includes('city');

    if (!hasStreet || !hasHouseNumber || !hasPostalCode || !hasCity) {
      toast.error('Pflichtfelder fehlen: Straße, Hausnummer, PLZ, Ort müssen zugeordnet sein');
      return;
    }

    const unansweredQuestions = mappingQuestions.filter(q => !questionAnswers[q.column]);
    if (unansweredQuestions.length > 0) {
      toast.error('Bitte alle Fragen beantworten');
      return;
    }

    setMappingStep('confirmed');
    toast.success('Mapping bestätigt - Sie können jetzt das Projekt anlegen');
  };

  const handleResetMapping = () => {
    setCsvFile(null);
    setMappingStep('none');
    setCsvData([]);
    setCsvHeaders([]);
    setSuggestedMapping({});
    setFinalMapping({});
    setMappingQuestions([]);
    setQuestionAnswers({});
    setSavedMappingId(null);
    setMappingConfidence(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    // Info Text and unitCount are only required for non-FLYER projects
    const isTenderInfoRequired = marketingType !== 'FLYER';
    const isUnitCountRequired = marketingType !== 'FLYER';
    
    if (!selectedProvider || !areaName || !status || !city || !postalCode || !federalState || !marketingType || (isUnitCountRequired && !unitCount) || !telegramGroupCreate || !postJobBooster || (isTenderInfoRequired && !tenderInfo) || !dateRange?.from || !dateRange?.to) {
      toast.error("Bitte füllen Sie alle Pflichtfelder (*) aus");
      return;
    }
    
    if (hasExistingCustomers && !existingCustomerCount) {
      toast.error("Bitte Anzahl der Bestandskunden eingeben");
      return;
    }
    
    if (hasExistingCustomers && !canWriteExistingCustomers) {
      toast.error("Bitte angeben, ob Bestandskunden beschrieben werden können");
      return;
    }
    
    if (hasWeReduction && !weReductionCount && !saleableUnitsManual) {
      toast.error("Bitte WE Reduktion oder Saleable WE eingeben");
      return;
    }
    
    if ((hasExistingCustomers || hasWeReduction) && !quotaType) {
      toast.error("Bitte Art Quote auswählen");
      return;
    }
    
    if ((hasExistingCustomers || hasWeReduction) && !targetQuota) {
      toast.error("Bitte Zielquote eingeben");
      return;
    }
    
    if (!rocketCount) {
      toast.error("Bitte Anzahl Raketen angeben");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Geocoding später im Hintergrund, um Erstellung nicht zu blockieren
      let coordinates = null;

      // Insert project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          provider_id: selectedProvider,
          status,
          area_name: areaName,
          federal_state: federalState || null,
          city: city || null,
          postal_code: postalCode || null,
          marketing_type: marketingType || null,
          rocket_count: parseInt(rocketCount),
          start_date: dateRange?.from?.toISOString() || null,
          end_date: dateRange?.to?.toISOString() || null,
          shift_date: shiftDate?.toISOString() || null,
          unit_count: unitCount ? parseInt(unitCount) : null,
          existing_customer_count: hasExistingCustomers && existingCustomerCount ? parseInt(existingCustomerCount) : null,
          saleable_units: saleableUnits,
          quota_type: quotaType || null,
          target_quota: targetQuota ? parseInt(targetQuota, 10) : null,
          important_info: importantInfo || null,
          project_manager_id: projectManager || null,
          telegram_group_create: telegramGroupCreate || null,
          telegram_group_exists: telegramGroupExists || null,
          post_job_booster: postJobBooster || null,
          tender_info: tenderInfo || null,
          project_with_bonus: projectWithBonus ?? null,
          coordinates: coordinates,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Sofort feedback + Navigation
      toast.success("Projekt erfolgreich erstellt");
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setLoading(false);
      navigate(`/settings/projects/${project.id}`);
      onClose();

      // Hintergrundaufgaben ohne Blockieren starten
      (async () => {
        try {
          // Tarife verknüpfen
          if (selectedTariffs.length > 0) {
            const tariffInserts = selectedTariffs.map(tariffId => ({
              project_id: project.id,
              tariff_id: tariffId,
            }));
            const { error: tariffError } = await supabase
              .from("project_tariffs")
              .insert(tariffInserts);
            if (tariffError) throw tariffError;
          }

          // Addons verknüpfen
          if (selectedAddons.length > 0) {
            const addonInserts = selectedAddons.map(addonId => ({
              project_id: project.id,
              addon_id: addonId,
            }));
            const { error: addonError } = await supabase
              .from("project_addons")
              .insert(addonInserts);
            if (addonError) throw addonError;
          }

          // CSV-Import im Hintergrund starten
          if (csvFile && mappingStep === 'confirmed') {
            toast.info("Import wird im Hintergrund gestartet");
            
            // Create list entry first
            const { data: listData, error: listError } = await supabase
              .from('project_address_lists')
              .insert({
                project_id: project.id,
                name: csvFile.name || 'Import',
                file_name: csvFile.name,
                status: 'importing',
                created_by: user.id,
                column_mapping: finalMapping,
              })
              .select()
              .single();
            
            if (listError) throw listError;
            
            const { error: uploadError } = await supabase.functions.invoke('upload-street-list', {
              body: {
                projectId: project.id,
                listId: listData.id,
                csvData: csvData,
                columnMapping: finalMapping,
                questionAnswers: questionAnswers,
                marketingType: marketingType,
              },
            });
            if (uploadError) throw uploadError;
          }
        } catch (bgErr) {
          console.error("Background tasks error:", bgErr);
          toast.error("Hintergrundverarbeitung fehlgeschlagen");
        }
      })();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Fehler beim Erstellen des Projekts");
    }
  };


  const activeProviders = providers
    .filter(p => p.is_active)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Generate project name from provider abbreviation and area name
  const projectName = selectedProviderData?.abbreviation && areaName 
    ? `${selectedProviderData.abbreviation} - ${areaName}`
    : areaName || "";

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Fixed divider line */}
      <div className="px-6 pt-2 pb-4 border-b"></div>
      
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 pointer-events-auto">
        <div className="space-y-4 pointer-events-auto">
          {/* Provider */}
          <div className="space-y-2 pointer-events-auto">
            <Label htmlFor="provider" className="text-sm font-medium text-foreground">
              Provider<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider" className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Provider auswählen" className="data-[placeholder]:text-muted-foreground">
                  {selectedProvider && (() => {
                    const provider = activeProviders.find(p => p.id === selectedProvider);
                    return provider ? (
                      <div className="flex items-center gap-2">
                        {provider.logo_url && (
                          <img 
                            src={provider.logo_url} 
                            alt={provider.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <span>{provider.name}</span>
                      </div>
                    ) : null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background pointer-events-auto">
                {activeProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      {provider.logo_url && (
                        <img 
                          src={provider.logo_url} 
                          alt={provider.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span>{provider.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ort */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Ort<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ort eingeben"
              className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {cityLookupLoading ? "Suche Vorschläge…" : (cityCoordinates ? "Ort erkannt – Karte aktualisiert." : "Geben Sie einen Ort ein, um PLZ- und Bundesland-Vorschläge zu erhalten.")}
            </p>
          </div>

          {/* Gebiet Name - nur anzeigen wenn Ort vorhanden */}
          {city && city.trim().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="area-name" className="text-sm font-medium text-foreground">
                Gebiet Name<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="area-name"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="z.B. Lurup 1"
                className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
              />
              {projectName && (
                <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                  Projektname wird: <span className="font-semibold text-foreground">{projectName}</span>
                </p>
              )}
            </div>
          )}

          {/* PLZ mit Vorschlägen */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              PLZ<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="PLZ eingeben"
              list="plz-options"
              required
              className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
            />
            <datalist id="plz-options">
              {postalCodeSuggestions.map((plz) => (
                <option key={plz} value={plz} />
              ))}
            </datalist>
          </div>

          {/* Kleine Karten-Vorschau */}
          <div className="pt-2">
            <CityPreviewMap center={cityCoordinates} />
          </div>

          {/* Bundesland */}
          <div className="space-y-2 pointer-events-auto">
            <Label className="text-sm font-medium">
              Bundesland<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={federalState} onValueChange={setFederalState}>
              <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Bundesland auswählen" className="data-[placeholder]:text-muted-foreground" />
              </SelectTrigger>
              <SelectContent 
                className="bg-background pointer-events-auto max-h-[300px] overflow-y-auto" 
                side="bottom"
                align="start"
                sideOffset={4}
              >
                {FEDERAL_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2 pointer-events-auto">
            <Label className="text-sm font-medium">
              Status<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Status auswählen" className="data-[placeholder]:text-muted-foreground" />
              </SelectTrigger>
              <SelectContent className="bg-background pointer-events-auto">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vermarktungsart */}
          <div className="space-y-2 pointer-events-auto">
            <Label className="text-sm font-medium">
              Vermarktungsart<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={marketingType} onValueChange={setMarketingType}>
              <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Vermarktungsart auswählen" className="data-[placeholder]:text-muted-foreground" />
              </SelectTrigger>
              <SelectContent className="bg-background pointer-events-auto">
                {MARKETING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zeitraum (Start- und Enddatum) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Projektzeitraum<span className="text-red-500 ml-1">*</span>
            </Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-foreground">
                        {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}
                      </span>
                    ) : (
                      <span className="text-foreground">{format(dateRange.from, "dd.MM.yyyy")}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">Zeitraum auswählen</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background pointer-events-auto" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) {
                      setDatePickerOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {workingDaysInfo && marketingType !== 'FLYER' && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gesamttage:</span>
                  <span className="font-medium">{workingDaysInfo.totalDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Werktage (Mo-Fr):</span>
                  <span className="font-medium">{workingDaysInfo.weekdays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Samstage:</span>
                  <span className="font-medium">{workingDaysInfo.saturdays}</span>
                </div>
                {workingDaysInfo.holidays.length > 0 && (
                  <>
                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                      <span>Feiertage (Mo-Fr):</span>
                      <span className="font-medium">-{workingDaysInfo.holidays.length}</span>
                    </div>
                    <div className="pt-1 border-t">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {workingDaysInfo.holidays.map(h => (
                          <div key={h.name}>
                            {format(h.date, 'dd.MM.')} - {h.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold text-primary">
                  <span>Effektive Arbeitstage:</span>
                  <span>{workingDaysInfo.effectiveDays.toFixed(1)}</span>
                </div>
              </div>
            )}
            {!federalState && dateRange?.from && dateRange?.to && marketingType !== 'FLYER' && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                Bundesland auswählen, um Feiertage zu berücksichtigen
              </p>
            )}
          </div>

      {/* Anzahl WE - nur wenn nicht FLYER */}
      {marketingType !== 'FLYER' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Anzahl WE<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            type="number"
            value={unitCount}
            onChange={(e) => setUnitCount(e.target.value)}
            placeholder="0"
            className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
          />
        </div>
      )}

      {/* Bestandskunden Toggle und berechnete Felder - nur wenn nicht FLYER */}
      {marketingType !== 'FLYER' && (
        <>
          {/* Zielaufträge Anzeige */}
          {targetOrders !== null && (
            <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Label className="text-sm font-medium text-green-700 dark:text-green-400">Zielaufträge</Label>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {targetOrders.toLocaleString()}
              </div>
            </div>
          )}

          {/* Tägliche Aufträge Anzeige */}
          {dailyOrdersNeeded && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">Aufträge pro Tag benötigt</Label>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {dailyOrdersNeeded}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Basierend auf {workingDaysInfo?.effectiveDays.toFixed(1)} effektiven Arbeitstagen
              </p>
            </div>
          )}
        </>
      )}

      {/* Anzahl Raketen Soll - mit Vorschlag nur bei nicht-FLYER */}
      <div className="space-y-4 pt-4 border-t">
        {rocketSuggestion && marketingType !== 'FLYER' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-medium text-amber-700 dark:text-amber-400">Empfohlene Anzahl Raketen</Label>
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {rocketSuggestion}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Basierend auf ~400 WE pro Rakete
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-3">
              <Switch
                id="accept-suggestion"
                checked={acceptRocketSuggestion ?? false}
                onCheckedChange={(checked) => {
                  setAcceptRocketSuggestion(checked);
                  if (!checked) {
                    setRocketCount("");
                  }
                }}
              />
              <Label htmlFor="accept-suggestion" className="text-sm cursor-pointer text-amber-700 dark:text-amber-400">
                Vorschlag annehmen
              </Label>
            </div>
          </div>
        )}

        {(!acceptRocketSuggestion || !rocketSuggestion || marketingType === 'FLYER') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Anzahl Raketen Soll<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              value={rocketCount}
              onChange={(e) => setRocketCount(e.target.value)}
              placeholder="0"
              disabled={acceptRocketSuggestion ?? false}
              className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11 disabled:opacity-50"
            />
          </div>
        )}

        {/* Durchschnittliche WE pro Rakete - nur bei nicht-FLYER */}
        {avgWePerRocket && marketingType !== 'FLYER' && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Label className="text-sm font-medium text-purple-700 dark:text-purple-400">Durchschnittliche WE pro Rakete</Label>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
              {avgWePerRocket}
            </div>
          </div>
        )}
      </div>

      {/* Wichtige Infos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Wichtige Infos</Label>
        <Textarea
          value={importantInfo}
          onChange={(e) => setImportantInfo(e.target.value)}
          placeholder="Wichtige Informationen eingeben..."
          rows={4}
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Projektleiter Neu */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">Projektleiter</Label>
        <Select value={projectManager} onValueChange={setProjectManager}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Projektleiter auswählen" className="data-[placeholder]:text-muted-foreground" />
          </SelectTrigger>
          <SelectContent className="bg-background pointer-events-auto">
            {projectManagers.length === 0 ? (
              <SelectItem value="none">Keine Projektleiter verfügbar</SelectItem>
            ) : (
              projectManagers.map((manager: any) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Telegram Gruppe erstellen */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">
          Telegram Gruppe erstellen<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select value={telegramGroupCreate} onValueChange={setTelegramGroupCreate}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Option auswählen" className="data-[placeholder]:text-muted-foreground" />
          </SelectTrigger>
          <SelectContent className="bg-background pointer-events-auto">
            {TG_GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobbooster posten */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">
          Jobbooster posten<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select value={postJobBooster} onValueChange={setPostJobBooster}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Option auswählen" className="data-[placeholder]:text-muted-foreground" />
          </SelectTrigger>
          <SelectContent className="bg-background pointer-events-auto">
            {YES_NO_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Provisionen Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-base font-semibold">Provisionen</h3>
        
        {/* Projekt mit Bonus - only show if provider allows it */}
        {selectedProviderData?.projects_with_bonus && (
          <div className="space-y-2 pointer-events-auto">
            <Label className="text-sm font-medium">
              Projekt mit Bonus<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select 
              value={projectWithBonus === undefined ? undefined : (projectWithBonus ? "Ja" : "Nein")} 
              onValueChange={(val) => setProjectWithBonus(val === "Ja")}
            >
              <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Option auswählen" className="data-[placeholder]:text-muted-foreground" />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100] pointer-events-auto">
                {YES_NO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Provisionen (Tarife dropdown) */}
        <div className="space-y-2 pointer-events-auto">
          <Label className="text-sm font-medium">Provisionen</Label>
          <Select 
            value={selectedTariffs[0] ?? undefined} 
            onValueChange={(val) => setSelectedTariffs([val])}
            disabled={!selectedProvider}
          >
            <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 disabled:opacity-50 pointer-events-auto">
              <SelectValue placeholder="Provisionen auswählen" className="data-[placeholder]:text-muted-foreground" />
            </SelectTrigger>
            <SelectContent className="bg-background pointer-events-auto">
              {tariffs.length === 0 ? (
                <SelectItem value="none">Keine Tarife verfügbar</SelectItem>
              ) : (
                tariffs.map((tariff: any) => (
                  <SelectItem key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Infos für Ausschreibung */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-base font-semibold">Infos für Ausschreibung</h3>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Info Text{marketingType !== 'FLYER' && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TenderInfoGenerator
            value={tenderInfo}
            onChange={setTenderInfo}
            providerName={selectedProviderData?.name}
            areaName={areaName}
            projectName={projectName}
          />
        </div>
      </div>

      {/* Upload Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-base font-semibold">Upload</h3>
        
          {/* Straßenliste */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Straßenliste (CSV/Excel)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {mappingStep === 'none' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-input rounded-lg p-8 flex items-center justify-center bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-4xl text-muted-foreground mb-2">+</div>
                  <p className="text-sm text-muted-foreground">CSV- oder Excel-Datei hochladen</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mapping erfolgt direkt nach Upload
                  </p>
                </div>
              </div>
            )}

            {/* Analyzing step */}
            {mappingStep === 'analyzing' && (
              <div className="border rounded-lg p-8">
                <div className="flex items-center justify-center gap-3 min-w-0">
                  <Loader2 className="h-6 w-6 animate-spin text-primary flex-shrink-0" />
                  <p className="text-lg truncate">Analysiere {csvFile?.name}...</p>
                </div>
              </div>
            )}

            {/* Mapping step */}
            {mappingStep === 'mapping' && (
              <div className="space-y-4">
                {savedMappingId && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      ✅ Gespeichertes Mapping gefunden ({(mappingConfidence * 100).toFixed(0)}% Übereinstimmung)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CSV-Spalte</TableHead>
                        <TableHead>Zuordnung</TableHead>
                        <TableHead>Beispiel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvHeaders.filter((header) => finalMapping[header] !== 'ignore' && finalMapping[header] !== 'house_number_addon' && finalMapping[header] !== 'provider_address_id' && finalMapping[header] !== 'latitude' && finalMapping[header] !== 'longitude').map((header) => {
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
                            <TableCell className="text-sm text-muted-foreground">
                              {csvData[0]?.[header] || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {mappingQuestions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Bitte bestätigen:</h4>
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
                  <Button 
                    variant="outline" 
                    onClick={handleResetMapping}
                    size="sm"
                    className="h-8"
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                    Reupload
                  </Button>
                  <Button 
                    onClick={handleConfirmMapping}
                    size="sm"
                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Mapping bestätigen
                  </Button>
                </div>
              </div>
            )}

            {/* Confirmed step */}
            {mappingStep === 'confirmed' && csvFile && (
              <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50 dark:bg-green-900/10">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">{csvFile.name}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Mapping bestätigt - {csvData.length} Zeilen bereit zum Import
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetMapping}
                      className="mt-2 h-7 text-xs"
                    >
                      Andere Datei wählen
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>

    {/* Submit Buttons - Fixed at bottom */}
    <div className="flex justify-end gap-3 pt-4 pb-2 px-6 border-t bg-background">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onClose}
        className="h-11 px-6"
      >
        Abbrechen
      </Button>
      <Button 
        type="submit" 
        disabled={loading || (csvFile !== null && mappingStep !== 'confirmed')}
        onClick={handleSubmit}
        className="h-11 px-6 bg-primary hover:bg-primary/90 transition-colors"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Erstelle...</span>
          </div>
        ) : (
          "Projekt erstellen"
        )}
      </Button>
    </div>
  </div>
  );
};