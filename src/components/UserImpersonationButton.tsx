import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useActualUserRole } from '@/hooks/useUserRole';
import impersonationIcon from '@/assets/users-icon.png';

export const UserImpersonationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: actualRole } = useActualUserRole();
  const { impersonatedUserId, impersonatedUserName, setImpersonatedUser, isImpersonating } = useImpersonation();

  if (actualRole !== 'super_admin') return null;

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, color')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (userId: string, userName: string) => {
    setImpersonatedUser(userId, userName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleStopImpersonation = () => {
    setImpersonatedUser(null, null);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 lg:left-[calc(var(--sidebar-width)+1.5rem)] z-50 transition-all">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all p-0"
          variant={isImpersonating ? "destructive" : "default"}
        >
          <img src={impersonationIcon} alt="User Impersonation" className="h-6 w-6" />
        </Button>
        
        {isImpersonating && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
            {impersonatedUserName}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Impersonation</DialogTitle>
          </DialogHeader>

          {isImpersonating && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Aktuell angezeigt:</p>
                <p className="font-medium">{impersonatedUserName}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStopImpersonation}
              >
                <X className="h-4 w-4 mr-1" />
                Beenden
              </Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="User suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id, user.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors ${
                    impersonatedUserId === user.id ? 'bg-muted border-2 border-primary' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8" style={{ backgroundColor: user.color }}>
                    <AvatarFallback className="text-white text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
