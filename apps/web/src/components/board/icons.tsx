import type { ReactNode } from "react";

function Icon({ children, width = 2 }: { children: ReactNode; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const PlusIcon = () => (
  <Icon width={2.6}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
);
export const DotsIcon = () => (
  <Icon width={2.4}>
    <circle cx="12" cy="5" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="12" cy="19" r="1.2" />
  </Icon>
);
export const GripIcon = () => (
  <Icon width={2.4}>
    <circle cx="9" cy="6" r="1.1" />
    <circle cx="15" cy="6" r="1.1" />
    <circle cx="9" cy="12" r="1.1" />
    <circle cx="15" cy="12" r="1.1" />
    <circle cx="9" cy="18" r="1.1" />
    <circle cx="15" cy="18" r="1.1" />
  </Icon>
);
export const MoveIcon = () => (
  <Icon>
    <path d="M5 12h14M15 8l4 4-4 4M9 8l-4 4 4 4" />
  </Icon>
);
export const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);
export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icon>
);
export const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const ChevronIcon = () => (
  <Icon width={2.6}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
