export function programTema(programAd: string): string {
  if (programAd?.toLowerCase().includes('esma')) return 'esma'
  return 'musab'
}

export function temaPrimary(tema: string): string {
  if (tema === 'esma') return 'text-purple-600'
  return 'text-green-700'
}

export function temaBg(tema: string): string {
  if (tema === 'esma') return 'bg-purple-600'
  return 'bg-green-700'
}

export function temaAccent(tema: string): string {
  if (tema === 'esma') return 'bg-purple-50 border-purple-200'
  return 'bg-green-50 border-green-200'
}

export function temaHover(tema: string): string {
  if (tema === 'esma') return 'hover:bg-purple-700'
  return 'hover:bg-green-800'
}