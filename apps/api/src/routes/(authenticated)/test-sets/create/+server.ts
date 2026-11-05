import { create } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'

export const POST = create({ authorize: requirePermission('manage-test-sets') })
