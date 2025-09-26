import { ChevronDown, ChevronRight, ChevronLeft, Home, Activity, MapPin, List, Map, Calendar, Users } from "lucide-react";
import { useState } from "react";
import rocketLogo from "@/assets/rocket-logo-white.png";
import rocketIcon from "@/assets/rocket-icon-white.jpg";
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

export const DashboardSidebar = () => {
  const [isLauflistenExpanded, setIsLauflistenExpanded] = useState(true);
  const [isLeadsExpanded, setIsLeadsExpanded] = useState(false);

  const { state, toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar collapsible="offcanvas" className={`border-r border-sidebar-border transition-all duration-300 ease-in-out ${state === "collapsed" ? "w-16" : ""}`} style={{ background: 'var(--sidebar-gradient)' }}>
        <SidebarHeader className="border-b border-white/20 pb-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              {state === "collapsed" ? (
                <img 
                  src={rocketIcon} 
                  alt="Rocket" 
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <img 
                  src={rocketLogo} 
                  alt="Rocket Promotions" 
                  className="h-16 w-auto"
                />
              )}
            </div>
            {state !== "collapsed" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-white hover:bg-white/20 rounded-lg">
                    <Home className="w-4 h-4" />
                    {state !== "collapsed" && <span>Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton className="text-white hover:bg-white/20 rounded-lg">
                    <Activity className="w-4 h-4" />
                    {state !== "collapsed" && <span>Aktivitäten</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => state !== "collapsed" && setIsLauflistenExpanded(!isLauflistenExpanded)}
                    className={`w-full ${state !== "collapsed" ? "justify-between" : "justify-center"} bg-white/20 text-white font-medium rounded-lg hover:bg-white/30`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {state !== "collapsed" && <span>Lauflisten</span>}
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
                  <div className="animate-accordion-down">
                    <SidebarMenuItem className="ml-6">
                      <SidebarMenuButton size="sm" className="bg-white/30 text-white font-medium rounded-lg hover:bg-white/40">
                        <List className="w-4 h-4" />
                        <span>Liste</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem className="ml-6">
                      <SidebarMenuButton size="sm" className="text-white hover:bg-white/20 rounded-lg">
                        <Map className="w-4 h-4" />
                        <span>Karte</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton className={`${state !== "collapsed" ? "justify-between" : "justify-center"} text-white hover:bg-white/20 rounded-lg`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {state !== "collapsed" && <span>Termine</span>}
                    </div>
                    {state !== "collapsed" && (
                      <Badge variant="destructive" className="w-4 h-4 p-0 text-xs flex items-center justify-center">
                        1
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => state !== "collapsed" && setIsLeadsExpanded(!isLeadsExpanded)}
                    className={`${state !== "collapsed" ? "justify-between" : "justify-center"} text-white hover:bg-white/20 rounded-lg`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {state !== "collapsed" && <span>Leads</span>}
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
        </SidebarContent>

        {state !== "collapsed" && (
          <SidebarFooter className="border-t border-white/20">
            <div className="p-2">
              <div className="text-sm">
                <div className="font-medium text-white">Oleg Stemnev</div>
                <button className="text-xs text-white/70 hover:text-white">
                  Abmelden
                </button>
              </div>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Toggle Button for when sidebar is completely hidden */}
      {!["expanded", "collapsed"].includes(state) && (
        <div className="fixed top-4 left-4 z-50 animate-fade-in">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 bg-background shadow-lg border border-border hover:bg-accent transition-all duration-200 hover:scale-105"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  );
};