import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search } from "lucide-react";

interface User {
  id: string;
  name: string;
  color?: string;
}

interface UserMultiSelectProps {
  users: User[];
  selectedUserIds: Set<string>;
  onSelectionChange: (userIds: Set<string>) => void;
}

export function UserMultiSelect({ users, selectedUserIds, onSelectionChange }: UserMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => user.name.toLowerCase().includes(query));
  }, [users, searchQuery]);

  const handleToggle = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(filteredUsers.map(u => u.id)));
  };

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const newSelection = new Set(selectedUserIds);
      filteredUsers.forEach(u => newSelection.delete(u.id));
      onSelectionChange(newSelection);
    } else {
      const newSelection = new Set(selectedUserIds);
      filteredUsers.forEach(u => newSelection.add(u.id));
      onSelectionChange(newSelection);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 rounded-md text-sm gap-1.5 relative">
          <Users className="h-4 w-4" />
          <span>Filter Raketen</span>
          <Badge variant="default" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-green-500 hover:bg-green-500">
            {selectedUserIds.size}
          </Badge>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[280px] p-3" align="start">
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rakete suchen..."
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
        
        {/* User List with Avatars */}
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Keine Raketen gefunden
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleToggle(user.id)}
                  className="flex items-center gap-2.5 p-2 hover:bg-muted rounded-md cursor-pointer group"
                >
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onCheckedChange={() => handleToggle(user.id)}
                    className="pointer-events-none"
                  />
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: user.color || '#3b82f6' }}
                      className="text-[10px] font-semibold text-white"
                    >
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{user.name}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
