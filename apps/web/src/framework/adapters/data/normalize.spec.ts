import { describe, expect, it } from 'vitest'
import { normalizeCollection, normalizeError, normalizeRecord } from './normalize'

describe('web data adapter', () => {
  it('normalizes the project collection envelope once', () => {
    expect(normalizeCollection({ data: [{ id: '1' }], page: 1, limit: 10, total: 21 })).toEqual({
      data: [{ id: '1' }],
      meta: { page: 1, pageSize: 10, total: 21, totalPage: 3 },
    })
  })

  it('preserves canonical nested metadata', () => {
    expect(
      normalizeCollection({
        data: [{ id: '1' }],
        meta: { page: 2, pageSize: 10, total: 21, totalPage: 3 },
      })
    ).toEqual({
      data: [{ id: '1' }],
      meta: { page: 2, pageSize: 10, total: 21, totalPage: 3 },
    })
  })

  it('unwraps record envelopes using the configured adapter function shape', () => {
    expect(normalizeRecord({ data: { id: '1' } })).toEqual({ id: '1' })
    expect(normalizeRecord({ id: '1' })).toEqual({ id: '1' })
  })

  it('keeps post-write error details when it normalizes the message', () => {
    const error = Object.assign(new Error('The write may have completed.'), {
      code: 'RESOURCE_RESULT_INVALID',
      operation: 'update',
      retryable: false,
      postWrite: true,
    })

    expect(normalizeError(error)).toEqual({
      message: 'The write may have completed.',
      code: 'RESOURCE_RESULT_INVALID',
      operation: 'update',
      retryable: false,
      postWrite: true,
    })
  })

  it('preserves a confirmed undefined result and its read recovery callback', () => {
    const refresh = async () => {}
    const issues = [{ path: ['name'], message: 'Required.' }]
    const error = Object.assign(new Error('The write was saved, but the read failed.'), {
      code: 'RESOURCE_POST_WRITE_INVALIDATION_FAILED',
      operation: 'delete',
      retryable: false,
      postWrite: true,
      writeOutcome: 'confirmed',
      result: undefined,
      refresh,
      issues,
    })
    const normalized = normalizeError(error)

    expect(normalized).toEqual({
      message: 'The write was saved, but the read failed.',
      code: 'RESOURCE_POST_WRITE_INVALIDATION_FAILED',
      operation: 'delete',
      retryable: false,
      postWrite: true,
      writeOutcome: 'confirmed',
      result: undefined,
      refresh,
      issues,
    })
    expect(Object.hasOwn(normalized, 'result')).toBe(true)
  })
})
