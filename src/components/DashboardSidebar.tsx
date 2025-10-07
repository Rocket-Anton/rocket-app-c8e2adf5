import { ChevronDown, ChevronRight, ChevronLeft, Home, Clock, ClipboardList, Circle, Calendar, User, Settings, Moon, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import rocketLogo from "@/assets/rocket-logo-transparent.png";
import rocketIcon from "@/assets/rocket-icon-blue.png";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar 
} from "./ui/sidebar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get authenticated user
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, initials: string} | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        
        const userName = profile?.name || user.email?.split('@')[0] || 'Unbekannt';
        const initials = userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        setCurrentUser({ 
          id: user.id, 
          name: userName,
          initials
        });
      }
    };
    fetchUser();
  }, []);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Erfolgreich abgemeldet");
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Fehler beim Abmelden");
    }
  };
  
  // Auto-expand based on current route
  const isInLauflistenSection = location.pathname === "/" || location.pathname === "/karte";
  const [isLauflistenExpanded, setIsLauflistenExpanded] = useState(isInLauflistenSection);
  const [isLeadsExpanded, setIsLeadsExpanded] = useState(false);

  const { state, toggleSidebar } = useSidebar();

  // Auto-expand the correct section when route changes
  useEffect(() => {
    if (state !== "collapsed") {
      setIsLauflistenExpanded(isInLauflistenSection);
    }
  }, [location.pathname, state, isInLauflistenSection]);

  // Close expanded menus when sidebar collapses
  useEffect(() => {
    if (state === "collapsed") {
      setIsLauflistenExpanded(false);
      setIsLeadsExpanded(false);
    }
  }, [state]);

  return (
    <>
      <Sidebar 
        collapsible="icon" 
        className="
          bg-sidebar transition-all duration-300 ease-in-out
          !border-r-0 data-[side=left]:border-r-0 data-[side=right]:border-l-0
          shadow-none
        " 
        style={{ ['--sidebar-width-icon' as any]: '5.5rem', ['--sidebar-width' as any]: '14rem' }}
      >
        <SidebarHeader className={`${state === "collapsed" ? "pb-2 border-b-0" : "border-b border-sidebar-border pb-2"}`}>
          {state === "collapsed" ? (
            <div className="flex items-end justify-center pt-2 pb-2">
              <img 
                src={rocketIcon} 
                alt="Rocket" 
                className="h-12 w-12 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <img 
                  src={rocketLogo} 
                  alt="Rocket Promotions" 
                  className="h-16 w-auto"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6 bg-background hover:bg-sidebar-accent text-sidebar-foreground shadow-sm border border-border"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
          )}
          {state === "collapsed" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="absolute -right-3 top-6 h-6 w-6 bg-background hover:bg-sidebar-accent text-sidebar-foreground shadow-md border border-border rounded-md"
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </SidebarHeader>

        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton className={`text-sidebar-foreground rounded-xl py-3 ${state === "collapsed" ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
                    <Home className="!w-5 !h-5 flex-shrink-0" />
                    {state !== "collapsed" && <span className="text-base whitespace-nowrap">Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton className={`text-sidebar-foreground rounded-xl py-3 ${state === "collapsed" ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
                    <Clock className="!w-5 !h-5 flex-shrink-0" />
                    {state !== "collapsed" && <span className="text-base whitespace-nowrap">Aktivitäten</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => state !== "collapsed" && setIsLauflistenExpanded(!isLauflistenExpanded)}
                    className={`w-full text-sidebar-accent-foreground font-medium rounded-xl py-3 ${
                      state === "collapsed" 
                        ? "h-12 w-full mx-auto flex items-center justify-center bg-sidebar-accent hover:bg-sidebar-accent/90" 
                        : "justify-between bg-sidebar-accent hover:bg-sidebar-accent/90"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="!w-5 !h-5 flex-shrink-0" />
                      {state !== "collapsed" && <span className="text-base whitespace-nowrap">Lauflisten</span>}
                    </div>
                    {state !== "collapsed" && (
                      isLauflistenExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isLauflistenExpanded && state !== "collapsed" && (
                  <div className="ml-5 mt-1">
                    <div className="space-y-2">
                      {/* ITEM: Liste */}
                      <SidebarMenuItem
                        className="
                          relative pl-6
                          before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2
                          before:w-3 before:h-3
                          before:border-l before:border-b before:rounded-bl-md
                          before:border-sidebar-foreground/30
                          after:content-[''] after:absolute after:left-1
                          after:top-[-4px] after:bottom-[-4px] after:w-px
                          after:bg-sidebar-foreground/30
                          first:after:top-1/2
                          last:after:bottom-1/2
                        "
                      >
                        <SidebarMenuButton
                          size="sm"
                          onClick={() => navigate("/")}
                          className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-2.5 ${location.pathname === "/" ? "bg-sidebar-accent" : ""}`}
                        >
                          <span className="text-base">Liste</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* ITEM: Karte */}
                      <SidebarMenuItem
                        className="
                          relative pl-6
                          before:content-[''] before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2
                          before:w-3 before:h-3
                          before:border-l before:border-b before:rounded-bl-md
                          before:border-sidebar-foreground/30
                          after:content-[''] after:absolute after:left-1
                          after:top-[-4px] after:bottom-[-4px] after:w-px
                          after:bg-sidebar-foreground/30
                          first:after:top-1/2
                          last:after:bottom-1/2
                        "
                      >
                        <SidebarMenuButton
                          size="sm"
                          onClick={() => navigate("/karte")}
                          className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-2.5 ${location.pathname === "/karte" ? "bg-sidebar-accent" : ""}`}
                        >
                          <span className="text-base">Karte</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  </div>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton className={`text-sidebar-foreground rounded-xl py-3 ${
                    state === "collapsed" 
                      ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent relative" 
                      : "justify-between hover:bg-sidebar-accent"
                  }`}>
                    <div className="flex items-center gap-3">
                      <Calendar className="!w-5 !h-5 flex-shrink-0" />
                      {state !== "collapsed" && <span className="text-base whitespace-nowrap">Termine</span>}
                    </div>
                    {state !== "collapsed" ? (
                      <Badge variant="destructive" className="w-5 h-5 p-0 text-xs flex items-center justify-center">
                        1
                      </Badge>
                    ) : (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white">
                        1
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => state !== "collapsed" && setIsLeadsExpanded(!isLeadsExpanded)}
                    className={`text-sidebar-foreground rounded-xl py-3 ${
                      state === "collapsed" 
                        ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" 
                        : "justify-between hover:bg-sidebar-accent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="!w-5 !h-5 flex-shrink-0" />
                      {state !== "collapsed" && <span className="text-base whitespace-nowrap">Leads</span>}
                    </div>
                    {state !== "collapsed" && (
                      isLeadsExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* SYSTEM Section */}
          <SidebarGroup className="mt-4 pt-4 border-t border-sidebar-border">
            {state !== "collapsed" && (
              <div className="px-3 pb-2 -mt-2">
                <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                  SYSTEM
                </span>
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/settings")}
                    className={`text-sidebar-foreground rounded-xl py-3 ${location.pathname === "/settings" ? "bg-sidebar-accent" : ""} ${state === "collapsed" ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}
                  >
                    <Settings className="!w-5 !h-5 flex-shrink-0" />
                    {state !== "collapsed" && <span className="text-base whitespace-nowrap">Settings</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={`text-sidebar-foreground rounded-xl py-3 ${
                    state === "collapsed" 
                      ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" 
                      : "justify-between hover:bg-sidebar-accent"
                  }`}>
                    <div className="w-full flex items-center justify-between">
                      {state === "collapsed" ? (
                        <Switch className="scale-75" />
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <Moon className="!w-5 !h-5 flex-shrink-0" />
                            <span className="text-base whitespace-nowrap">Dark mode</span>
                          </div>
                          <Switch className="ml-auto scale-90" />
                        </>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {state !== "collapsed" ? (
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                {currentUser?.initials || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sidebar-foreground text-sm truncate">
                  {currentUser?.name || 'Lädt...'}
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Abmelden
                </button>
              </div>
            </div>
          </SidebarFooter>
        ) : (
          <SidebarFooter className="border-t border-sidebar-border px-2 py-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                {currentUser?.initials || 'U'}
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-sidebar-accent text-sidebar-foreground"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>

    </>
  );
};