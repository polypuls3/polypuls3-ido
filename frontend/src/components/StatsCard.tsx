interface StatsCardProps {
  title: string;
  value: string;
  suffix?: string;
  subtitle?: string;
}

export function StatsCard({ title, value, suffix, subtitle }: StatsCardProps) {
  return (
    <div className="glass-card p-6">
      <p className="text-sm text-white/60 mb-1">{title}</p>
      <p className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-lg text-white/70 ml-1">{suffix}</span>}
      </p>
      {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
    </div>
  );
}
