// Ortak UI stilleri — tüm sayfalar bu dosyayı kullanır

export const ui = {
  // Sayfalar
  page: 'min-h-screen bg-stone-50',
  
  // Kartlar
  card: 'bg-white rounded-2xl border border-gray-100 shadow-sm',
  cardHeader: 'px-6 py-4 border-b border-gray-50 flex items-center justify-between',
  cardTitle: 'text-sm font-semibold text-gray-900',
  cardBody: 'divide-y divide-gray-50',
  cardEmpty: 'px-6 py-16 text-center text-sm text-gray-400',
  
  // Tablolar
  tableHead: 'px-6 py-3 text-left bg-gray-50/80',
  tableHeadCell: 'text-xs font-medium text-gray-400 uppercase tracking-wider',
  tableRow: 'px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors',
  tableCell: 'text-sm text-gray-700',
  tableCellMuted: 'text-sm text-gray-400',
  
  // Butonlar
  btnPrimary: (tema: string) => `inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-95 ${
    tema === 'esma' 
      ? 'bg-purple-500 hover:bg-purple-600 shadow-sm shadow-purple-200' 
      : 'bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-200'
  }`,
  btnSecondary: 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-95',
  btnDanger: 'text-xs text-red-400 hover:text-red-600 transition-colors',
  btnGhost: 'text-xs text-gray-400 hover:text-gray-600 transition-colors',
  
  // Input'lar
  input: 'w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all',
  inputEsma: 'w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-400/10 transition-all',
  select: 'h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all',
  
  // Badge'ler
  badgeGreen: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100',
  badgeRed: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100',
  badgeYellow: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100',
  badgeBlue: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100',
  badgeGray: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500',
  badgePurple: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600 border border-purple-100',
  
  // Modal
  modalOverlay: 'fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4',
  modalCard: 'bg-white rounded-2xl w-full max-w-md shadow-2xl',
  modalHeader: 'px-6 pt-6 pb-4 border-b border-gray-50',
  modalTitle: 'text-base font-semibold text-gray-900',
  modalBody: 'px-6 py-4 space-y-3',
  modalFooter: 'px-6 pb-6 pt-4 flex gap-2',
  
  // Form label
  label: 'block text-xs font-medium text-gray-500 mb-1.5',
  
  // Divider
  divider: 'h-px bg-gray-50',
}