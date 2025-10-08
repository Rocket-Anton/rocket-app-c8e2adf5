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
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [areaName, setAreaName] = useState("");
  const [federalState, setFederalState] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [marketingType, setMarketingType] = useState<string | undefined>(undefined);
  const [providerContact, setProviderContact] = useState<string | undefined>(undefined);
  const [rocketCount, setRocketCount] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [shiftDate, setShiftDate] = useState<Date>();
  const [unitCount, setUnitCount] = useState("");
  const [existingCustomerCount, setExistingCustomerCount] = useState("");
  const [saleableUnits, setSaleableUnits] = useState("");
  const [quotaType, setQuotaType] = useState<string | undefined>(undefined);
  const [targetQuota, setTargetQuota] = useState("");
  const [importantInfo, setImportantInfo] = useState("");
  const [projectManager, setProjectManager] = useState<string | undefined>(undefined);
  const [telegramGroupCreate, setTelegramGroupCreate] = useState<string | undefined>(undefined);
  const [telegramGroupExists, setTelegramGroupExists] = useState<string | undefined>(undefined);
  const [postJobBooster, setPostJobBooster] = useState<string | undefined>(undefined);
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
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Fixed divider line */}
      <div className="px-6 pt-2 pb-4 border-b"></div>
      
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 pointer-events-auto">
        <div className="space-y-6 pointer-events-auto">
          {/* Provider */}
          <div className="space-y-2 pointer-events-auto">
            <Label htmlFor="provider" className="text-sm font-medium text-foreground">
              Provider<span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider" className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
                <SelectValue placeholder="Provider auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100] pointer-events-auto">
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

      {/* Bundesland */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">
          Bundesland<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select value={federalState} onValueChange={setFederalState}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Bundesland auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
        <Label className="text-sm font-medium">
          Ort<span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ort eingeben"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
      </div>

      {/* PLZ */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">PLZ</Label>
        <Input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="PLZ eingeben"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
      </div>

      {/* Vermarktungsart */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">
          Vermarktungsart<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select value={marketingType} onValueChange={setMarketingType}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Vermarktungsart auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
            {MARKETING_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ansprechpartner Provider */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">Ansprechpartner Provider</Label>
        <Select value={providerContact} onValueChange={setProviderContact} disabled={!selectedProvider}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 disabled:opacity-50 pointer-events-auto">
            <SelectValue placeholder="Ansprechpartner auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
        <Label className="text-sm font-medium">
          Anzahl Raketen Soll<span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          type="number"
          value={rocketCount}
          onChange={(e) => setRocketCount(e.target.value)}
          placeholder="0"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
      </div>

      {/* Startdatum */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Startdatum<span className="text-red-500 ml-1">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal bg-background border border-input hover:border-primary/50 transition-colors h-11"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className={startDate ? "text-foreground" : "text-muted-foreground"}>
                {startDate ? format(startDate, "dd.MM.yyyy") : "Datum auswählen"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-[100] pointer-events-auto" align="start">
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
        <Label className="text-sm font-medium">
          Enddatum<span className="text-red-500 ml-1">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal bg-background border border-input hover:border-primary/50 transition-colors h-11"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className={endDate ? "text-foreground" : "text-muted-foreground"}>
                {endDate ? format(endDate, "dd.MM.yyyy") : "Datum auswählen"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-[100] pointer-events-auto" align="start">
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

      {/* Anzahl der Bestandskunden */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Anzahl der Bestandskunden</Label>
        <Input
          type="number"
          value={existingCustomerCount}
          onChange={(e) => setExistingCustomerCount(e.target.value)}
          placeholder="0"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
      </div>

      {/* Saleable WE */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Saleable WE</Label>
        <Input
          type="number"
          value={saleableUnits}
          onChange={(e) => setSaleableUnits(e.target.value)}
          placeholder="0"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
      </div>

      {/* Art Quote */}
      <div className="space-y-2 pointer-events-auto">
        <Label className="text-sm font-medium">
          Art Quote<span className="text-red-500 ml-1">*</span>
        </Label>
        <Select value={quotaType} onValueChange={setQuotaType}>
          <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
            <SelectValue placeholder="Art Quote auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
        <Label className="text-sm font-medium">
          Zielquote<span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          type="number"
          step="0.01"
          value={targetQuota}
          onChange={(e) => setTargetQuota(e.target.value)}
          placeholder="0.00"
          className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors h-11"
        />
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
            <SelectValue placeholder="Projektleiter auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
            <SelectValue placeholder="Option auswählen" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[100] pointer-events-auto">
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
            <SelectValue placeholder="Option auswählen" />
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

      {/* Provisionen Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-base font-semibold">Provisionen</h3>
        
        {/* Projekt mit Bonus */}
        <div className="space-y-2 pointer-events-auto">
          <Label className="text-sm font-medium">
            Projekt mit Bonus<span className="text-red-500 ml-1">*</span>
          </Label>
          <Select 
            value={projectWithBonus ? "Ja" : "Nein"} 
            onValueChange={(val) => setProjectWithBonus(val === "Ja")}
          >
            <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 pointer-events-auto">
              <SelectValue placeholder="Option auswählen" />
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

        {/* Provisionen (Tarife dropdown) */}
        <div className="space-y-2 pointer-events-auto">
          <Label className="text-sm font-medium">Provisionen</Label>
          <Select 
            value={selectedTariffs[0] || ""} 
            onValueChange={(val) => setSelectedTariffs([val])}
            disabled={!selectedProvider}
          >
            <SelectTrigger className="bg-background border border-input hover:border-primary/50 transition-colors h-11 disabled:opacity-50 pointer-events-auto">
              <SelectValue placeholder="Provisionen auswählen" />
            </SelectTrigger>
            <SelectContent className="bg-background z-[100] pointer-events-auto">
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
            Info Text<span className="text-red-500 ml-1">*</span>
          </Label>
          <Textarea
            value={tenderInfo}
            onChange={(e) => setTenderInfo(e.target.value)}
            placeholder="Informationen für die Ausschreibung eingeben..."
            rows={6}
            className="bg-background border border-input hover:border-primary/50 focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>

      {/* Upload Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-base font-semibold">Upload</h3>
        
          {/* Straßenliste */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Straßenliste</Label>
            <div className="border-2 border-dashed border-input rounded-lg p-8 flex items-center justify-center bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer">
              <div className="text-center">
                <div className="text-4xl text-muted-foreground mb-2">+</div>
                <p className="text-sm text-muted-foreground">Datei hochladen</p>
              </div>
            </div>
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
        disabled={loading}
        onClick={handleSubmit}
        className="h-11 px-6 bg-primary hover:bg-primary/90 transition-colors"
      >
        {loading ? "Erstelle..." : "Projekt erstellen"}
      </Button>
    </div>
  </div>
  );
};