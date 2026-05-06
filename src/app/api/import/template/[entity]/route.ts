import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate, ENTITY_FILE_PREFIX, type ImportEntity } from '@/lib/excel-templates'

const ENTITIES = Object.keys(ENTITY_FILE_PREFIX) as ImportEntity[]

export async function GET(_request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  if (!ENTITIES.includes(entity as ImportEntity)) {
    return new NextResponse('Unknown entity', { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const buffer = await generateTemplate(entity as ImportEntity)
  const filename = `template_${ENTITY_FILE_PREFIX[entity as ImportEntity]}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
