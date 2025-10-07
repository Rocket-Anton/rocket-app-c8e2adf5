import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "@/hooks/use-toast";

interface OrderTrackingProps {
  onOrderCreated?: (orderCount: number) => void;
}

export const useOrderTracking = ({ onOrderCreated }: OrderTrackingProps = {}) => {
  useEffect(() => {
    const channel = supabase
      .channel('order-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `activity_type=eq.order_created`
        },
        async (payload) => {
          console.log('New order detected:', payload);
          
          // Trigger confetti celebration
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          // Get today's order count
          const { data: session } = await supabase.auth.getSession();
          if (!session.session?.user) return;

          const { data: stats } = await supabase
            .rpc('get_today_stats', { p_user_id: session.session.user.id });

          const orderCount = stats?.[0]?.orders_today || 1;

          // Trigger callback
          onOrderCreated?.(orderCount);

          // Show celebration toast
          const messages = [
            `🎉 Herzlichen Glückwunsch zum ${orderCount === 1 ? 'ersten' : orderCount + '.'} Auftrag heute!`,
            `🚀 Weiter so! Das ist bereits dein ${orderCount}. Auftrag heute!`,
            `💪 Stark! Auftrag Nummer ${orderCount} ist im Kasten!`
          ];

          toast({
            title: messages[Math.min(orderCount - 1, 2)],
            description: orderCount === 1 
              ? "Gib jetzt weiter Gas, um den nächsten zu schreiben!" 
              : "Mach weiter so!",
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onOrderCreated]);

  const trackOrderCreated = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      await supabase.from('user_activities').insert({
        user_id: session.session.user.id,
        activity_type: 'order_created',
        metadata: { timestamp: new Date().toISOString() }
      });

      console.log('Order tracked successfully');
    } catch (error) {
      console.error('Error tracking order:', error);
    }
  };

  const trackStatusChange = async (fromStatus: string, toStatus: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      await supabase.from('user_activities').insert({
        user_id: session.session.user.id,
        activity_type: 'status_changed',
        metadata: { 
          status_from: fromStatus, 
          status_to: toStatus,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Status change tracked successfully');
    } catch (error) {
      console.error('Error tracking status change:', error);
    }
  };

  return {
    trackOrderCreated,
    trackStatusChange
  };
};
