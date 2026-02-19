import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { processExcel } from './excel-processor'
import { DEFAULT_PARAMS, SHEET_NAME, COLUMN_HEADERS, FILTER_VALUE } from './types'

/** テスト用のExcelバッファを生成するヘルパー */
function createTestWorkbook(
  sheetName: string,
  data: unknown[][],
): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

/** 出力バッファからシートデータを読み取るヘルパー */
function readOutputSheet(buffer: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[SHEET_NAME]
  return XLSX.utils.sheet_to_json(ws!, { header: 1, defval: '' })
}

describe('processExcel', () => {
  // テスト用ヘッダー
  const headers = [
    'プロダクト',
    COLUMN_HEADERS.entity,    // エンティティ
    COLUMN_HEADERS.operation, // 操作
    'キャンペーン名',
    COLUMN_HEADERS.bid,       // 入札額
    COLUMN_HEADERS.clicks,    // クリック数
    COLUMN_HEADERS.roas,      // ROAS
  ]

  it('対象シートが存在しない場合、エラーを投げる', () => {
    const buf = createTestWorkbook('別のシート', [['A', 'B']])
    expect(() => processExcel(buf, DEFAULT_PARAMS)).toThrow('対象シートが見つかりません')
  })

  it('必須列が見つからない場合、エラーを投げる', () => {
    const buf = createTestWorkbook(SHEET_NAME, [['列A', '列B', '列C']])
    expect(() => processExcel(buf, DEFAULT_PARAMS)).toThrow('必須列が見つかりません')
  })

  it('データ行がない場合、エラーを投げる', () => {
    const buf = createTestWorkbook(SHEET_NAME, [headers])
    expect(() => processExcel(buf, DEFAULT_PARAMS)).toThrow('該当する行が見つかりません')
  })

  it('商品ターゲティング行のみフィルターされる', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 18, 10, 0],
      ['SP', 'キーワード', '', 'キャンペーン2', 20, 5, 3],
      ['SP', FILTER_VALUE, '', 'キャンペーン3', 48, 50, 0],
      ['SP', 'プロダクト広告', '', 'キャンペーン4', 30, 20, 5],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)

    expect(result.processedRows).toBe(2)
    expect(result.totalRows).toBe(4)

    const output = readOutputSheet(result.outputBuffer)
    // ヘッダー + 2行 = 3行
    expect(output.length).toBe(3)
  })

  it('入札額がルールに従って調整される（ルール1: ROAS=0, clicks=10）', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 18, 10, 0],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // bid=18 + delta(-1) = 17
    expect(output[1]![4]).toBe(17)
  })

  it('入札額がルールに従って調整される（ルール2: ROAS=0, clicks=50）', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 48, 50, 0],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // bid=48 + delta(-7) = 41
    expect(output[1]![4]).toBe(41)
  })

  it('入札額がルールに従って調整される（ルール5: ROAS=10）', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 50, 30, 10],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // bid=50 + delta(+3) = 53
    expect(output[1]![4]).toBe(53)
  })

  it('操作列にupdateが入る', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 18, 10, 0],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // 操作列（index 2）に "update"
    expect(output[1]![2]).toBe('update')
  })

  it('入札額が下限（1）でクランプされる', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 2, 50, 0],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // bid=2 + delta(-7) = -5 → clamp → 1
    expect(output[1]![4]).toBe(1)
  })

  it('入札額が上限（200）でクランプされる', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 199, 0, 10],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // bid=199 + delta(+3) = 202 → clamp → 200
    expect(output[1]![4]).toBe(200)
  })

  it('空欄・"--" は0扱いされる', () => {
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 18, '--', ''],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, DEFAULT_PARAMS)
    const output = readOutputSheet(result.outputBuffer)

    // ROAS=0(空欄→0), clicks=0("--"→0) → ルール1: delta=-1
    // bid=18+(-1)=17
    expect(output[1]![4]).toBe(17)
  })

  it('カスタムパラメータで処理される', () => {
    const customParams = {
      ...DEFAULT_PARAMS,
      deltaRule1: -2,
    }
    const data = [
      headers,
      ['SP', FILTER_VALUE, '', 'キャンペーン1', 20, 10, 0],
    ]
    const buf = createTestWorkbook(SHEET_NAME, data)
    const result = processExcel(buf, customParams)
    const output = readOutputSheet(result.outputBuffer)

    // bid=20 + delta(-2) = 18
    expect(output[1]![4]).toBe(18)
  })
})
