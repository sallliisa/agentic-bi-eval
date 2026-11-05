<script setup lang="ts">
import { computed } from 'vue'

type DiffKind = 'same' | 'removed' | 'added' | 'changed'
type Operation = { kind: 'same' | 'removed' | 'added'; line: string }
type DiffRow = {
  kind: DiffKind
  target: string | null
  response: string | null
  targetLine: number | null
  responseLine: number | null
}

const props = defineProps<{
  expected: string
  actual: string
}>()

function parseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortObjectKeys(child)])
    )
  }
  return value
}

function formattedJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value), null, 2)
}

function comparisonTexts(expected: string, actual: string) {
  const targetValue = parseJson(expected)
  if (targetValue === undefined) return { target: expected, response: actual, note: undefined }

  const fence = actual.match(/^(```[^\r\n]*\r?\n)([\s\S]*?)(\r?\n```\s*)$/)
  const responseText = fence?.[2] ?? actual
  const responseValue = parseJson(responseText)
  if (responseValue === undefined) return { target: expected, response: actual, note: undefined }

  return {
    target: formattedJson(targetValue),
    response: fence ? `${fence[1]}${formattedJson(responseValue)}${fence[3]}` : formattedJson(responseValue),
    note: fence ? 'JSON formatting and object key order are normalized. The response’s Markdown fence remains visible.' : 'JSON formatting and object key order are normalized for comparison.',
  }
}

function diffRowsFor(targetText: string, responseText: string): DiffRow[] {
  const target = targetText.split(/\r?\n/)
  const response = responseText.split(/\r?\n/)
  const lengths: number[][] = Array.from({ length: target.length + 1 }, () => Array<number>(response.length + 1).fill(0))

  for (let targetIndex = target.length - 1; targetIndex >= 0; targetIndex -= 1) {
    for (let responseIndex = response.length - 1; responseIndex >= 0; responseIndex -= 1) {
      lengths[targetIndex][responseIndex] =
        target[targetIndex] === response[responseIndex] ? 1 + lengths[targetIndex + 1][responseIndex + 1] : Math.max(lengths[targetIndex + 1][responseIndex], lengths[targetIndex][responseIndex + 1])
    }
  }

  const operations: Operation[] = []
  let targetIndex = 0
  let responseIndex = 0
  while (targetIndex < target.length || responseIndex < response.length) {
    if (targetIndex < target.length && responseIndex < response.length && target[targetIndex] === response[responseIndex]) {
      operations.push({ kind: 'same', line: target[targetIndex] })
      targetIndex += 1
      responseIndex += 1
    } else if (targetIndex < target.length && (responseIndex === response.length || lengths[targetIndex + 1][responseIndex] >= lengths[targetIndex][responseIndex + 1])) {
      operations.push({ kind: 'removed', line: target[targetIndex] })
      targetIndex += 1
    } else {
      operations.push({ kind: 'added', line: response[responseIndex] })
      responseIndex += 1
    }
  }

  const rows: Array<Omit<DiffRow, 'targetLine' | 'responseLine'>> = []
  let operationIndex = 0
  while (operationIndex < operations.length) {
    const operation = operations[operationIndex]
    if (operation.kind === 'same') {
      rows.push({ kind: 'same', target: operation.line, response: operation.line })
      operationIndex += 1
      continue
    }

    const removed: string[] = []
    const added: string[] = []
    while (operationIndex < operations.length && operations[operationIndex].kind !== 'same') {
      const change = operations[operationIndex]
      if (change.kind === 'removed') removed.push(change.line)
      else added.push(change.line)
      operationIndex += 1
    }
    const changeCount = Math.max(removed.length, added.length)
    for (let index = 0; index < changeCount; index += 1) {
      const targetLine = removed[index] ?? null
      const responseLine = added[index] ?? null
      rows.push({
        kind: targetLine !== null && responseLine !== null ? 'changed' : targetLine !== null ? 'removed' : 'added',
        target: targetLine,
        response: responseLine,
      })
    }
  }

  let targetLine = 0
  let responseLine = 0
  return rows.map((row) => {
    if (row.target !== null) targetLine += 1
    if (row.response !== null) responseLine += 1
    return {
      ...row,
      targetLine: row.target === null ? null : targetLine,
      responseLine: row.response === null ? null : responseLine,
    }
  })
}

const comparison = computed(() => comparisonTexts(props.expected, props.actual))
const rows = computed(() => diffRowsFor(comparison.value.target, comparison.value.response))
const removedCount = computed(() => rows.value.filter((row) => row.kind === 'removed' || row.kind === 'changed').length)
const addedCount = computed(() => rows.value.filter((row) => row.kind === 'added' || row.kind === 'changed').length)

function cellClass(kind: DiffKind, side: 'target' | 'response'): string {
  if (kind === 'same') return 'text-on-surface'
  if ((kind === 'removed' || kind === 'changed') && side === 'target') return 'bg-error-container text-on-error-container'
  if ((kind === 'added' || kind === 'changed') && side === 'response') return 'bg-primary-container text-on-primary-container'
  return 'bg-surface-container-low text-on-surface-variant'
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-2" aria-label="Response diff">
    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p aria-live="polite">
        <span class="text-error">− {{ removedCount }} removed</span>
        <span class="mx-2 text-muted">·</span>
        <span class="text-primary">+ {{ addedCount }} added</span>
      </p>
      <p v-if="comparison.note" class="text-muted">{{ comparison.note }}</p>
    </div>
    <div role="table" aria-label="Expected and actual response" class="overflow-x-auto rounded border border-outline-variant">
      <div role="row" class="grid min-w-[32rem] grid-cols-2 border-b border-outline-variant bg-surface-container-low text-sm font-medium">
        <div role="columnheader" class="px-3 py-2">Expected response</div>
        <div role="columnheader" class="border-l border-outline-variant px-3 py-2">Actual response</div>
      </div>
      <div role="rowgroup" class="min-w-[32rem]">
        <div v-for="(row, index) in rows" :key="index" role="row" class="grid grid-cols-2 border-b border-outline-variant last:border-b-0">
          <div role="cell" class="flex min-w-0 gap-2 px-2 py-1 font-mono text-xs" :class="cellClass(row.kind, 'target')">
            <span class="w-8 shrink-0 select-none text-right opacity-60">{{ row.targetLine ?? '' }}</span>
            <span class="min-w-0 whitespace-pre-wrap break-all">{{ row.target ?? '' }}</span>
            <span v-if="row.kind === 'removed' || row.kind === 'changed'" class="sr-only">Removed from target</span>
          </div>
          <div role="cell" class="flex min-w-0 gap-2 border-l border-outline-variant px-2 py-1 font-mono text-xs" :class="cellClass(row.kind, 'response')">
            <span class="w-8 shrink-0 select-none text-right opacity-60">{{ row.responseLine ?? '' }}</span>
            <span class="min-w-0 whitespace-pre-wrap break-all">{{ row.response ?? '' }}</span>
            <span v-if="row.kind === 'added' || row.kind === 'changed'" class="sr-only">Added to response</span>
          </div>
        </div>
      </div>
    </div>
    <p v-if="removedCount === 0 && addedCount === 0" role="status" class="text-sm text-muted">No differences. The response matches the target.</p>
  </section>
</template>
