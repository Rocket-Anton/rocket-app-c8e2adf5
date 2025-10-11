import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Link as LinkIcon } from "lucide-react";
import { useExtendedRole, useAgencySettings } from "@/hooks/useExtendedRole";

interface AgencySettingsProps {
  userId: string;
}

export const AgencySettings = ({ userId }: AgencySettingsProps) => {
  const queryClient = useQueryClient();
  const { data: extendedRole } = useExtendedRole(userId);
  const { data: agencySettings } = useAgencySettings(userId);
  
  const [formData, setFormData] = useState({
    custom_user_label: agencySettings?.custom_user_label || "Rakete",
    custom_user_label_plural: agencySettings?.custom_user_label_plural || "Raketen",
    show_financial_data: agencySettings?.show_financial_data || false,
    show_commissions: agencySettings?.show_commissions || false,
    show_invoices: agencySettings?.show_invoices || false,
    custom_company_name: agencySettings?.custom_company_name || "",
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agency_settings')
        .upsert({
          agency_owner_id: userId,
          ...formData,
        }, {
          onConflict: 'agency_owner_id'
        });

      if (error) throw error;

      toast.success('Agentur-Einstellungen gespeichert');
      queryClient.invalidateQueries({ queryKey: ['agency-settings', userId] });
    } catch (error) {
      console.error('Error saving agency settings:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-referral-code', {
        body: { userId }
      });

      if (error) throw error;

      toast.success('Referral-Code generiert');
      queryClient.invalidateQueries({ queryKey: ['extended-role', userId] });
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Fehler beim Generieren des Referral-Codes');
    }
  };

  if (!extendedRole?.agency_enabled) {
    return <div>Keine Agentur-Berechtigung</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding & Labels</CardTitle>
          <CardDescription>
            Passen Sie an, wie Ihre Vertriebler genannt werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="custom_user_label">Singular (z.B. "Vertriebler")</Label>
            <Input
              id="custom_user_label"
              value={formData.custom_user_label}
              onChange={(e) => setFormData({ ...formData, custom_user_label: e.target.value })}
              placeholder="Rakete"
            />
          </div>
          <div>
            <Label htmlFor="custom_user_label_plural">Plural (z.B. "Vertriebler")</Label>
            <Input
              id="custom_user_label_plural"
              value={formData.custom_user_label_plural}
              onChange={(e) => setFormData({ ...formData, custom_user_label_plural: e.target.value })}
              placeholder="Raketen"
            />
          </div>
          <div>
            <Label htmlFor="custom_company_name">Firmenname (optional)</Label>
            <Input
              id="custom_company_name"
              value={formData.custom_company_name}
              onChange={(e) => setFormData({ ...formData, custom_company_name: e.target.value })}
              placeholder="Ihre Firma GmbH"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sichtbarkeitseinstellungen</CardTitle>
          <CardDescription>
            Legen Sie fest, was Ihre Agency-User sehen dürfen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Finanzielle Daten anzeigen</Label>
              <p className="text-sm text-muted-foreground">
                Umsätze und Geldbeträge
              </p>
            </div>
            <Switch
              checked={formData.show_financial_data}
              onCheckedChange={(checked) => setFormData({ ...formData, show_financial_data: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Provisionen anzeigen</Label>
              <p className="text-sm text-muted-foreground">
                Provisionssätze und -übersichten
              </p>
            </div>
            <Switch
              checked={formData.show_commissions}
              onCheckedChange={(checked) => setFormData({ ...formData, show_commissions: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Abrechnungen anzeigen</Label>
              <p className="text-sm text-muted-foreground">
                Gutschriften und Rechnungen
              </p>
            </div>
            <Switch
              checked={formData.show_invoices}
              onCheckedChange={(checked) => setFormData({ ...formData, show_invoices: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {extendedRole.affiliate_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Affiliate-Link</CardTitle>
            <CardDescription>
              Ihr persönlicher Werbe-Link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {extendedRole.referral_code ? (
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/signup?ref=${extendedRole.referral_code}`}
                  readOnly
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${extendedRole.referral_code}`);
                    toast.success('Link kopiert');
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={generateReferralCode}>
                Referral-Code generieren
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
};
