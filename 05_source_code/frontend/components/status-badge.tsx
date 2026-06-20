export function StatusBadge({
  tone,
  children,
}: {
  tone: "info" | "warning" | "critical" | "success" | "error";
  children: React.ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
