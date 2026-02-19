import * as XLSX from 'xlsx'
import {
  type AdjustmentParams,
  COLUMN_HEADERS,
  FILTER_VALUE,
  SHEET_NAME,
} from './types'
import { toSafeNumber, adjustBid, getDelta } from './bid-adjuster'

/** 処理結果 */
export interface ProcessResult {
  /** 処理後のワークブック（xlsxバイナリ） */
  outputBuffer: ArrayBuffer
  /** 処理対象行数（フィルター後） */
  processedRows: number
  /** 元の行数（ヘッダー除く） */
  totalRows: number
  /** デルタ値ごとの件数 (例: { "3": 10, "0": 5, "-5": 8 }) */
  deltaCounts: Record<string, number>
}

/** 列インデックスのマッピング */
interface ColumnIndices {
  entity: number
  roas: number
  clicks: number
  bid: number
  operation: number
}

/**
 * ヘッダー行から必須列のインデックスを特定する。
 * 見つからない列がある場合はエラーを投げる。
 */
function findColumnIndices(headerRow: unknown[]): ColumnIndices {
  const indices: Partial<ColumnIndices> = {}

  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] ?? '').trim()
    if (header === COLUMN_HEADERS.entity) indices.entity = i
    if (header === COLUMN_HEADERS.roas) indices.roas = i
    if (header === COLUMN_HEADERS.clicks) indices.clicks = i
    if (header === COLUMN_HEADERS.bid) indices.bid = i
    if (header === COLUMN_HEADERS.operation) indices.operation = i
  }

  // 見つからない列をチェック
  const missing: string[] = []
  if (indices.entity === undefined) missing.push(COLUMN_HEADERS.entity)
  if (indices.roas === undefined) missing.push(COLUMN_HEADERS.roas)
  if (indices.clicks === undefined) missing.push(COLUMN_HEADERS.clicks)
  if (indices.bid === undefined) missing.push(COLUMN_HEADERS.bid)
  if (indices.operation === undefined) missing.push(COLUMN_HEADERS.operation)

  if (missing.length > 0) {
    throw new Error(`必須列が見つかりません: ${missing.join(', ')}`)
  }

  return indices as ColumnIndices
}

/**
 * アップロードされたExcelファイルを処理する。
 * 1. シート「スポンサープロダクト広告キャンペーン」を取得
 * 2. ヘッダー名で列を特定
 * 3. 「商品ターゲティング」行のみフィルター
 * 4. 入札額を調整
 * 5. 「操作」列に "update" を代入
 * 6. 調整済みxlsxを返す
 */
export function processExcel(
  fileBuffer: ArrayBuffer,
  params: AdjustmentParams,
): ProcessResult {
  // ワークブックを読み込む
  const workbook = XLSX.read(fileBuffer, { type: 'array' })

  // 対象シートの存在確認
  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    throw new Error(
      `対象シートが見つかりません: 「${SHEET_NAME}」シートがファイルに含まれていません。`,
    )
  }

  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) {
    throw new Error(`対象シートが見つかりません: 「${SHEET_NAME}」`)
  }

  // シートを2次元配列に変換（ヘッダー含む）
  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  })

  if (data.length < 1) {
    throw new Error('シートが空です。')
  }

  // ヘッダー行（1行目）
  const headerRow = data[0]
  if (!headerRow) {
    throw new Error('ヘッダー行が取得できません。')
  }

  // 列インデックスを特定（ヘッダーチェックを先に行う）
  const cols = findColumnIndices(headerRow)

  // ヘッダー行を残し、データ行をフィルター
  const totalRows = data.length - 1
  const filteredData: unknown[][] = [headerRow]
  const deltaCounts: Record<string, number> = {}

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const entityValue = String(row[cols.entity] ?? '').trim()
    if (entityValue !== FILTER_VALUE) continue

    // 入札額を調整
    const roas = toSafeNumber(row[cols.roas])
    const clicks = toSafeNumber(row[cols.clicks])
    const currentBid = toSafeNumber(row[cols.bid])

    // デルタ値をカウント
    const delta = getDelta(roas, clicks, params)
    const deltaKey = delta >= 0 ? `+${delta}` : `${delta}`
    deltaCounts[deltaKey] = (deltaCounts[deltaKey] || 0) + 1

    const newBid = adjustBid(currentBid, roas, clicks, params)
    row[cols.bid] = newBid

    // 「操作」列に "update" を代入
    row[cols.operation] = 'update'

    filteredData.push(row)
  }

  const processedRows = filteredData.length - 1 // ヘッダー除く

  if (processedRows === 0) {
    throw new Error(
      `「${FILTER_VALUE}」に該当する行が見つかりませんでした。ファイルの内容を確認してください。`,
    )
  }

  // 新しいワークブックを作成
  const newWorkbook = XLSX.utils.book_new()
  const newSheet = XLSX.utils.aoa_to_sheet(filteredData)
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, SHEET_NAME)

  // xlsxバイナリを生成
  const outputBuffer = XLSX.write(newWorkbook, {
    type: 'array',
    bookType: 'xlsx',
  }) as ArrayBuffer

  return {
    outputBuffer,
    processedRows,
    totalRows,
    deltaCounts,
  }
}
