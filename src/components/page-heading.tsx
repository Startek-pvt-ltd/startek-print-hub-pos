export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>{eyebrow ? <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">{eyebrow}</p> : null}<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-slate-500">{description}</p></div>
      {action}
    </div>
  );
}
