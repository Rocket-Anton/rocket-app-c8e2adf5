import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MAPBOX_ACCESS_TOKEN } from "@/config/mapbox";

const GERMAN_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", 
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", 
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", 
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
];

const MARKETING_TYPES = [
  { value: "VVM", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "BVM", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "RVM", color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "NVM", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "ENERGIE", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "PV LEADS", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "ADRESSERMITTLUNG", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "GEE-VERTRIEB", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "VVM-BK", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "FLYER", color: "bg-amber-100 text-amber-800 border-amber-200" }
];

const QUOTA_TYPES = [
  { value: "Brutto", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "Netto", color: "bg-cyan-100 text-cyan-800 border-cyan-200" }
];

const TG_OPTIONS = [
  { value: "Ja", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "Nein", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "TG Gruppe existiert", color: "bg-blue-100 text-blue-800 border-blue-200" }
];

const JOB_BOOSTER_OPTIONS = [
  { value: "Ja", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "Nein", color: "bg-pink-100 text-pink-800 border-pink-200" }
];

const STATUS_OPTIONS = ['In Planung', 'Läuft', 'Abgeschlossen'];

interface CreateProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateProjectForm = ({ onSuccess, onCancel }: CreateProjectFormProps) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [shiftDate, setShiftDate] = useState<Date>();
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    areaName: "",
    federalState: "",
    status: "",
    city: "",
    postalCode: "",
    marketingType: "",
    providerContactId: "",
    rocketCount: "",
    unitCount: "",
    existingCustomerCount: "",
    saleableUnits: "",
    quotaType: "",
    targetQuota: "",
    importantInfo: "",
    projectManagerId: "",
    telegramGroupCreate: "",
    postJobBooster: "",
    tenderInfo: "",
    projectWithBonus: false,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['active-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['provider-contacts', selectedProviderId],
    queryFn: async () => {
      if (!selectedProviderId) return [];
      const { data, error } = await supabase
        .from('provider_contacts')
        .select('*')
        .eq('provider_id', selectedProviderId)
        .order('first_name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProviderId,
  });

  const { data: tariffs = [] } = useQuery({
    queryKey: ['provider-tariffs', selectedProviderId],
    queryFn: async () => {
      if (!selectedProviderId) return [];
      const { data, error } = await supabase
        .from('tariffs')
        .select('*')
        .eq('provider_id', selectedProviderId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProviderId,
  });

  const { data: addons = [] } = useQuery({
    queryKey: ['provider-addons', selectedProviderId],
    queryFn: async () => {
      if (!selectedProviderId) return [];
      const { data, error } = await supabase
        .from('addons')
        .select('*')
        .eq('provider_id', selectedProviderId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProviderId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProviderId || !formData.areaName || !formData.rocketCount) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Geocode city if provided and no coordinates exist
      let coordinates = null;
      if (formData.city && formData.city.trim()) {
        try {
          console.log('Geocoding city:', formData.city);
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formData.city)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=DE&limit=1`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            coordinates = { lat, lng };
            console.log(`Geocoded ${formData.city} to`, coordinates);
          }
        } catch (geocodeError) {
          console.error('Error geocoding city:', geocodeError);
          // Continue without coordinates
        }
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.areaName,
          provider_id: selectedProviderId,
          status: formData.status,
          area_name: formData.areaName,
          federal_state: formData.federalState,
          city: formData.city,
          postal_code: formData.postalCode,
          coordinates: coordinates,
          marketing_type: formData.marketingType,
          provider_contact_id: formData.providerContactId || null,
          rocket_count: parseInt(formData.rocketCount),
          start_date: startDate?.toISOString().split('T')[0],
          end_date: endDate?.toISOString().split('T')[0],
          shift_date: shiftDate?.toISOString().split('T')[0],
          unit_count: formData.unitCount ? parseInt(formData.unitCount) : null,
          existing_customer_count: formData.existingCustomerCount ? parseInt(formData.existingCustomerCount) : null,
          saleable_units: formData.saleableUnits ? parseInt(formData.saleableUnits) : null,
          quota_type: formData.quotaType,
          target_quota: formData.targetQuota ? parseFloat(formData.targetQuota) : null,
          important_info: formData.importantInfo,
          project_manager_id: formData.projectManagerId || null,
          telegram_group_create: formData.telegramGroupCreate,
          post_job_booster: formData.postJobBooster,
          tender_info: formData.tenderInfo,
          project_with_bonus: formData.projectWithBonus,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert tariffs
      if (selectedTariffs.length > 0) {
        const tariffInserts = selectedTariffs.map(tariffId => ({
          project_id: project.id,
          tariff_id: tariffId,
        }));
        const { error: tariffsError } = await supabase
          .from('project_tariffs')
          .insert(tariffInserts);
        if (tariffsError) throw tariffsError;
      }

      // Insert addons
      if (selectedAddons.length > 0) {
        const addonInserts = selectedAddons.map(addonId => ({
          project_id: project.id,
          addon_id: addonId,
        }));
        const { error: addonsError } = await supabase
          .from('project_addons')
          .insert(addonInserts);
        if (addonsError) throw addonsError;
      }

      // Handle CSV upload if file is provided
      if (uploadFile) {
        try {
          console.log('Processing uploaded CSV for project:', project.id);
          
          // Parse CSV/Excel
          const isExcel = uploadFile.name.endsWith('.xlsx') || uploadFile.name.endsWith('.xls');
          let csvData: any[] = [];
          let csvHeaders: string[] = [];

          if (isExcel) {
            const reader = new FileReader();
            const fileContent = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsBinaryString(uploadFile);
            });

            const XLSX = await import('xlsx');
            const workbook = XLSX.read(fileContent, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            csvHeaders = jsonData[0] as string[];
            csvData = jsonData.slice(1).map((row: any) => {
              const obj: any = {};
              row.forEach((cell: any, idx: number) => {
                obj[csvHeaders[idx]] = cell;
              });
              return obj;
            });
          } else {
            const Papa = await import('papaparse');
            const parseResult = await new Promise<any>((resolve, reject) => {
              Papa.parse(uploadFile, {
                header: true,
                skipEmptyLines: true,
                complete: resolve,
                error: reject,
              });
            });
            csvData = parseResult.data;
            csvHeaders = parseResult.meta.fields || [];
          }

          // Analyze CSV structure
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
            'analyze-csv-structure',
            {
              body: {
                csvHeaders,
                sampleRows: csvData.slice(0, 5),
                providerId: selectedProviderId,
              },
            }
          );

          if (analysisError) throw analysisError;

          // Create project_address_lists record
          const { data: addressList, error: listError } = await supabase
            .from('project_address_lists')
            .insert({
              project_id: project.id,
              name: `Import vom ${new Date().toLocaleDateString('de-DE')}`,
              status: 'pending',
              created_by: userData.user.id,
              column_mapping: analysisData.suggested_mapping,
              file_name: uploadFile.name,
            })
            .select()
            .single();

          if (listError) throw listError;

          // Trigger upload-street-list function
          const { error: uploadError } = await supabase.functions.invoke('upload-street-list', {
            body: {
              listId: addressList.id,
              csvData: JSON.stringify(csvData),
              columnMapping: analysisData.suggested_mapping,
              questionAnswers: {},
            },
          });

          if (uploadError) throw uploadError;

          toast.success("Projekt erstellt. Adressliste wird importiert...");
        } catch (uploadError: any) {
          console.error('Error uploading address list:', uploadError);
          toast.error(`Projekt erstellt, aber Fehler beim CSV-Upload: ${uploadError.message}`);
        }
      } else {
        toast.success("Projekt erfolgreich erstellt");
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(`Fehler beim Erstellen: ${error.message}`);
    }
  };

  const toggleTariff = (tariffId: string) => {
    setSelectedTariffs(prev => 
      prev.includes(tariffId) 
        ? prev.filter(id => id !== tariffId)
        : [...prev, tariffId]
    );
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      {/* Provider */}
      <div className="space-y-2">
        <Label>Provider *</Label>
        <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
          <SelectTrigger>
            <SelectValue placeholder="Provider auswählen" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bundesland */}
      <div className="space-y-2">
        <Label>Bundesland</Label>
        <Select value={formData.federalState} onValueChange={(value) => setFormData({...formData, federalState: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Bundesland auswählen" />
          </SelectTrigger>
          <SelectContent>
            {GERMAN_STATES.map(state => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ort */}
      <div className="space-y-2">
        <Label>Ort</Label>
        <Input 
          value={formData.city}
          onChange={(e) => setFormData({...formData, city: e.target.value})}
          placeholder="Ort eingeben"
        />
      </div>

      {/* Postleitzahl */}
      <div className="space-y-2">
        <Label>Postleitzahl</Label>
        <Input 
          type="number"
          value={formData.postalCode}
          onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
          placeholder="PLZ eingeben"
        />
      </div>

      {/* Gebietsname - nur anzeigen wenn Ort vorhanden */}
      {formData.city && formData.city.trim().length > 0 && (
        <div className="space-y-2">
          <Label>Gebietsname *</Label>
          <Input 
            value={formData.areaName}
            onChange={(e) => setFormData({...formData, areaName: e.target.value})}
            placeholder="Gebietsname eingeben"
          />
        </div>
      )}

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vermarktungsart */}
      <div className="space-y-2">
        <Label>Vermarktungsart</Label>
        <Select value={formData.marketingType} onValueChange={(value) => setFormData({...formData, marketingType: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Vermarktungsart auswählen" />
          </SelectTrigger>
          <SelectContent>
            {MARKETING_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <Badge variant="outline" className={cn("text-xs", type.color)}>
                  {type.value}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ansprechpartner Provider */}
      {selectedProviderId && (
        <div className="space-y-2">
          <Label>Ansprechpartner Provider</Label>
          <Select value={formData.providerContactId} onValueChange={(value) => setFormData({...formData, providerContactId: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Ansprechpartner auswählen" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Anzahl Raketen */}
      <div className="space-y-2">
        <Label>Anzahl Raketen *</Label>
        <Input 
          type="number"
          value={formData.rocketCount}
          onChange={(e) => setFormData({...formData, rocketCount: e.target.value})}
          placeholder="Anzahl eingeben"
        />
      </div>

      {/* Startdatum */}
      <div className="space-y-2">
        <Label>Startdatum</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : "Datum auswählen"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Enddatum */}
      <div className="space-y-2">
        <Label>Enddatum</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP") : "Datum auswählen"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Was auf Schicht */}
      <div className="space-y-2">
        <Label>Was auf Schicht</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !shiftDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {shiftDate ? format(shiftDate, "PPP") : "Datum auswählen"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={shiftDate} onSelect={setShiftDate} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Anzahl WE */}
      <div className="space-y-2">
        <Label>Anzahl WE</Label>
        <Input 
          type="number"
          value={formData.unitCount}
          onChange={(e) => setFormData({...formData, unitCount: e.target.value})}
          placeholder="Anzahl eingeben"
        />
      </div>

      {/* Anzahl Bestandskunden */}
      <div className="space-y-2">
        <Label>Anzahl Bestandskunden</Label>
        <Input 
          type="number"
          value={formData.existingCustomerCount}
          onChange={(e) => setFormData({...formData, existingCustomerCount: e.target.value})}
          placeholder="Anzahl eingeben"
        />
      </div>

      {/* Saleable WE */}
      <div className="space-y-2">
        <Label>Saleable WE</Label>
        <Input 
          type="number"
          value={formData.saleableUnits}
          onChange={(e) => setFormData({...formData, saleableUnits: e.target.value})}
          placeholder="Anzahl eingeben"
        />
      </div>

      {/* Art Quote */}
      <div className="space-y-2">
        <Label>Art Quote</Label>
        <Select value={formData.quotaType} onValueChange={(value) => setFormData({...formData, quotaType: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Art auswählen" />
          </SelectTrigger>
          <SelectContent>
            {QUOTA_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <Badge variant="outline" className={cn("text-xs", type.color)}>
                  {type.value}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zielquote */}
      <div className="space-y-2">
        <Label>Zielquote (%) *</Label>
        <Input 
          type="number"
          step="0.01"
          value={formData.targetQuota}
          onChange={(e) => setFormData({...formData, targetQuota: e.target.value})}
          placeholder="Zielquote eingeben"
        />
      </div>

      {/* Wichtige Infos */}
      <div className="space-y-2">
        <Label>Wichtige Infos</Label>
        <Textarea 
          value={formData.importantInfo}
          onChange={(e) => setFormData({...formData, importantInfo: e.target.value})}
          placeholder="Wichtige Informationen eingeben"
        />
      </div>

      {/* Telegram-Gruppe erstellen */}
      <div className="space-y-2">
        <Label>Telegram-Gruppe erstellen</Label>
        <Select value={formData.telegramGroupCreate} onValueChange={(value) => setFormData({...formData, telegramGroupCreate: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Option auswählen" />
          </SelectTrigger>
          <SelectContent>
            {TG_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <Badge variant="outline" className={cn("text-xs", option.color)}>
                  {option.value}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Booster posten */}
      <div className="space-y-2">
        <Label>Job Booster posten</Label>
        <Select value={formData.postJobBooster} onValueChange={(value) => setFormData({...formData, postJobBooster: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Option auswählen" />
          </SelectTrigger>
          <SelectContent>
            {JOB_BOOSTER_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <Badge variant="outline" className={cn("text-xs", option.color)}>
                  {option.value}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Infos für Ausschreibung */}
      <div className="space-y-2">
        <Label>Infos für Ausschreibung</Label>
        <Textarea 
          value={formData.tenderInfo}
          onChange={(e) => setFormData({...formData, tenderInfo: e.target.value})}
          placeholder="Informationen für Ausschreibung eingeben"
          rows={4}
        />
      </div>

      {/* Provision Section */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-lg">Provision</h3>
        
        {/* Projekt mit Bonus */}
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            checked={formData.projectWithBonus}
            onChange={(e) => setFormData({...formData, projectWithBonus: e.target.checked})}
            className="h-4 w-4"
          />
          <Label>Projekt mit Bonus</Label>
        </div>

        {/* Tarife */}
        {selectedProviderId && tariffs.length > 0 && (
          <div className="space-y-2">
            <Label>Provision (Tarife)</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {tariffs.map(tariff => (
                <div key={tariff.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={selectedTariffs.includes(tariff.id)}
                    onChange={() => toggleTariff(tariff.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{tariff.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zusätze */}
        {selectedProviderId && addons.length > 0 && (
          <div className="space-y-2">
            <Label>Zusätze</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {addons.map(addon => (
                <div key={addon.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={selectedAddons.includes(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{addon.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Straßenliste Upload */}
      <div className="space-y-2">
        <Label>Straßenliste hochladen (optional)</Label>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
        />
        {uploadFile && (
          <p className="text-sm text-muted-foreground">
            Datei ausgewählt: {uploadFile.name}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Abbrechen
        </Button>
        <Button type="submit" className="flex-1">
          Projekt erstellen
        </Button>
      </div>
    </form>
  );
};