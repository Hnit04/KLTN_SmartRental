import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmActionDialog from '@/components/shared/ConfirmActionDialog';

interface FormBlockerProps {
  isDirty: boolean;
  message?: string;
}

/**
 * Component chặn điều hướng khi form đang có thay đổi chưa lưu (isDirty = true).
 * Hoạt động với cả BrowserRouter (non-data router):
 *   1. Chặn F5 / đóng tab / reload trình duyệt (beforeunload)
 *   2. Chặn chuyển route SPA bằng cách đẩy thêm entry vào history
 *      và lắng nghe popstate để bắt nút Back/Forward
 *   3. Monkey-patch history.pushState để bắt chuyển trang qua Link/navigate()
 */
export default function FormBlocker({
  isDirty,
  message = "Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi? Dữ liệu hiện tại sẽ bị mất.",
}: FormBlockerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // 1. Chặn F5 / đóng tab / reload trình duyệt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // 2. Chặn chuyển route SPA (Link click, navigate(), nút Back)
  useEffect(() => {
    if (!isDirty) return;

    // Đẩy 1 entry sentinel vào history để bắt nút Back
    window.history.pushState({ formBlocker: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        // Đẩy lại entry để giữ nguyên URL
        window.history.pushState({ formBlocker: true }, '');
        setPendingPath('__back__');
        setShowDialog(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Monkey-patch history.pushState để bắt navigate() / Link click
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (state: any, title: string, url?: string | URL | null) {
      if (state?.formBlocker) {
        // Đây là entry sentinel của mình, cho qua
        return originalPushState(state, title, url);
      }
      if (isDirty && url) {
        const targetPath = typeof url === 'string' ? url : url.toString();
        // Chỉ chặn nếu đổi sang path khác
        if (targetPath !== location.pathname) {
          setPendingPath(targetPath);
          setShowDialog(true);
          return; // Chặn navigation
        }
      }
      return originalPushState(state, title, url);
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
    };
  }, [isDirty, location.pathname]);

  // Xử lý khi user xác nhận rời trang
  const handleConfirmLeave = useCallback(() => {
    setShowDialog(false);
    if (pendingPath === '__back__') {
      // User bấm Back: lùi 2 bước (1 sentinel + 1 trang thật)
      window.history.go(-2);
    } else if (pendingPath) {
      navigate(pendingPath);
    }
    setPendingPath(null);
  }, [pendingPath, navigate]);

  const handleCancelLeave = useCallback(() => {
    setShowDialog(false);
    setPendingPath(null);
  }, []);

  return (
    <ConfirmActionDialog
      isOpen={showDialog}
      onClose={handleCancelLeave}
      onConfirm={handleConfirmLeave}
      title="Xác nhận rời trang"
      description={message}
      confirmText="Rời đi"
      cancelText="Ở lại"
      isDestructive={true}
    />
  );
}
