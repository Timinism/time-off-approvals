export function PageHeader({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        {children ? <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
