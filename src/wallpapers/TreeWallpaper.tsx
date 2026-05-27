import React from 'react';

export const TreeWallpaper: React.FC<React.ComponentProps<'svg'>> = (props) => (
  <svg
    viewBox="0 0 1651 1117"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    // xMin — прижимает левый край к левой границе экрана
    // YMid — центрирует по вертикали
    // slice — масштабирует пропорционально, заполняя весь экран
    preserveAspectRatio="xMinYMid slice"
    {...props}
  >
    <g clipPath="url(#clip0_261_2428)">
      <path
        d="M-4.5 1146.5L4 -116.5L1664.5 -68.5C1624.67 -11.5 1819.18 163.889 1515.5 174C1095 188 970.321 -328.639 266.5 35.5C-122 236.5 89.5 466 365 802.5C640.5 1139 1047.5 877.5 1189 974.5C1330.5 1071.5 1495 1088 1390.5 1146.5C1306.9 1193.3 425.667 1166 -4.5 1146.5Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_261_2428">
        <rect width="1651" height="1117" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
