export function programTema(programAd: string): string {
  if (programAd?.toLowerCase().includes('esma')) return 'esma'
  return 'musab'
}

export function temaPrimary(tema: string): string {
  if (tema === 'esma') return 'text-purple-500'
  return 'text-emerald-700'
}

export function temaBg(tema: string): string {
  if (tema === 'esma') return 'bg-purple-400'
  return 'bg-emerald-600'
}

export function temaAccent(tema: string): string {
  if (tema === 'esma') return 'bg-purple-50 border-purple-100'
  return 'bg-emerald-50 border-emerald-100'
}

export function temaHover(tema: string): string {
  if (tema === 'esma') return 'hover:bg-purple-500'
  return 'hover:bg-emerald-700'
}

export function temaButton(tema: string, aktif: boolean): string {
  if (!aktif) return 'border border-gray-200 text-gray-500 hover:bg-gray-50'
  if (tema === 'esma') return 'bg-purple-400 text-white'
  return 'bg-emerald-600 text-white'
}

export function temaTab(tema: string, aktif: boolean): string {
  if (!aktif) return 'border-transparent text-gray-400 hover:text-gray-600'
  if (tema === 'esma') return 'border-purple-400 text-purple-500 font-medium'
  return 'border-emerald-600 text-emerald-700 font-medium'
}