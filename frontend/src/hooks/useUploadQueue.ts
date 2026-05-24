import { useState, useCallback, useRef } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { compressImage } from '@/utils/imageCompression';

// ─── Types ───────────────────────────────────────────────────────────
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface QueueItem {
  /** ID duy nhất cho mỗi item */
  id: string;
  /** File gốc (hoặc đã nén) — null nếu là URL có sẵn từ server */
  file: File | null;
  /** Preview URL (objectURL cho file mới, URL thật cho ảnh đã upload) */
  preview: string;
  /** URL trả về từ server sau khi upload thành công */
  url: string | null;
  /** Trạng thái */
  status: UploadStatus;
}

interface UseUploadQueueOptions {
  /** Bật nén ảnh trước khi upload (false cho panorama) */
  compress?: boolean;
}

let _queueIdCounter = 0;
function nextId(): string {
  return `uq_${Date.now()}_${++_queueIdCounter}`;
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useUploadQueue(options: UseUploadQueueOptions = {}) {
  const { compress = true } = options;
  const [items, setItems] = useState<QueueItem[]>([]);

  // Dùng ref để luôn có access tới items mới nhất bên trong async
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ── helpers ──
  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  // ── Upload 1 item ──
  const uploadOne = useCallback(
    async (item: QueueItem) => {
      if (!item.file) return; // không có file thì skip (ảnh đã có URL)

      updateItem(item.id, { status: 'uploading' });

      try {
        const res = await propertyApi.uploadImages([item.file]);
        // API trả về { data: string[] } hoặc string[]
        const urls: string[] = (res as { data?: string[] }).data || (res as unknown as string[]);
        const url = urls?.[0];

        if (url) {
          updateItem(item.id, { status: 'success', url });
        } else {
          updateItem(item.id, { status: 'error' });
        }
      } catch {
        updateItem(item.id, { status: 'error' });
      }
    },
    [updateItem]
  );

  // ── Thêm file mới vào queue (tự nén + tự upload) ──
  const addFiles = useCallback(
    async (files: File[]) => {
      const newItems: QueueItem[] = [];

      for (const rawFile of files) {
        const id = nextId();
        // Nén nếu bật (ảnh thường) — nếu lỗi sẽ fallback file gốc
        const file = compress ? await compressImage(rawFile) : rawFile;
        const preview = URL.createObjectURL(file);

        newItems.push({
          id,
          file,
          preview,
          url: null,
          status: 'pending',
        });
      }

      setItems(prev => [...prev, ...newItems]);

      // Kick off upload cho từng item (tuần tự)
      for (const item of newItems) {
        await uploadOne(item);
      }
    },
    [compress, uploadOne]
  );

  // ── Thêm URL đã có sẵn (cho ảnh edit - đã có trên server) ──
  const addExistingUrls = useCallback((urls: string[]) => {
    const newItems: QueueItem[] = urls.map(url => ({
      id: nextId(),
      file: null,
      preview: url,
      url,
      status: 'success' as const,
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  // ── Xóa 1 item khỏi queue ──
  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(it => it.id === id);
      // Revoke objectURL nếu là file local
      if (item?.file && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(it => it.id !== id);
    });
  }, []);

  // ── Retry upload 1 item lỗi ──
  const retryItem = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find(it => it.id === id);
      if (item && item.status === 'error' && item.file) {
        await uploadOne(item);
      }
    },
    [uploadOne]
  );

  // ── Clear toàn bộ queue ──
  const clearQueue = useCallback(() => {
    // Revoke tất cả objectURL
    for (const item of itemsRef.current) {
      if (item.file && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    }
    setItems([]);
  }, []);

  // ── Set lại toàn bộ queue (dùng khi reset form) ──
  const resetQueue = useCallback(() => {
    for (const item of itemsRef.current) {
      if (item.file && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    }
    setItems([]);
  }, []);

  // ── Computed values ──
  const isUploading = items.some(it => it.status === 'uploading' || it.status === 'pending');
  const hasError = items.some(it => it.status === 'error');
  const successUrls = items.filter(it => it.status === 'success' && it.url).map(it => it.url!);
  const canSubmit = !isUploading && !hasError;

  return {
    items,
    addFiles,
    addExistingUrls,
    removeItem,
    retryItem,
    clearQueue,
    resetQueue,
    isUploading,
    hasError,
    successUrls,
    canSubmit,
  };
}
