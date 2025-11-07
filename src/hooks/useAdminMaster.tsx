import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminMaster = () => {
  const [isAdminMaster, setIsAdminMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminMasterStatus();
  }, []);

  const checkAdminMasterStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdminMaster(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin_master')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin master status:', error);
        setIsAdminMaster(false);
      } else {
        setIsAdminMaster(!!data);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAdminMaster(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdminMaster, loading };
};
