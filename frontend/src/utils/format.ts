/**
 * Tiện ích định dạng dữ liệu (tiền tệ, ngày tháng, số lượng)
 */

/**
 * Format số thành tiền tệ VNĐ (VD: 1.000.000đ)
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0đ';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0đ';
  return num.toLocaleString('vi-VN') + 'đ';
};

/**
 * Format ngày tháng ngắn gọn (VD: 24/05/2026)
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format ngày giờ chi tiết (VD: 15:30 24/05/2026)
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format số lượng có dấu phẩy ngăn cách (VD: 1,000,000)
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US'); // dùng en-US để hiển thị dấu phẩy 1,000
};
