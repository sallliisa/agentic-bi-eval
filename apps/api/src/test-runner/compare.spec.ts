import { describe, expect, it } from 'vitest'
import { compareExpectedResult } from './compare'

describe('compareExpectedResult', () => {
  it('trims only outer whitespace for plain text', () => {
    expect(compareExpectedResult('  ready\n', '\nready  ')).toBe('PASS')
    expect(compareExpectedResult('ready', 'ready now')).toBe('FAIL')
  })

  it('compares JSON objects without using key order', () => {
    expect(compareExpectedResult('{"name":"Road","count":2}', '{"count":2,"name":"Road"}')).toBe('PASS')
    expect(compareExpectedResult('{"name":"Road","count":2}', '{"count":3,"name":"Road"}')).toBe('FAIL')
  })

  it('keeps JSON array order', () => {
    expect(compareExpectedResult('[1,2]', '[1,2]')).toBe('PASS')
    expect(compareExpectedResult('[1,2]', '[2,1]')).toBe('FAIL')
  })

  it('keeps JSON arrays distinct from objects', () => {
    expect(compareExpectedResult('[]', '{}')).toBe('FAIL')
    expect(compareExpectedResult('[1]', '{"0":1}')).toBe('FAIL')
  })

  it('fails when the actual response is invalid JSON and the expected result is JSON', () => {
    expect(compareExpectedResult('{"count":2}', '{count:2}')).toBe('FAIL')
  })
})
