export const ProtectionStatus = () => (
  <div className="flex items-center gap-2">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="#1CF6C2"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="text-xs text-[#109071] font-medium">
      Front-running protection always active
    </span>
  </div>
);
