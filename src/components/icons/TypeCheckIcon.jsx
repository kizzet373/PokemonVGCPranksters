import React from 'react';

export function TypeCheckIcon({ size = 18, ...props }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 3V21" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M4 7.5L12 12L20 7.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 16.5L12 12L20 16.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
