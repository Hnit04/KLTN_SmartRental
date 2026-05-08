import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Room } from '@/types/index';
import { toast } from 'sonner';

interface CompareContextType {
  compareList: Room[];
  isCompareModalOpen: boolean;
  addToCompare: (room: Room) => void;
  removeFromCompare: (roomId: number) => void;
  clearCompare: () => void;
  isInCompare: (roomId: number) => boolean;
  openCompareModal: () => void;
  closeCompareModal: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<Room[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const addToCompare = (room: Room) => {
    if (compareList.some(r => r.id === room.id)) {
      setCompareList(prev => prev.filter(r => r.id !== room.id));
      toast.info('Đã bỏ phòng khỏi danh sách so sánh');
      return;
    }
    
    if (compareList.length >= 4) {
      toast.error('Bạn chỉ có thể so sánh tối đa 4 phòng cùng lúc');
      return;
    }

    setCompareList(prev => [...prev, room]);
    toast.success('Đã thêm phòng vào danh sách so sánh');
  };

  const removeFromCompare = (roomId: number) => {
    setCompareList(prev => prev.filter(r => r.id !== roomId));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const isInCompare = (roomId: number) => {
    return compareList.some(r => r.id === roomId);
  };

  const openCompareModal = () => {
    if (compareList.length < 2) {
      toast.info('Vui lòng chọn ít nhất 2 phòng để so sánh');
      return;
    }
    setIsCompareModalOpen(true);
  };

  const closeCompareModal = () => {
    setIsCompareModalOpen(false);
  };

  return (
    <CompareContext.Provider
      value={{
        compareList,
        isCompareModalOpen,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        openCompareModal,
        closeCompareModal
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
