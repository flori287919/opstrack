import ExcelJS from 'exceljs'

export type RawRow = Record<string, unknown>

export type RowError = { row: number; column?: string; message: string }

export type PreviewResult<T> = {
  ok: boolean
  total: number
  validRows: T[]
  errors: RowError[]
  preview: Array<Record<string, unknown>>
}

export type CommitResult = {
  ok: boolean
  inserted: number
  errors: RowError[]
}

const EXCEL_DATE_EPOCH = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

export async function readWorkbook(buffer: ArrayBuffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) return []

  const headerRow = ws.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim()
  })

  const out: RawRow[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    if (!row.hasValues) continue
    const obj: RawRow = {}
    let nonEmpty = false
    headers.forEach((h, i) => {
      if (!h) return
      const cell = row.getCell(i + 1)
      const v = cell.value
      if (v != null && v !== '') {
        nonEmpty = true
        // ExcelJS returns rich text objects, hyperlinks, formula results — normalize
        if (typeof v === 'object' && v !== null) {
          const o = v as { result?: unknown; text?: unknown; hyperlink?: unknown; richText?: Array<{ text: string }> }
          if ('result' in o && o.result != null) obj[h] = o.result
          else if ('text' in o && o.text != null) obj[h] = o.text
          else if ('hyperlink' in o && o.hyperlink != null) obj[h] = o.hyperlink
          else if (Array.isArray(o.richText)) obj[h] = o.richText.map((p) => p.text).join('')
          else obj[h] = v
        } else {
          obj[h] = v
        }
      }
    })
    if (nonEmpty) out.push(obj)
  }
  return out
}

export function parseString(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v).trim()
}

export function parseNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim().replace(/,/g, '.').replace(/[^\d.\-]/g, '')
  if (s === '' || s === '-' || s === '.') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function parseInteger(v: unknown): number | null {
  const n = parseNumber(v)
  return n == null ? null : Math.trunc(n)
}

export function parseBoolean(v: unknown): boolean | null {
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v
  const s = String(v).trim().toLowerCase()
  if (['po', 'yes', 'true', '1', 'y'].includes(s)) return true
  if (['jo', 'no', 'false', '0', 'n'].includes(s)) return false
  return null
}

/** Returns YYYY-MM-DD or null. Accepts: Date, Excel serial, "DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", ISO strings. */
export function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    return v.toISOString().slice(0, 10)
  }
  if (typeof v === 'number') {
    // Excel serial date
    const ms = EXCEL_DATE_EPOCH + v * MS_PER_DAY
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s)
  if (m) {
    const [, dd, mm, yyyy] = m
    const yr = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy)
    const month = Number(mm)
    const day = Number(dd)
    if (yr >= 1900 && yr <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return iso
    }
  }

  // Fallback: native Date parse
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function parseEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  const s = parseString(v)
  if (!s) return null
  const match = allowed.find((a) => a.toLowerCase() === s.toLowerCase())
  return match ?? null
}

/** Build a case-insensitive lookup map: name → id. */
export function buildLookup(rows: Array<{ id: string; key: string | null }>): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of rows) {
    if (r.key) m.set(r.key.trim().toLowerCase(), r.id)
  }
  return m
}

export function sliceForPreview(rows: Array<Record<string, unknown>>, limit = 10): Array<Record<string, unknown>> {
  return rows.slice(0, limit)
}
