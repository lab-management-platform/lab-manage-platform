import type { PropsWithChildren, ReactNode } from "react";

interface SectionProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  extra?: ReactNode;
  children?: ReactNode;
}

export function SectionCard({ title, eyebrow, extra, children }: SectionProps) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {extra ? <div className="section-extra">{extra}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  title,
  value,
  hint,
  accent = "sage"
}: {
  title: string;
  value: string | number;
  hint: string;
  accent?: "sage" | "gold" | "ink" | "danger";
}) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-glyph">!</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone
}: PropsWithChildren<{ tone: "active" | "pending" | "muted" | "danger" }>) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}
