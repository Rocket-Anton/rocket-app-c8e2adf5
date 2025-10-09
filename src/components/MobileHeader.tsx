import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, Map, ListChecks, Settings, DollarSign, Users, FolderKanban, LogOut } from "lucide-react";
import { ProjectSelector } from "./ProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import rocketLogo from "@/assets/rocket-logo-white.png";

interface MobileHeaderProps {
  selectedProjectIds?: Set<string>;
  onProjectsChange?: (projectIds: Set<string>) => void;
}

export function MobileHeader({ selectedProjectIds, onProjectsChange }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name?: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const showProjectSelector = (currentPath === '/karte' || currentPath === '/') && selectedProjectIds && onProjectsChange;

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUser();
  }, []);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Map, label: "Karte", path: "/karte" },
    { icon: ListChecks, label: "Lauflisten", path: "/" },
    { icon: FolderKanban, label: "Projekte", path: "/einstellungen/projects" },
    { icon: Users, label: "Anbieter", path: "/einstellungen/providers" },
    { icon: DollarSign, label: "Tarife", path: "/einstellungen/tarife" },
    { icon: Settings, label: "Einstellungen", path: "/einstellungen/addresses" },
  ];

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
    <header className="md:hidden sticky top-0 z-50 w-full bg-[#0066FF] border-b border-white/10">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <button 
          onClick={() => handleNavigation("/")}
          className="flex items-center gap-2"
        >
          <img 
            src={rocketLogo} 
            alt="Rocket Logo" 
            className="h-8 w-auto"
          />
        </button>

        {/* Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10 h-10 w-10"
            >
              {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
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
                  <img 
                    src={rocketLogo} 
                    alt="Rocket Logo" 
                    className="h-8 w-auto"
                  />
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
              <nav className="flex-1 overflow-y-auto p-2 min-h-0">
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                          ${isActive 
                            ? 'bg-[#0066FF] text-white font-medium' 
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* User section */}
              <div className="border-t p-4 flex-shrink-0 bg-background">
                <div className="space-y-3">
                  {userProfile?.name && (
                    <div className="text-sm font-medium text-foreground">
                      {userProfile.name}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span>Abmelden</span>
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