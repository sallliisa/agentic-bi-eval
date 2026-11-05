import { update } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'

export const PATCH = update({ authorize: requirePermission('manage-test-sets') })
