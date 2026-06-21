export function Hero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <div className="page-hero-text">
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      {actions ? (
        <div className="button-row page-hero-actions">{actions}</div>
      ) : null}
    </section>
  );
}
