import { describe, expect, it } from 'vitest'

import type { ImportJob } from '../types'
import { findActiveImportJob, isActiveImportJob } from './importJob'

function job(status: ImportJob['status']): ImportJob {
  return {
    id: status,
    source_url: 'https://food.ru/recipes/test',
    status,
    recipe_id: null,
    error_message: null,
    created_at: '2026-09-04T10:00:00Z',
    updated_at: '2026-09-04T10:00:00Z',
  }
}

describe('importJob', () => {
  it('сохраняет отслеживание незавершённого импорта', () => {
    expect(isActiveImportJob(job('pending'))).toBe(true)
    expect(isActiveImportJob(job('processing'))).toBe(true)
    expect(isActiveImportJob(job('completed'))).toBe(false)
  })

  it('находит последнюю активную задачу среди недавних', () => {
    expect(findActiveImportJob([job('failed'), job('processing'), job('pending')])?.status).toBe(
      'processing',
    )
  })
})
