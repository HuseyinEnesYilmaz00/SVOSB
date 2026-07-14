import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function formatScore(score: number | null): string {
  if (score == null) return '—'
  return score.toFixed(1)
}

export function letterFromScore(score: number | null): string {
  if (score == null) return '—'
  if (score >= 90) return 'Pekiyi'
  if (score >= 75) return 'İyi'
  if (score >= 60) return 'Orta'
  if (score >= 50) return 'Geçer'
  return 'Başarısız'
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-sm">—</span>

  const color =
    score >= 90 ? 'bg-primary/10 text-primary border-primary/20' :
    score >= 75 ? 'bg-blue-50 text-blue-700 border-blue-200' :
    score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
    score >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
    'bg-destructive/10 text-destructive border-destructive/20'

  return (
    <Badge variant="outline" className={cn('font-semibold tabular-nums', color)}>
      {score.toFixed(1)}
    </Badge>
  )
}