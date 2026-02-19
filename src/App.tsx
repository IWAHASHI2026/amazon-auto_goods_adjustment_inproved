import { useState, useCallback } from 'react'
import { Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
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
        // 大きなファイルでもUIをブロックしないよう、非同期化
        const processResult = await new Promise<ProcessResult>((resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(processExcel(buffer, currentParams))
            } catch (e) {
              reject(e)
            }
          }, 0)
        })

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold">Amazon 広告 入札調整ツール</h1>
          <p className="text-sm text-muted-foreground mt-1">
            スポンサープロダクト広告のBulkファイル（.xlsx）をアップロードし、ルールに基づいて入札額を自動調整します。
          </p>
        </div>

        {/* ファイルアップロード */}
        <FileUploader onFileSelect={handleFileSelect} disabled={processing} />

        {/* ルール編集 */}
        <RuleEditor params={params} onChange={handleParamsChange} errors={errors} />

        {/* ルール変更後の再適用ボタン */}
        {fileBuffer && (
          <Button
            onClick={handleReprocess}
            disabled={processing || hasValidationErrors}
            className="w-full sm:w-auto"
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

        {/* 処理中スピナー */}
        {processing && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">ファイルを処理しています...</p>
            </CardContent>
          </Card>
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
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                処理完了
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">元の行数（ヘッダー除く）</p>
                  <p className="font-medium text-lg">{result.totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">処理対象行数（商品ターゲティング）</p>
                  <p className="font-medium text-lg">{result.processedRows.toLocaleString()}</p>
                </div>
              </div>
              <Button onClick={handleDownload} size="lg" className="w-full sm:w-auto">
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
