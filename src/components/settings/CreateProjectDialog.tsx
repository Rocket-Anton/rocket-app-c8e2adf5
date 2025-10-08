import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

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
];

const QUOTA_TYPES = [
  { value: 'Brutto', color: 'bg-purple-100 text-purple-800' },
  { value: 'Netto', color: 'bg-cyan-100 text-cyan-800' },
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
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [selectedProvider, setSelectedProvider] = useState("");
  const [areaName, setAreaName] = useState("");
  const [federalState, setFederalState] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [marketingType, setMarketingType] = useState("");
  const [providerContact, setProviderContact] = useState("");
  const [rocketCount, setRocketCount] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [shiftDate, setShiftDate] = useState<Date>();
  const [unitCount, setUnitCount] = useState("");
  const [existingCustomerCount, setExistingCustomerCount] = useState("");
  const [saleableUnits, setSaleableUnits] = useState("");
  const [quotaType, setQuotaType] = useState("");
  const [targetQuota, setTargetQuota] = useState("");
  const [importantInfo, setImportantInfo] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [telegramGroupCreate, setTelegramGroupCreate] = useState("");
  const [telegramGroupExists, setTelegramGroupExists] = useState("");
  const [postJobBooster, setPostJobBooster] = useState("");
  const [tenderInfo, setTenderInfo] = useState("");
  const [projectWithBonus, setProjectWithBonus] = useState(false);
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Load provider contacts
  const { data: providerContacts = [] } = useQuery({
    queryKey: ['provider-contacts', selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return [];
      const { data, error } = await supabase
        .from("provider_contacts")
        .select('*')
        .eq('provider_id', selectedProvider);
      if (error) throw error;
      return data || [];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProvider || !areaName || !rocketCount || !status || !targetQuota || !city || !federalState || !marketingType || !unitCount || !quotaType || !telegramGroupCreate || !postJobBooster || !tenderInfo) {
      toast.error("Bitte füllen Sie alle Pflichtfelder (*) aus");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Geocode the project location if city and postal code are provided
      let coordinates = null;
      if (city && postalCode) {
        const { geocodeAddress } = await import("@/utils/geocoding");
        const result = await geocodeAddress(
          city, // Use city as street for project geocoding
          "", // No house number for projects
          postalCode,
          city
        );
        
        if (result.coordinates) {
          coordinates = result.coordinates;
          console.log("Project geocoded successfully:", coordinates);
        } else {
          console.warn("Failed to geocode project:", result.error);
          // Continue anyway - geocoding is not critical for project creation
        }
      }

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
          provider_contact_id: providerContact || null,
          rocket_count: parseInt(rocketCount),
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null,
          shift_date: shiftDate?.toISOString() || null,
          unit_count: unitCount ? parseInt(unitCount) : null,
          existing_customer_count: existingCustomerCount ? parseInt(existingCustomerCount) : null,
          saleable_units: saleableUnits ? parseInt(saleableUnits) : null,
          quota_type: quotaType || null,
          target_quota: parseFloat(targetQuota),
          important_info: importantInfo || null,
          project_manager_id: projectManager || null,
          telegram_group_create: telegramGroupCreate || null,
          telegram_group_exists: telegramGroupExists || null,
          post_job_booster: postJobBooster || null,
          tender_info: tenderInfo || null,
          project_with_bonus: projectWithBonus,
          coordinates: coordinates,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert tariffs
      if (selectedTariffs.length > 0 && project) {
        const tariffInserts = selectedTariffs.map(tariffId => ({
          project_id: project.id,
          tariff_id: tariffId,
        }));
        
        const { error: tariffError } = await supabase
          .from("project_tariffs")
          .insert(tariffInserts);
        
        if (tariffError) throw tariffError;
      }

      // Insert addons
      if (selectedAddons.length > 0 && project) {
        const addonInserts = selectedAddons.map(addonId => ({
          project_id: project.id,
          addon_id: addonId,
        }));
        
        const { error: addonError } = await supabase
          .from("project_addons")
          .insert(addonInserts);
        
        if (addonError) throw addonError;
      }

      toast.success("Projekt erfolgreich erstellt");
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Fehler beim Erstellen des Projekts");
    } finally {
      setLoading(false);
    }
  };

  const activeProviders = providers
    .filter(p => p.is_active)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Generate project name from provider abbreviation and area name
  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const projectName = selectedProviderData?.abbreviation && areaName 
    ? `${selectedProviderData.abbreviation} - ${areaName}`
    : areaName || "";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
      {/* Provider */}
      <div className="space-y-2">
        <Label>Provider<span className="text-red-500">*</span></Label>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Provider" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {activeProviders.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gebiet Name */}
      <div className="space-y-2">
        <Label>Gebiet Name<span className="text-red-500">*</span></Label>
        <Input
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          placeholder="ZB. Lurup 1"
          className="bg-background"
        />
        {projectName && (
          <p className="text-xs text-muted-foreground">
            Projektname: <span className="font-medium">{projectName}</span>
          </p>
        )}
      </div>

      {/* Bundesland */}
      <div className="space-y-2">
        <Label>Bundesland<span className="text-red-500">*</span></Label>
        <Select value={federalState} onValueChange={setFederalState}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Bundesland" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {FEDERAL_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status<span className="text-red-500">*</span></Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Status" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ort */}
      <div className="space-y-2">
        <Label>Ort<span className="text-red-500">*</span></Label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ort eingeben"
          className="bg-background"
        />
      </div>

      {/* PLZ */}
      <div className="space-y-2">
        <Label>PLZ</Label>
        <Input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="PLZ eingeben"
          className="bg-background"
        />
      </div>

      {/* Vermarktungsart */}
      <div className="space-y-2">
        <Label>Vermarktungsart<span className="text-red-500">*</span></Label>
        <Select value={marketingType} onValueChange={setMarketingType}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Vermarktungsart" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {MARKETING_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ansprechpartner Provider */}
      <div className="space-y-2">
        <Label>Ansprechpartner Provider</Label>
        <Select value={providerContact} onValueChange={setProviderContact} disabled={!selectedProvider}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select an Ansprechpartner" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {providerContacts.length === 0 ? (
              <SelectItem value="none">Keine Ansprechpartner vorhanden</SelectItem>
            ) : (
              providerContacts.map((contact: any) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Anzahl Raketen Soll */}
      <div className="space-y-2">
        <Label>Anzahl Raketen Soll<span className="text-red-500">*</span></Label>
        <Input
          type="number"
          value={rocketCount}
          onChange={(e) => setRocketCount(e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>

      {/* Startdatum */}
      <div className="space-y-2">
        <Label>Startdatum<span className="text-red-500">*</span></Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd.MM.yyyy") : "Datum auswählen"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Enddatum */}
      <div className="space-y-2">
        <Label>Enddatum<span className="text-red-500">*</span></Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd.MM.yyyy") : "Datum auswählen"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Anzahl WE */}
      <div className="space-y-2">
        <Label>Anzahl WE<span className="text-red-500">*</span></Label>
        <Input
          type="number"
          value={unitCount}
          onChange={(e) => setUnitCount(e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>

      {/* Anzahl der Bestandskunden */}
      <div className="space-y-2">
        <Label>Anzahl der Bestandskunden</Label>
        <Input
          type="number"
          value={existingCustomerCount}
          onChange={(e) => setExistingCustomerCount(e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>

      {/* Saleable WE */}
      <div className="space-y-2">
        <Label>Saleable WE</Label>
        <Input
          type="number"
          value={saleableUnits}
          onChange={(e) => setSaleableUnits(e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>

      {/* Art Quote */}
      <div className="space-y-2">
        <Label>Art Quote<span className="text-red-500">*</span></Label>
        <Select value={quotaType} onValueChange={setQuotaType}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Art Quote" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {QUOTA_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zielquote */}
      <div className="space-y-2">
        <Label>Zielquote<span className="text-red-500">*</span></Label>
        <Input
          type="number"
          step="0.01"
          value={targetQuota}
          onChange={(e) => setTargetQuota(e.target.value)}
          placeholder="0.00"
          className="bg-background"
        />
      </div>

      {/* Wichtige Infos */}
      <div className="space-y-2">
        <Label>Wichtige Infos</Label>
        <Textarea
          value={importantInfo}
          onChange={(e) => setImportantInfo(e.target.value)}
          placeholder="Wichtige Informationen..."
          rows={3}
          className="bg-background"
        />
      </div>

      {/* Projektleiter Neu */}
      <div className="space-y-2">
        <Label>Projektleiter Neu</Label>
        <Select value={projectManager} onValueChange={setProjectManager}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Projektleiter" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
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
      <div className="space-y-2">
        <Label>Telegram Gruppe erstellen<span className="text-red-500">*</span></Label>
        <Select value={telegramGroupCreate} onValueChange={setTelegramGroupCreate}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Telegram Gruppe erstellen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {TG_GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobbooster posten */}
      <div className="space-y-2">
        <Label>Jobbooster posten<span className="text-red-500">*</span></Label>
        <Select value={postJobBooster} onValueChange={setPostJobBooster}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select a Jobbooster" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
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
        <h3 className="text-lg font-semibold">Provisionen</h3>
        
        {/* Projekt mit Bonus */}
        <div className="space-y-2">
          <Label>Projekt mit Bonus<span className="text-red-500">*</span></Label>
          <Select 
            value={projectWithBonus ? "Ja" : "Nein"} 
            onValueChange={(val) => setProjectWithBonus(val === "Ja")}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a Projekt mit Bonus" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {YES_NO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provisionen (Tarife dropdown) */}
        <div className="space-y-2">
          <Label>Provisionen</Label>
          <Select 
            value={selectedTariffs[0] || ""} 
            onValueChange={(val) => setSelectedTariffs([val])}
            disabled={!selectedProvider}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select Provisionen" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
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
        <h3 className="text-lg font-semibold">Infos für Ausschreibung</h3>
        
        <div className="space-y-2">
          <Label>Info Text<span className="text-red-500">*</span></Label>
          <Textarea
            value={tenderInfo}
            onChange={(e) => setTenderInfo(e.target.value)}
            placeholder="Informationen für die Ausschreibung..."
            rows={6}
            className="bg-background"
          />
        </div>
      </div>

      {/* Upload Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">Upload</h3>
        
        {/* Straßenliste */}
        <div className="space-y-2">
          <Label>Straßenliste</Label>
          <div className="border-2 border-dashed rounded-lg p-8 flex items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="text-center">
              <div className="text-4xl text-muted-foreground mb-2">+</div>
              <p className="text-sm text-muted-foreground">Datei hochladen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
        <Button type="button" variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Erstelle..." : "Projekt erstellen"}
        </Button>
      </div>
    </form>
  );
};