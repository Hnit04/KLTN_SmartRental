import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface FavoritesContextType {
  favoriteIds: number[];
  isLoading: boolean;
  toggleFavorite: (roomId: number) => Promise<boolean>;
  isFavorite: (roomId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isTenant = user?.role === 'TENANT';

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated || !isTenant) {
      setFavoriteIds([]);
      return;
    }
    try {
      setIsLoading(true);
      const res = await propertyApi.getFavoriteRoomIds();
      const ids = (res as any).data || res;
      setFavoriteIds(Array.isArray(ids) ? ids : []);
    } catch (error) {
      console.error('Failed to load favorites', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isTenant]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (roomId: number) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để lưu phòng yêu thích');
      return false;
    }
    
    if (!isTenant) {
      toast.error('Chỉ khách thuê mới có thể sử dụng chức năng này');
      return false;
    }

    const isFav = favoriteIds.includes(roomId);
    
    if (!isFav && favoriteIds.length >= 20) {
      toast.error('Bạn chỉ có thể lưu tối đa 20 phòng yêu thích');
      return false;
    }

    // Optimistic UI update
    setFavoriteIds(prev => 
      isFav ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );

    try {
      await propertyApi.toggleFavoriteRoom(roomId);
      if (isFav) {
        toast.success('Đã bỏ yêu thích phòng');
      } else {
        toast.success('Đã thêm phòng vào yêu thích');
      }
      return true;
    } catch (error) {
      // Revert on error
      setFavoriteIds(prev => 
        isFav ? [...prev, roomId] : prev.filter(id => id !== roomId)
      );
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
      return false;
    }
  }, [isAuthenticated, isTenant, favoriteIds]);

  const isFavorite = useCallback((roomId: number) => {
    return favoriteIds.includes(roomId);
  }, [favoriteIds]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isLoading,
        toggleFavorite,
        isFavorite,
        refreshFavorites: loadFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
