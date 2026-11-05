import { list } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'

export const GET = list({ authorize: requirePermission('view-test-runs') })
