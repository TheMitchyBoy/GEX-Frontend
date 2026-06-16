interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
}

export function PageHeader({ title, description, badge }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <h1>{title}</h1>
        {badge ? <span className="page-badge">{badge}</span> : null}
      </div>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
