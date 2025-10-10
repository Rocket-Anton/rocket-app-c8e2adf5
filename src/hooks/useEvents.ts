import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/utils/calendar';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Fetch events for a date range
export const useEvents = (startDate: Date, endDate: Date, categoryFilter?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['events', startDate.toISOString(), endDate.toISOString(), categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .gte('start_datetime', startDate.toISOString())
        .lte('start_datetime', endDate.toISOString())
        .order('start_datetime', { ascending: true });

      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return (data as CalendarEvent[]) || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Create event
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Termin erstellt');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Fehler beim Erstellen des Termins');
    },
  });
};

// Update event
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Termin aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error('Fehler beim Aktualisieren des Termins');
    },
  });
};

// Delete event
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Termin gelöscht');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Fehler beim Löschen des Termins');
    },
  });
};

// Search events
export const useSearchEvents = (query: string) => {
  return useQuery({
    queryKey: ['events-search', query],
    queryFn: async () => {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .order('start_datetime', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error searching events:', error);
        throw error;
      }

      return (data as CalendarEvent[]) || [];
    },
    enabled: query.trim().length > 0,
  });
};
