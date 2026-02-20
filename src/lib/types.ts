/** 入札調整ルールのパラメータ */
export interface AdjustmentParams {
  /** クリック閾値（デフォルト: 30） */
  clickThreshold: number
  /** ROAS下限境界（デフォルト: 3） */
  roasLower: number
  /** ROAS上限境界（デフォルト: 6） */
  roasUpper: number
  /** ルール1: ROAS==0 かつ Clicks<=閾値 の場合のΔ（デフォルト: -1） */
  deltaRule1: number
  /** ルール2: ROAS==0 かつ Clicks>閾値 の場合のΔ（デフォルト: -7） */
  deltaRule2: number
  /** ルール3: 0<ROAS<lower の場合のΔ（デフォルト: -5） */
  deltaRule3: number
  /** ルール4: lower<=ROAS<upper の場合のΔ（デフォルト: 0） */
  deltaRule4: number
  /** ルール5: ROAS>=upper の場合のΔ（デフォルト: +3） */
  deltaRule5: number
}

/** デフォルトの調整パラメータ */
export const DEFAULT_PARAMS: AdjustmentParams = {
  clickThreshold: 30,
  roasLower: 3,
  roasUpper: 6,
  deltaRule1: -1,
  deltaRule2: -7,
  deltaRule3: -5,
  deltaRule4: 0,
  deltaRule5: 3,
}

/** 必須列のヘッダー名定義 */
export const COLUMN_HEADERS = {
  /** フィルター列（エンティティ） */
  entity: 'エンティティ',
  /** ROAS */
  roas: 'ROAS',
  /** クリック数 */
  clicks: 'クリック数',
  /** 入札額 */
  bid: '入札額',
  /** 操作 */
  operation: '操作',
} as const

/** フィルター値（完全一致、いずれかに該当する行を残す） */
export const FILTER_VALUES = ['商品ターゲティング', 'キーワード'] as const

/** 対象シート名 */
export const SHEET_NAME = 'スポンサープロダクト広告キャンペーン' as const

/** 入札額の最小値 */
export const BID_MIN = 1

/** 入札額の最大値 */
export const BID_MAX = 200
