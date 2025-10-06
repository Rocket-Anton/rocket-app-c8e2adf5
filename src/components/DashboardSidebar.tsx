import { ChevronDown, ChevronRight, ChevronLeft, Home, Clock, PersonStanding, Circle, Calendar, User, Settings, Moon } from "lucide-react";
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

export const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLauflistenExpanded, setIsLauflistenExpanded] = useState(true);
  const [isLeadsExpanded, setIsLeadsExpanded] = useState(false);

  const { state, toggleSidebar } = useSidebar();

  // Close expanded menus when sidebar collapses
  useEffect(() => {
    if (state === "collapsed") {
      setIsLauflistenExpanded(false);
      setIsLeadsExpanded(false);
    }
  }, [state]);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border transition-all duration-300 ease-in-out bg-sidebar" style={{ ['--sidebar-width-icon' as any]: '5.5rem', ['--sidebar-width' as any]: '14rem' }}>
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
                      <PersonStanding className="!w-5 !h-5 flex-shrink-0" />
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
                  <div className="overflow-hidden ml-5 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-foreground/30"></div>
                    <div className="animate-accordion-down space-y-1 mt-1">
                      <SidebarMenuItem className="relative pl-4">
                        <div className="absolute left-0 top-1/2 w-3 h-0.5 bg-sidebar-foreground/30"></div>
                        <div className="absolute left-0 top-0 bottom-1/2 w-0.5 bg-sidebar-foreground/30"></div>
                        <div className="absolute left-0 top-1/2 w-3 h-3 border-l-2 border-b-2 border-sidebar-foreground/30 rounded-bl-md -translate-y-1/2"></div>
                        <SidebarMenuButton 
                          size="sm" 
                          onClick={() => navigate("/")}
                          className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-2.5 ${location.pathname === "/" ? "bg-sidebar-accent" : ""}`}
                        >
                          <span className="text-base">Liste</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      
                      <SidebarMenuItem className="relative pl-4">
                        <div className="absolute left-0 top-1/2 w-3 h-0.5 bg-sidebar-foreground/30"></div>
                        <div className="absolute left-0 top-1/2 w-3 h-3 border-l-2 border-b-2 border-sidebar-foreground/30 rounded-bl-md -translate-y-1/2"></div>
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
                  <SidebarMenuButton className={`text-sidebar-foreground rounded-xl py-3 ${state === "collapsed" ? "h-12 w-full mx-auto flex items-center justify-center hover:bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
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
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="p-2">
              <div className="text-sm">
                <div className="font-medium text-sidebar-foreground">Oleg Stemnev</div>
                <button className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  Abmelden
                </button>
              </div>
            </div>
          </SidebarFooter>
        ) : (
          <SidebarFooter className="border-t border-sidebar-border px-2 py-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-accent-foreground font-semibold text-base">
                OS
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-sidebar-accent text-sidebar-foreground"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-8H9.83l3-3-3-3H15v8z" />
                </svg>
              </Button>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>

    </>
  );
};