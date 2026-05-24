import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function useAutoSaveForm<T>(
  baseCacheKey: string,
  initialData: T,
  enabled: boolean = true
) {
  const { user } = useAuth();
  const cacheKey = `${baseCacheKey}_${user?.id || 'guest'}`;

  const [formData, setFormData] = useState<T>(() => {
    if (!enabled) return initialData;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Lỗi đọc draft:', e);
    }
    return initialData;
  });

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Restore logic and notification
  useEffect(() => {
    if (!enabled) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const isFormUntouched = JSON.stringify(formData) === JSON.stringify(initialData);
        if (isFormUntouched) {
          setFormData(JSON.parse(cached));
          setHasRestoredDraft(true);
          toast.info('Đã khôi phục dữ liệu đang nhập dở từ lần trước.', {
            duration: 4000,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [cacheKey, enabled]);

  // Save to localStorage when formData changes (with Debounce)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      try {
        if (JSON.stringify(formData) !== JSON.stringify(initialData)) {
          localStorage.setItem(cacheKey, JSON.stringify(formData));
        }
      } catch (e) {
        console.error('Lỗi lưu draft:', e);
      }
    }, 1000); // Debounce 1000ms

    return () => clearTimeout(timer);
  }, [formData, cacheKey, enabled, initialData]);

  // Warn before unload (refresh or close tab)
  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isFormDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show the prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, initialData, enabled]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      // ignore
    }
  };

  const resetForm = () => {
    setFormData(initialData);
    clearDraft();
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return { formData, setFormData, clearDraft, resetForm, hasRestoredDraft, isDirty };
}
