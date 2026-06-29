import type { ReactNode } from "react";

export function Metric({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function ModuleCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="module-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
