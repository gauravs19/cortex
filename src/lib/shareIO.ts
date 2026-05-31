import LZString from 'lz-string'
import type { Estimate } from '../types'

export function encodeEstimateToUrl(est: Estimate): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(est))
  const base = window.location.href.split('#')[0]
  return `${base}#/?share=${compressed}`
}

export function decodeEstimateFromUrl(): Estimate | null {
  const hash = window.location.hash
  const match = hash.match(/[?&]share=([^&]*)/)
  if (!match) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(match[1])
    if (!json) return null
    const est = JSON.parse(json) as Estimate
    if (!est.id || !est.name) return null
    return est
  } catch {
    return null
  }
}

export function clearShareFromUrl(): void {
  const hash = window.location.hash.split('?')[0]
  window.history.replaceState(null, '', window.location.pathname + hash)
}
