import type { ReactNode } from "react";

type IconProps = {
  children: ReactNode;
};

function SvgIcon({ children }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="16" height="16">
      {children}
    </svg>
  );
}

export function DashboardIcon() {
  return (
    <SvgIcon>
      <path d="M3 3.5h5.5v5.5H3zM11.5 3.5H17v3h-5.5zM11.5 9.5H17v7H11.5zM3 11.5h5.5v5H3z" stroke="currentColor" strokeWidth="1.4" rx="1" />
    </SvgIcon>
  );
}

export function ContentIcon() {
  return (
    <SvgIcon>
      <path d="M5.2 5.3h6.3a1.7 1.7 0 0 1 1.2.5l2 2a1.7 1.7 0 0 1 .5 1.2v5.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7a1.7 1.7 0 0 1 1.7-1.7Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.5 5.6V8a1 1 0 0 0 1 1h2.4" stroke="currentColor" strokeWidth="1.4" />
    </SvgIcon>
  );
}

export function LinkIcon() {
  return (
    <SvgIcon>
      <path d="M7.8 12.2 6 14a2.4 2.4 0 1 1-3.4-3.4L4.4 8.8M12.2 7.8 14 6a2.4 2.4 0 1 1 3.4 3.4l-1.8 1.8M7 13l6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function LogsIcon() {
  return (
    <SvgIcon>
      <path d="M4 4.5h12v11H4z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.8 8h6.4M6.8 11h6.4M6.8 14h3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function PlusIcon() {
  return (
    <SvgIcon>
      <path d="M10 4.2v11.6M4.2 10h11.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function SearchIcon() {
  return (
    <SvgIcon>
      <circle cx="8.5" cy="8.5" r="4.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="m12.2 12.2 3.3 3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function PencilIcon() {
  return (
    <SvgIcon>
      <path d="M4.4 13.9 13 5.3l1.8 1.8-8.6 8.6-2.7.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function CopyIcon() {
  return (
    <SvgIcon>
      <path d="M7 6.5h8v9H7zM5 13.5H4.5A1.5 1.5 0 0 1 3 12V4.5A1.5 1.5 0 0 1 4.5 3H12A1.5 1.5 0 0 1 13.5 4.5V5" stroke="currentColor" strokeWidth="1.4" />
    </SvgIcon>
  );
}

export function TrashIcon() {
  return (
    <SvgIcon>
      <path d="M5.8 6.2h8.4M8 6.2V4.8h4v1.4M7 8.2v5.4M10 8.2v5.4M13 8.2v5.4M6 6.2l.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function CalendarIcon() {
  return (
    <SvgIcon>
      <path d="M5 5.5h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 3.8v3M13.5 3.8v3M3.8 8.2h12.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function WarningIcon() {
  return (
    <SvgIcon>
      <path d="m10 3.7 6.2 10.8A1 1 0 0 1 15.3 16H4.7a1 1 0 0 1-.9-1.5L10 3.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 7.4v4.2M10 13.9h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function CheckCircleIcon() {
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m7.2 10.1 1.9 1.9 3.7-3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function UploadIcon() {
  return (
    <SvgIcon>
      <path d="M10 12.8V5.4M7.2 8.2 10 5.4l2.8 2.8M4.2 13.8v.7A1.5 1.5 0 0 0 5.7 16h8.6a1.5 1.5 0 0 0 1.5-1.5v-.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function ArrowLeftIcon() {
  return (
    <SvgIcon>
      <path d="M8 5.2 3.8 9.4 8 13.6M4.1 9.4h11.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}