export type TestVerdict = 'PASS' | 'FAIL'

function equalJsonValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (typeof left !== typeof right || left === null || right === null) return false
  if (Array.isArray(left) !== Array.isArray(right)) return false

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => equalJsonValue(value, right[index]))
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key) => Object.hasOwn(right, key) && equalJsonValue(Reflect.get(left, key), Reflect.get(right, key)))
  }

  return false
}

export function compareExpectedResult(expectedText: string, actualText: string): TestVerdict {
  let expected: unknown
  try {
    expected = JSON.parse(expectedText)
  } catch {
    return expectedText.trim() === actualText.trim() ? 'PASS' : 'FAIL'
  }

  let actual: unknown
  try {
    actual = JSON.parse(actualText)
  } catch {
    return 'FAIL'
  }

  return equalJsonValue(expected, actual) ? 'PASS' : 'FAIL'
}
