import { ChevronDown, ChevronRight, ChevronLeft, Home, Activity, MapPin, List, Map, Calendar, Users } from "lucide-react";
import { useState } from "react";
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
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border transition-all duration-300 ease-in-out">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-sm"></div>
              </div>
              <span className="font-semibold text-sidebar-foreground">Rocket</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 hover:bg-sidebar-accent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Activity className="w-4 h-4" />
                    <span>Aktivitäten</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsLauflistenExpanded(!isLauflistenExpanded)}
                    className="w-full justify-between bg-sidebar-accent font-medium text-sidebar-primary"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Lauflisten</span>
                    </div>
                    {isLauflistenExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isLauflistenExpanded && (
                  <div className="animate-accordion-down">
                    <SidebarMenuItem className="ml-6">
                      <SidebarMenuButton size="sm" className="bg-sidebar-accent/50 font-medium text-sidebar-primary">
                        <List className="w-4 h-4" />
                        <span>Liste</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem className="ml-6">
                      <SidebarMenuButton size="sm">
                        <Map className="w-4 h-4" />
                        <span>Karte</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton className="justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Termine</span>
                    </div>
                    <Badge variant="destructive" className="w-4 h-4 p-0 text-xs flex items-center justify-center">
                      1
                    </Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsLeadsExpanded(!isLeadsExpanded)}
                    className="justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Leads</span>
                    </div>
                    {isLeadsExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="p-2">
            <div className="text-sm">
              <div className="font-medium text-sidebar-foreground">Oleg Stemnev</div>
              <button className="text-xs text-muted-foreground hover:text-sidebar-foreground">
                Abmelden
              </button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Toggle Button for Collapsed State */}
      {state === "collapsed" && (
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