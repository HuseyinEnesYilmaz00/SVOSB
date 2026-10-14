import 'server-only'
import supabaseAdmin from './admin'

export async function canManageProgram(userId: string, role: string, programId: string) {
  if (role === 'super_admin') return true
  const { data, error } = await supabaseAdmin.from('kullanici_programlar')
    .select('program_id').eq('kullanici_id', userId).eq('program_id', programId).maybeSingle()
  return !error && !!data
}

export async function canManageClass(userId: string, role: string, classId: string) {
  const { data, error } = await supabaseAdmin.from('siniflar')
    .select('program_id').eq('id', classId).maybeSingle()
  return !error && !!data?.program_id && canManageProgram(userId, role, data.program_id)
}

// Account-wide actions require authority over every program attached to the target.
export async function canManageUser(userId: string, role: string, targetId: string) {
  const { data: target, error } = await supabaseAdmin.from('kullanicilar')
    .select('rol').eq('id', targetId).maybeSingle()
  if (error || !target || !['ogrenci', 'ogretmen'].includes(target.rol)) return false
  if (role === 'super_admin') return true
  const [memberships, students, lessons, allowed] = await Promise.all([
    supabaseAdmin.from('kullanici_programlar').select('program_id').eq('kullanici_id', targetId),
    supabaseAdmin.from('ogrenciler').select('siniflar(program_id)').eq('kullanici_id', targetId),
    supabaseAdmin.from('ogretmen_dersleri').select('dersler(siniflar(program_id))').eq('ogretmen_id', targetId),
    supabaseAdmin.from('kullanici_programlar').select('program_id').eq('kullanici_id', userId),
  ])
  if ([memberships, students, lessons, allowed].some(result => result.error)) return false
  // PostgREST relationship types depend on generated schema types; flatten both shapes.
  const collect = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(collect)
    if (!value || typeof value !== 'object') return []
    return Object.entries(value).flatMap(([key, child]) =>
      key === 'program_id' && typeof child === 'string' ? [child] : collect(child))
  }
  const programs = new Set(collect([memberships.data, students.data, lessons.data]))
  const permitted = new Set(collect(allowed.data))
  return programs.size > 0 && [...programs].every(id => permitted.has(id))
}
