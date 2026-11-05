import { update } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'

export const PATCH = update({ authorize: requirePermission('execute-test-runs') })
