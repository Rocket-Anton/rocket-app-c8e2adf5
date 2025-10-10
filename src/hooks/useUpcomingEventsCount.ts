import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useUpcomingEventsCount = () => {
  const query = useQuery({
    queryKey: ['upcoming-events-count'],
    queryFn: async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_datetime', now.toISOString());

      if (error) {
        console.error('Error fetching upcoming events count:', error);
        return 0;
      }

      return count || 0;
    },
  });

  // Realtime subscription for count updates
  useEffect(() => {
    const channel = supabase
      .channel('events-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
};
