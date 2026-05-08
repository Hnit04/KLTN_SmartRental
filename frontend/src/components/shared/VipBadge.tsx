import { Crown } from 'lucide-react';

interface VipBadgeProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_STYLES: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  FREE: { emoji: '', label: 'Free', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  SILVER: { emoji: '🥈', label: 'Silver', bg: 'bg-gradient-to-r from-slate-100 to-blue-50', text: 'text-slate-700', border: 'border-slate-300' },
  GOLD: { emoji: '🥇', label: 'Gold', bg: 'bg-gradient-to-r from-amber-100 to-yellow-50', text: 'text-amber-800', border: 'border-amber-300' },
  PLATINUM: { emoji: '💎', label: 'Platinum', bg: 'bg-gradient-to-r from-violet-100 to-purple-50', text: 'text-violet-800', border: 'border-violet-300' },
};

export default function VipBadge({ tier, size = 'md' }: VipBadgeProps) {
  const style = TIER_STYLES[tier] || TIER_STYLES.FREE;

  if (tier === 'FREE') return null; // Không hiện badge cho FREE

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${style.text}`}>
        {style.emoji} {style.label}
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${style.bg} border ${style.border}`}>
        <span className="text-xl">{style.emoji}</span>
        <div>
          <p className={`font-bold text-sm ${style.text}`}>{style.label}</p>
          <p className="text-[10px] text-gray-400">VIP Member</p>
        </div>
      </div>
    );
  }

  // md (default)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text} border ${style.border}`}>
      {style.emoji} {style.label}
    </span>
  );
}
