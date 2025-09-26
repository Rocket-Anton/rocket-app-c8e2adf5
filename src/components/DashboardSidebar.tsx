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
      <Sidebar collapsible="icon" className={`border-r border-sidebar-border transition-all duration-300 ease-in-out ${state === "collapsed" ? "w-44" : ""}`} style={{ background: 'var(--sidebar-gradient)' }}>
        <SidebarHeader className={`border-b border-white/20 ${state === "collapsed" ? "pb-4" : "pb-2"}`}>
          <div className={`flex items-center ${state === "collapsed" ? "justify-center" : "justify-between"} px-2`}>
            <div className="flex items-center gap-3">
              {state === "collapsed" ? (
                <img 
                  src={rocketIcon} 
                  alt="Rocket" 
                  className="h-10 w-10 object-contain"
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
            {state === "collapsed" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="absolute top-2 right-2 h-6 w-6 hover:bg-white/20 text-white"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className={state === "collapsed" ? "px-2" : ""}>
          <SidebarGroup>
            <SidebarGroupContent className={state === "collapsed" ? "space-y-2" : ""}>
              <SidebarMenu className={state === "collapsed" ? "space-y-2" : ""}>
                <SidebarMenuItem>
                  <SidebarMenuButton className={`text-white rounded-lg ${state === "collapsed" ? "bg-white/30 h-14 w-full mx-auto flex items-center justify-center" : "hover:bg-white/20"}`}>
                    <Home className="w-6 h-6" />
                    {state !== "collapsed" && <span>Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton className={`text-white rounded-lg ${state === "collapsed" ? "h-14 w-full mx-auto flex items-center justify-center hover:bg-white/20" : "hover:bg-white/20"}`}>
                    <Activity className="w-6 h-6" />
                    {state !== "collapsed" && <span>Aktivitäten</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => state !== "collapsed" && setIsLauflistenExpanded(!isLauflistenExpanded)}
                    className={`w-full text-white font-medium rounded-lg ${
                      state === "collapsed" 
                        ? "h-14 w-full mx-auto flex items-center justify-center bg-white/20 hover:bg-white/30" 
                        : "justify-between bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-6 h-6" />
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
                  <SidebarMenuButton className={`text-white rounded-lg ${
                    state === "collapsed" 
                      ? "h-14 w-full mx-auto flex items-center justify-center hover:bg-white/20 relative" 
                      : "justify-between hover:bg-white/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      {state !== "collapsed" && <span>Termine</span>}
                    </div>
                    {state !== "collapsed" ? (
                      <Badge variant="destructive" className="w-4 h-4 p-0 text-xs flex items-center justify-center">
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
                    className={`text-white rounded-lg ${
                      state === "collapsed" 
                        ? "h-14 w-full mx-auto flex items-center justify-center hover:bg-white/20" 
                        : "justify-between hover:bg-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-6 h-6" />
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

        {state !== "collapsed" ? (
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
        ) : (
          <SidebarFooter className="border-t border-white/20 px-2 py-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 bg-white/30 rounded-full flex items-center justify-center text-white font-semibold text-base">
                OS
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-white/20 text-white"
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