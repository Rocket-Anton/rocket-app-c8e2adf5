import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search } from "lucide-react";

interface Project {
  id: string;
  name: string;
  providers?: {
    color?: string;
  };
}

interface ProjectMultiSelectProps {
  projects: Project[];
  selectedProjectIds: Set<string>;
  onSelectionChange: (projectIds: Set<string>) => void;
}

export function ProjectMultiSelect({ projects, selectedProjectIds, onSelectionChange }: ProjectMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(project => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const handleToggle = (projectId: string) => {
    const newSelection = new Set(selectedProjectIds);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(filteredProjects.map(p => p.id)));
  };

  const isAllSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedProjectIds.has(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const newSelection = new Set(selectedProjectIds);
      filteredProjects.forEach(p => newSelection.delete(p.id));
      onSelectionChange(newSelection);
    } else {
      const newSelection = new Set(selectedProjectIds);
      filteredProjects.forEach(p => newSelection.add(p.id));
      onSelectionChange(newSelection);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 rounded-md text-sm gap-1.5 relative">
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">Filter Projekte</span>
          {selectedProjectIds.size > 0 && (
            <Badge variant="default" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-green-500 hover:bg-green-500">
              {selectedProjectIds.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[280px] p-3" align="start">
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Projekt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        
        {/* Select All Checkbox */}
        <div 
          className="flex items-center gap-2 px-2 py-1.5 mb-2 hover:bg-muted rounded-md cursor-pointer"
          onClick={handleToggleSelectAll}
        >
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleToggleSelectAll}
            className="pointer-events-none"
          />
          <span className="text-xs text-muted-foreground">Alle auswählen</span>
        </div>
        
        {/* Project List with Provider Colors */}
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-1">
            {filteredProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Keine Projekte gefunden
              </div>
            ) : (
              filteredProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => handleToggle(project.id)}
                  className="flex items-center gap-2.5 p-2 hover:bg-muted rounded-md cursor-pointer group"
                >
                  <Checkbox
                    checked={selectedProjectIds.has(project.id)}
                    onCheckedChange={() => handleToggle(project.id)}
                    className="pointer-events-none"
                  />
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.providers?.color || '#666' }}
                  />
                  <span className="text-sm flex-1 truncate">{project.name}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
