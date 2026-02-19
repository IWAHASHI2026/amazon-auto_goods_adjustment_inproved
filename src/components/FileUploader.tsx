import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  processing?: boolean
}

export function FileUploader({ onFileSelect, disabled, processing }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDisabled = disabled || processing

  /** ファイルのバリデーション */
  const validateAndSelect = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.xlsx')) {
        alert('.xlsx ファイルのみアップロード可能です。')
        return
      }
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    [validateAndSelect],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndSelect(file)
      // 同一ファイルの再選択を可能にするためリセット
      e.target.value = ''
    },
    [validateAndSelect],
  )

  // 処理中はローディング表示に切り替え
  if (processing) {
    return (
      <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-indigo-700">ファイルを処理しています...</p>
            <p className="text-sm text-indigo-500/70">入札額の調整ルールを適用中です。しばらくお待ちください。</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-all duration-200 cursor-pointer hover:bg-indigo-50/40 hover:border-indigo-300',
        isDragging && 'border-indigo-500 bg-indigo-50/60 shadow-md',
        !isDragging && 'border-indigo-200',
        isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:border-indigo-200',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        if (!isDisabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={isDisabled ? undefined : handleDrop}
      onClick={() => !isDisabled && inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <Upload className="h-10 w-10 text-indigo-400" />
        <div className="text-center">
          <p className="text-sm font-medium">
            .xlsx ファイルをドロップ、またはクリックして選択
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Amazon Bulk ファイル（スポンサープロダクト広告）
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleChange}
          disabled={isDisabled}
        />
      </CardContent>
    </Card>
  )
}
