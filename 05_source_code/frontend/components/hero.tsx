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
      <p className="eyebrow">{eyebrow}</p>
      <div className="hero-grid">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        {actions ? <div className="button-row">{actions}</div> : null}
      </div>
    </section>
  );
}