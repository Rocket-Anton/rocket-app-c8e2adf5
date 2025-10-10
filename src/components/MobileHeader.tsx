import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, Clock, ClipboardList, Calendar, User, Rocket, FolderOpen, Receipt, Package, Settings, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { ProjectSelector } from "./ProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import rocketLogo from "@/assets/rocket-logo-white.png";
import { Badge } from "./ui/badge";
import { useUpcomingEventsCount } from "@/hooks/useUpcomingEventsCount";

interface MobileHeaderProps {
  selectedProjectIds?: Set<string>;
  onProjectsChange?: (projectIds: Set<string>) => void;
}

export function MobileHeader({ selectedProjectIds, onProjectsChange }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name?: string; color?: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: upcomingCount = 0 } = useUpcomingEventsCount();

  const currentPath = location.pathname;
  const showProjectSelector = (currentPath === '/karte' || currentPath === '/') && selectedProjectIds && onProjectsChange;

  // Submenu expansion states
  const isInLauflistenSection = currentPath === "/" || currentPath === "/karte";
  const isInProjekteSection = currentPath.startsWith("/settings/projects") || currentPath.startsWith("/settings/addresses") || currentPath === "/projects/karte";
  const isInAbrechnungenSection = currentPath.startsWith("/abrechnungen");
  const isInProviderSection = currentPath.startsWith("/settings/providers") || currentPath.startsWith("/settings/tarife");
  
  const [isLauflistenExpanded, setIsLauflistenExpanded] = useState(isInLauflistenSection);
  const [isProjekteExpanded, setIsProjekteExpanded] = useState(isInProjekteSection);
  const [isAbrechnungenExpanded, setIsAbrechnungenExpanded] = useState(isInAbrechnungenSection);
  const [isProviderExpanded, setIsProviderExpanded] = useState(isInProviderSection);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, color')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUser();
  }, []);

  // Auto-expand based on route changes
  useEffect(() => {
    setIsLauflistenExpanded(isInLauflistenSection);
    setIsProjekteExpanded(isInProjekteSection);
    setIsAbrechnungenExpanded(isInAbrechnungenSection);
    setIsProviderExpanded(isInProviderSection);
  }, [currentPath, isInLauflistenSection, isInProjekteSection, isInAbrechnungenSection, isInProviderSection]);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    setOpen(false);
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full bg-[#0066FF] border-b border-white/10">
      <div className="flex items-center justify-between pl-0 pr-4 h-14">
        {/* Logo */}
        <button 
          onClick={() => handleNavigation("/")}
          className="flex items-center gap-2"
        >
          <img 
            src={rocketLogo} 
            alt="Rocket Logo" 
            className="h-14 w-auto"
          />
        </button>

        {/* Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10 h-12 w-12"
            >
              {open ? <X className="!h-10 !w-10" /> : <Menu className="!h-10 !w-10" />}
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="right" 
            className="w-[280px] p-0 flex flex-col"
          >
            <div className="flex flex-col h-full min-h-0">
              {/* Header in menu */}
              <div className="p-4 border-b bg-[#0066FF] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Menu className="h-5 w-5 text-white" />
                  <span className="font-semibold text-white">Menü</span>
                </div>
              </div>

              {/* Project selector if applicable */}
              {showProjectSelector && (
                <div className="p-4 border-b bg-muted/30 flex-shrink-0">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    PROJEKTE
                  </div>
                  <ProjectSelector
                    selectedProjectIds={selectedProjectIds}
                    onProjectsChange={onProjectsChange}
                    className="w-full"
                  />
                </div>
              )}

              {/* Navigation items */}
              <nav className="flex-1 overflow-y-auto px-3 min-h-0">
                {/* Main Section */}
                <div className="space-y-0.5">
                  {/* Dashboard */}
                  <button 
                    onClick={() => handleNavigation("/")}
                    className="text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center gap-2.5 px-3"
                  >
                    <Home className="!w-4 !h-4 flex-shrink-0" />
                    <span className="text-sm whitespace-nowrap">Dashboard</span>
                  </button>

                  {/* Aktivitäten */}
                  <button className="text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center gap-2.5 px-3">
                    <Clock className="!w-4 !h-4 flex-shrink-0" />
                    <span className="text-sm whitespace-nowrap">Aktivitäten</span>
                  </button>

                  {/* Lauflisten - with submenu */}
                  <div>
                    <button 
                      onClick={() => {
                        if (!isLauflistenExpanded) {
                          handleNavigation("/");
                        }
                        setIsLauflistenExpanded(!isLauflistenExpanded);
                      }}
                      className={`w-full flex items-center justify-between text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent px-3 ${isInLauflistenSection ? "bg-sidebar-accent" : ""}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ClipboardList className="!w-4 !h-4 flex-shrink-0" />
                        <span className="text-sm">Lauflisten</span>
                      </div>
                      {isLauflistenExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    
                    {isLauflistenExpanded && (
                      <div className="ml-5 mt-1 space-y-0.5">
                        <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                          <button 
                            onClick={() => handleNavigation("/")}
                            className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/" ? "bg-sidebar-accent" : ""}`}
                          >
                            <span className="text-sm">Liste</span>
                          </button>
                        </div>
                        
                        <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                          <button 
                            onClick={() => handleNavigation("/karte")}
                            className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/karte" ? "bg-sidebar-accent" : ""}`}
                          >
                            <span className="text-sm">Karte</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kalender */}
                  <button 
                    onClick={() => handleNavigation("/kalender")}
                    className={`text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center justify-between px-3 ${currentPath === "/kalender" ? "bg-sidebar-accent" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="!w-4 !h-4 flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">Kalender</span>
                    </div>
                    {upcomingCount > 0 && (
                      <Badge variant="destructive" className="w-5 h-5 p-0 text-xs flex items-center justify-center">
                        {upcomingCount}
                      </Badge>
                    )}
                  </button>

                  {/* Leads */}
                  <button className="text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center justify-between px-3">
                    <div className="flex items-center gap-2.5">
                      <User className="!w-4 !h-4 flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">Leads</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* MANAGEMENT Section */}
                <div className="mt-0.5 pt-0.5 border-t border-sidebar-border">
                  <div className="px-3 pb-0">
                    <span className="text-[10px] font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                      MANAGEMENT
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    {/* Raketen */}
                    <button 
                      onClick={() => handleNavigation("/settings/raketen")}
                      className={`text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center gap-2.5 px-3 ${currentPath === "/settings/raketen" ? "bg-sidebar-accent" : ""}`}
                    >
                      <Rocket className="!w-4 !h-4 flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">Raketen</span>
                    </button>

                    {/* Projekte - with submenu */}
                    <div>
                      <button 
                        onClick={() => {
                          if (!isProjekteExpanded) {
                            handleNavigation("/settings/projects");
                          }
                          setIsProjekteExpanded(!isProjekteExpanded);
                        }}
                        className={`w-full flex items-center justify-between text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent px-3 ${isInProjekteSection ? "bg-sidebar-accent" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderOpen className="!w-4 !h-4 flex-shrink-0" />
                          <span className="text-sm">Projekte</span>
                        </div>
                        {isProjekteExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      
                      {isProjekteExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/settings/projects")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/settings/projects" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Projekte</span>
                            </button>
                          </div>
                          
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/settings/addresses")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/settings/addresses" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Adressen</span>
                            </button>
                          </div>

                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/projects/karte")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/projects/karte" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Projektkarte</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Abrechnungen - with submenu */}
                    <div>
                      <button 
                        onClick={() => {
                          if (!isAbrechnungenExpanded) {
                            handleNavigation("/abrechnungen/abrechnen");
                          }
                          setIsAbrechnungenExpanded(!isAbrechnungenExpanded);
                        }}
                        className={`w-full flex items-center justify-between text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent px-3 ${isInAbrechnungenSection ? "bg-sidebar-accent" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Receipt className="!w-4 !h-4 flex-shrink-0" />
                          <span className="text-sm">Abrechnungen</span>
                        </div>
                        {isAbrechnungenExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      
                      {isAbrechnungenExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/abrechnungen/abrechnen")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/abrechnungen/abrechnen" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Abrechnen</span>
                            </button>
                          </div>
                          
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/abrechnungen/gutschriften")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/abrechnungen/gutschriften" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Gutschriften</span>
                            </button>
                          </div>

                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/abrechnungen/kosten")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/abrechnungen/kosten" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Kosten</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Provider - with submenu */}
                    <div>
                      <button 
                        onClick={() => {
                          if (!isProviderExpanded) {
                            handleNavigation("/settings/providers");
                          }
                          setIsProviderExpanded(!isProviderExpanded);
                        }}
                        className={`w-full flex items-center justify-between text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent px-3 ${isInProviderSection ? "bg-sidebar-accent" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="!w-4 !h-4 flex-shrink-0" />
                          <span className="text-sm">Provider</span>
                        </div>
                        {isProviderExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      
                      {isProviderExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/settings/providers")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/settings/providers" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Provider</span>
                            </button>
                          </div>
                          
                          <div className="relative pl-6 before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:border-l before:border-b before:rounded-bl-md before:border-sidebar-foreground/30 after:content-[''] after:absolute after:left-1 after:top-[-4px] after:bottom-[-4px] after:w-px after:bg-sidebar-foreground/30 first:after:top-1/2 last:after:bottom-1/2">
                            <button 
                              onClick={() => handleNavigation("/settings/tarife")}
                              className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-1.5 px-3 w-full text-left ${currentPath === "/settings/tarife" ? "bg-sidebar-accent" : ""}`}
                            >
                              <span className="text-sm">Tarife</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SYSTEM Section */}
                <div className="mt-0.5 pt-0.5 border-t border-sidebar-border">
                  <div className="px-3 pb-0">
                    <span className="text-[10px] font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                      SYSTEM
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <button className="text-sidebar-foreground rounded-xl py-2 hover:bg-sidebar-accent w-full flex items-center gap-2.5 px-3">
                      <Settings className="!w-4 !h-4 flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">Einstellungen</span>
                    </button>
                  </div>
                </div>
              </nav>

              {/* User section */}
              <div className="border-t p-3 flex-shrink-0 bg-background">
                <div className="space-y-2">
                  {userProfile?.name && (
                    <div className="flex items-center gap-2 px-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback 
                          className="text-[10px] font-medium"
                          style={{ 
                            backgroundColor: userProfile.color || '#3b82f6', 
                            color: 'white' 
                          }}
                        >
                          {userProfile.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {userProfile.name}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">Abmelden</span>
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}