import { type AdjustmentParams, BID_MIN, BID_MAX } from './types'

/**
 * 文字列や不正値を安全に数値へ変換する。
 * 空欄・null・undefined・変換不能な文字列は 0 を返す。
 */
export function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * 入札額を上下限でクランプする（最小1、最大200）。
 */
export function clampBid(bid: number): number {
  return Math.min(BID_MAX, Math.max(BID_MIN, bid))
}

/**
 * 入札額を小数第2位で四捨五入する。
 */
export function roundBid(bid: number): number {
  return Math.round(bid * 100) / 100
}

/**
 * ROAS / クリック数に基づいてΔを決定する。
 */
export function getDelta(
  roas: number,
  clicks: number,
  params: AdjustmentParams,
): number {
  if (roas === 0 && clicks <= params.clickThreshold) return params.deltaRule1
  if (roas === 0 && clicks > params.clickThreshold) return params.deltaRule2
  if (roas > 0 && roas < params.roasLower) return params.deltaRule3
  if (roas >= params.roasLower && roas < params.roasUpper) return params.deltaRule4
  if (roas >= params.roasUpper) return params.deltaRule5
  return 0
}

/**
 * 入札額を調整する（Δ加算 → 四捨五入 → クランプ）。
 */
export function adjustBid(
  currentBid: number,
  roas: number,
  clicks: number,
  params: AdjustmentParams,
): number {
  const delta = getDelta(roas, clicks, params)
  const newBid = currentBid + delta
  return clampBid(roundBid(newBid))
}
