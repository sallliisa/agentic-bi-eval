import { domain as auth } from './routes/auth/auth.domain'
import { domain as permissions } from './routes/(authenticated)/permissions/permissions'
import { domain as roles } from './routes/(authenticated)/roles/roles'
import { domain as users } from './routes/(authenticated)/users/users'
import { domain as testSets } from './routes/(authenticated)/test-sets/test-sets'
import { domain as testRuns } from './routes/(authenticated)/test-runs/test-runs'

export const domains = [auth, permissions, roles, users, testSets, testRuns] as const
