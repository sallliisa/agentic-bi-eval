import { detail } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'

export const GET = detail({ authorize: requirePermission('view-test-sets') })
