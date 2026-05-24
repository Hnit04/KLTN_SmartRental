import React, { InputHTMLAttributes } from 'react';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (val: string) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const formatCurrency = (val: string | number) => {
    if (val === '' || val === null || val === undefined) return '';
    // Xóa tất cả các ký tự không phải số
    const numericValue = val.toString().replace(/\D/g, '');
    // Thêm dấu chấm hàng nghìn
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Lấy giá trị chưa format (chỉ giữ lại số)
    const rawValue = e.target.value.replace(/\./g, '');
    
    // Chỉ cho phép nhập số
    if (/^\d*$/.test(rawValue)) {
      onChange(rawValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatCurrency(value)}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
