export default function Footer() {
  return (
    <footer className="mt-16 pb-8">
      <div className="gradient-divider mb-8" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-dim)]">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="text-[var(--text-muted)]">Gastro Tucumán</span>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
          Sistema operativo
        </p>
      </div>
    </footer>
  );
}
