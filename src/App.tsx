import { useState, useCallback } from 'react'
import { Download, Loader2, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { type AdjustmentParams, DEFAULT_PARAMS } from '@/lib/types'
import { processExcel, type ProcessResult } from '@/lib/excel-processor'
import { FileUploader } from '@/components/FileUploader'
import { RuleEditor } from '@/components/RuleEditor'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** バリデーションエラーの型 */
type ValidationErrors = Record<string, string>

/** パラメータのバリデーション */
function validateParams(params: AdjustmentParams): ValidationErrors {
  const errors: ValidationErrors = {}

  // クリック閾値: 0以上の整数
  if (!Number.isFinite(params.clickThreshold) || params.clickThreshold < 0) {
    errors.clickThreshold = '0以上の数値を入力してください'
  } else if (!Number.isInteger(params.clickThreshold)) {
    errors.clickThreshold = '整数を入力してください'
  }

  // ROAS境界: 0以上
  if (!Number.isFinite(params.roasLower) || params.roasLower < 0) {
    errors.roasLower = '0以上の数値を入力してください'
  }
  if (!Number.isFinite(params.roasUpper) || params.roasUpper < 0) {
    errors.roasUpper = '0以上の数値を入力してください'
  }

  // lower < upper
  if (
    Number.isFinite(params.roasLower) &&
    Number.isFinite(params.roasUpper) &&
    params.roasLower >= params.roasUpper
  ) {
    errors.roasLower = errors.roasLower || 'ROAS下限は上限より小さくしてください'
    errors.roasUpper = errors.roasUpper || 'ROAS上限は下限より大きくしてください'
  }

  // Δ: 数値（小数可）
  const deltaKeys = ['deltaRule1', 'deltaRule2', 'deltaRule3', 'deltaRule4', 'deltaRule5'] as const
  for (const key of deltaKeys) {
    if (!Number.isFinite(params[key])) {
      errors[key] = '数値を入力してください'
    }
  }

  return errors
}

function App() {
  const [params, setParams] = useState<AdjustmentParams>(DEFAULT_PARAMS)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)

  /** パラメータ変更ハンドラ */
  const handleParamsChange = useCallback((newParams: AdjustmentParams) => {
    setParams(newParams)
    setErrors(validateParams(newParams))
  }, [])

  /** ファイルを読み込んで処理する */
  const processFile = useCallback(
    async (buffer: ArrayBuffer, name: string, currentParams: AdjustmentParams) => {
      const validationErrors = validateParams(currentParams)
      setErrors(validationErrors)

      if (Object.keys(validationErrors).length > 0) {
        setErrorMessage('ルール設定にエラーがあります。修正してから再度お試しください。')
        return
      }

      setProcessing(true)
      setErrorMessage(null)
      setResult(null)

      try {
        // ローディング表示を描画させてから処理を開始する
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

        const minDelay = new Promise((r) => setTimeout(r, 1000))

        const processResult = await new Promise<ProcessResult>((resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(processExcel(buffer, currentParams))
            } catch (e) {
              reject(e)
            }
          }, 0)
        })

        // 最低1秒はローディングを表示する
        await minDelay

        setResult(processResult)
        setFileName(name)
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : '不明なエラーが発生しました。')
      } finally {
        setProcessing(false)
      }
    },
    [],
  )

  /** ファイル選択ハンドラ */
  const handleFileSelect = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer()
      setFileBuffer(buffer)
      setFileName(file.name)
      await processFile(buffer, file.name, params)
    },
    [params, processFile],
  )

  /** ルール変更後に再処理する */
  const handleReprocess = useCallback(async () => {
    if (!fileBuffer) return
    await processFile(fileBuffer, fileName, params)
  }, [fileBuffer, fileName, params, processFile])

  /** 調整済みファイルのダウンロード */
  const handleDownload = useCallback(() => {
    if (!result) return

    const blob = new Blob([result.outputBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const baseName = fileName.replace(/\.xlsx$/i, '')
    a.download = `${baseName}_adjusted.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, fileName])

  const hasValidationErrors = Object.keys(errors).length > 0

  return (
    <div className="min-h-screen">
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-8 shadow-lg">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-white">Amazon オート、商品ターゲティング 入札調整ツール <span className="text-base font-normal text-white/80">vr.2</span></h1>
          <p className="text-sm text-white/70 mt-1">
            ※バルクファイル(7日間)をアップロードしてください。
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* ファイルアップロード */}
        <FileUploader onFileSelect={handleFileSelect} disabled={processing} processing={processing} />

        {/* ルール編集 */}
        <RuleEditor params={params} onChange={handleParamsChange} errors={errors} />

        {/* ルール変更後の再適用ボタン */}
        {fileBuffer && (
          <Button
            onClick={handleReprocess}
            disabled={processing || hasValidationErrors}
            className="w-full sm:w-auto bg-lime-500 text-white hover:bg-lime-600"
          >
            {processing ? (
              <>
                <Loader2 className="animate-spin" />
                処理中...
              </>
            ) : (
              '変更したルールで再処理'
            )}
          </Button>
        )}

        {/* エラー表示 */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 処理結果 */}
        {result && !processing && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                処理完了
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-emerald-600/70">元の行数（ヘッダー除く）</p>
                  <p className="font-medium text-lg text-emerald-900">{result.totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-emerald-600/70">処理対象行数（商品ターゲティング・キーワード）</p>
                  <p className="font-medium text-lg text-emerald-900">{result.processedRows.toLocaleString()}</p>
                </div>
              </div>

              {/* デルタ値ごとの内訳 */}
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-2">入札調整の内訳</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(result.deltaCounts)
                    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                    .map(([delta, count]) => {
                      const numDelta = parseFloat(delta)
                      const isPositive = numDelta > 0
                      const isZero = numDelta === 0
                      return (
                        <div
                          key={delta}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                            isPositive
                              ? 'bg-blue-50 border border-blue-200'
                              : isZero
                                ? 'bg-gray-50 border border-gray-200'
                                : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : isZero ? (
                            <Minus className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <span className={`font-mono font-medium ${
                            isPositive ? 'text-blue-700' : isZero ? 'text-gray-600' : 'text-red-700'
                          }`}>
                            {delta}
                          </span>
                          <span className="text-gray-500 ml-auto">{count.toLocaleString()}件</span>
                        </div>
                      )
                    })}
                </div>
              </div>

              <Button onClick={handleDownload} size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download />
                調整済みファイルをダウンロード
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
