import React from 'react';

// 假設這是從父層傳進來的 orders 資料，或是您也可以在這裡 fetch
const AmountDisplay = ({ orders }) => {
  
  // React 寫法：直接在 render 前計算即可
  // 1. 篩選出 status 為 '已成團' 的項目
  // 2. 加總 price
  const totalAmount = orders
    .filter(item => item.status === '已成團')
    .reduce((sum, item) => sum + item.price, 0);

  // 格式化金額 (加上逗號)
  const formattedAmount = totalAmount.toLocaleString();

  return (
    <div className="flex flex-col items-end justify-center mr-6 pr-6 border-r border-gray-200">
      <span className="text-xs text-gray-500">當前累積的團務總金額</span>
      <span className="text-lg font-bold text-orange-500">
        NT$ {formattedAmount}
      </span>
    </div>
  );
};

export default AmountDisplay;