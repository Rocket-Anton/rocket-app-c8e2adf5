import { ChevronDown, ChevronRight, Home, Activity, MapPin, List, Map, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export const DashboardSidebar = () => {
  const [isLauflistenExpanded, setIsLauflistenExpanded] = useState(true);
  const [isLeadsExpanded, setIsLeadsExpanded] = useState(false);

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border">
      {/* Logo Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-foreground rounded-sm"></div>
          </div>
          <span className="font-semibold text-sidebar-foreground">Rocket</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Home className="w-4 h-4 mr-3" />
          Dashboard
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Activity className="w-4 h-4 mr-3" />
          Aktivitäten
        </Button>

        {/* Lauflisten - Expanded */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-primary bg-sidebar-accent font-medium"
            onClick={() => setIsLauflistenExpanded(!isLauflistenExpanded)}
          >
            <MapPin className="w-4 h-4 mr-3" />
            Lauflisten
            {isLauflistenExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Button>
          {isLauflistenExpanded && (
            <div className="ml-6 space-y-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-primary bg-sidebar-accent/50 font-medium"
              >
                <List className="w-4 h-4 mr-3" />
                Liste
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Map className="w-4 h-4 mr-3" />
                Karte
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Calendar className="w-4 h-4 mr-3" />
          Termine
          <Badge variant="destructive" className="ml-auto w-4 h-4 p-0 text-xs flex items-center justify-center">
            1
          </Badge>
        </Button>

        {/* Leads */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsLeadsExpanded(!isLeadsExpanded)}
          >
            <Users className="w-4 h-4 mr-3" />
            Leads
            {isLeadsExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Button>
        </div>
      </nav>

      {/* User Section at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
        <div className="text-sm">
          <div className="font-medium text-sidebar-foreground">Oleg Stemnev</div>
          <button className="text-xs text-muted-foreground hover:text-sidebar-foreground">
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
};