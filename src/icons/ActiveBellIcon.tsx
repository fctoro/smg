import React from "react";

export const ActiveBellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Bell body */}
    <path d="M10 22a2 2 0 0 0 4 0" />
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    {/* Sound waves / ringing effect left */}
    <path d="M2.5 3.5a10 10 0 0 0-1 6" />
    <path d="M5.5 1A14.5 14.5 0 0 0 0 9.5" />
    {/* Sound waves / ringing effect right */}
    <path d="M21.5 3.5a10 10 0 0 1 1 6" />
    <path d="M18.5 1A14.5 14.5 0 0 1 24 9.5" />
  </svg>
);
