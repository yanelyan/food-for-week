import type { ImportJob } from '../types'

export function isActiveImportJob(job: ImportJob | null): job is ImportJob {
  return job?.status === 'pending' || job?.status === 'processing'
}

export function findActiveImportJob(jobs: ImportJob[]): ImportJob | null {
  return jobs.find((job) => isActiveImportJob(job)) ?? null
}
