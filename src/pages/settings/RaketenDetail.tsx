import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Shield, Building2, UserCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useExtendedRole } from "@/hooks/useExtendedRole";
import { useActualUserRole } from "@/hooks/useUserRole";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { useAgencyUsers } from "@/hooks/useAgencyUsers";

const RaketenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: actualRole } = useActualUserRole();
  const isSuperAdmin = actualRole === 'super_admin';

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['rakete-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      // Get email
      try {
        const { data: emailData } = await supabase.functions.invoke('get-user-email', {
          body: { userId: id }
        });
        return { ...data, email: emailData?.email };
      } catch {
        return data;
      }
    },
    enabled: !!id,
  });

  // Fetch role data
  const { data: roleData } = useQuery({
    queryKey: ['rakete-role', id],
    queryFn: async () => {
      if (!id) return null;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();

      return data;
    },
    enabled: !!id,
  });

  // Fetch extended role
  const { data: extendedRole } = useExtendedRole(id);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['rakete-projects', id],
    queryFn: async () => {
      if (!id) return [];

      const { data } = await supabase
        .from('project_rockets')
        .select(`
          project_id,
          projects (
            id,
            name,
            status,
            area_name,
            city
          )
        `)
        .eq('user_id', id);

      return data?.map((pr: any) => pr.projects).filter(Boolean) || [];
    },
    enabled: !!id,
  });

  // Fetch agency users if this is an agency owner
  const { data: agencyUsers = [] } = useAgencyUsers(
    extendedRole?.agency_enabled ? id : undefined
  );

  if (profileLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
          <DashboardSidebar />
          <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
            <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
              <div className="w-full max-w-7xl mx-auto p-6">
                <Skeleton className="h-10 w-32 mb-6" />
                <Skeleton className="h-8 w-64 mb-6" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!profile) {
    return (
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
          <DashboardSidebar />
          <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
            <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
              <div className="w-full max-w-7xl mx-auto p-6">
                <Button variant="ghost" onClick={() => navigate("/settings/raketen")} className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <div className="bg-card p-6 rounded-lg border">
                  <p>Rakete nicht gefunden</p>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
          <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="w-full max-w-7xl mx-auto p-6">
              <Button variant="ghost" onClick={() => navigate("/settings/raketen")} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>

              {/* Header with Avatar and Basic Info */}
              <div className="flex items-start gap-6 mb-6">
                <Avatar className="h-24 w-24" style={{ backgroundColor: profile.color }}>
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-white text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="bg-green-500">
                      {roleData?.role === 'super_admin' ? 'Super Admin' : 
                       roleData?.role === 'admin' ? 'Admin' : 'Rakete'}
                    </Badge>
                    {extendedRole?.project_manager_enabled && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Projektleiter
                      </Badge>
                    )}
                    {extendedRole?.affiliate_enabled && (
                      <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-500">
                        <UserCheck className="h-3 w-3" />
                        Affiliate
                      </Badge>
                    )}
                    {extendedRole?.agency_enabled && (
                      <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-500">
                        <Building2 className="h-3 w-3" />
                        Agentur
                      </Badge>
                    )}
                    {extendedRole?.whitelabel_enabled && (
                      <Badge variant="secondary" className="gap-1 bg-indigo-500/10 text-indigo-500">
                        <Sparkles className="h-3 w-3" />
                        White-Label
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {(profile as any).email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {(profile as any).email}
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {profile.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs for different sections */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="projects">Projekte</TabsTrigger>
                  {extendedRole?.affiliate_enabled && (
                    <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
                  )}
                  {extendedRole?.agency_enabled && (
                    <TabsTrigger value="agency">Agentur</TabsTrigger>
                  )}
                  {isSuperAdmin && extendedRole?.agency_enabled && (
                    <TabsTrigger value="agency-settings">Agentur-Einstellungen</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basisinformationen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Vorname</p>
                          <p className="font-medium">{profile.first_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nachname</p>
                          <p className="font-medium">{profile.last_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">E-Mail</p>
                          <p className="font-medium">{(profile as any).email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Telefon</p>
                          <p className="font-medium">{profile.phone || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Zugewiesene Projekte</CardTitle>
                      <CardDescription>
                        {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {projects.length === 0 ? (
                        <p className="text-muted-foreground">Keine Projekte zugewiesen</p>
                      ) : (
                        <div className="space-y-2">
                          {projects.map((project: any) => (
                            <div
                              key={project.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => navigate(`/settings/projects/${project.id}`)}
                            >
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {project.area_name} • {project.city}
                                </p>
                              </div>
                              <Badge variant="secondary">{project.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {extendedRole?.affiliate_enabled && (
                  <TabsContent value="affiliate" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Affiliate-Statistiken</CardTitle>
                        <CardDescription>
                          Übersicht der Affiliate-Performance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Affiliate-Statistiken werden in Kürze verfügbar sein
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {extendedRole?.agency_enabled && (
                  <TabsContent value="agency" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Agentur-Team</CardTitle>
                        <CardDescription>
                          {agencyUsers.length} {agencyUsers.length === 1 ? 'Mitglied' : 'Mitglieder'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {agencyUsers.length === 0 ? (
                          <p className="text-muted-foreground">Keine Agentur-Mitglieder</p>
                        ) : (
                          <div className="space-y-2">
                            {agencyUsers.map((user: any) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                              >
                                <Avatar style={{ backgroundColor: user.color }}>
                                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                                  <AvatarFallback className="text-white">
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Mitglied seit {new Date(user.created_at).toLocaleDateString('de-DE')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {isSuperAdmin && extendedRole?.agency_enabled && id && (
                  <TabsContent value="agency-settings" className="space-y-4">
                    <AgencySettings userId={id} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default RaketenDetail;
