import { type AdjustmentParams } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RuleEditorProps {
  params: AdjustmentParams
  onChange: (params: AdjustmentParams) => void
  errors: Record<string, string>
}

export function RuleEditor({ params, onChange, errors }: RuleEditorProps) {
  /** パラメータの個別更新 */
  const update = (key: keyof AdjustmentParams, value: string) => {
    onChange({ ...params, [key]: value === '' ? '' : Number(value) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">入札調整ルール設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 閾値・境界 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clickThreshold">クリック閾値</Label>
            <Input
              id="clickThreshold"
              type="number"
              min={0}
              step={1}
              value={params.clickThreshold}
              onChange={(e) => update('clickThreshold', e.target.value)}
            />
            {errors.clickThreshold && (
              <p className="text-sm text-destructive">{errors.clickThreshold}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="roasLower">ROAS 下限</Label>
            <Input
              id="roasLower"
              type="number"
              min={0}
              step="any"
              value={params.roasLower}
              onChange={(e) => update('roasLower', e.target.value)}
            />
            {errors.roasLower && (
              <p className="text-sm text-destructive">{errors.roasLower}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="roasUpper">ROAS 上限</Label>
            <Input
              id="roasUpper"
              type="number"
              min={0}
              step="any"
              value={params.roasUpper}
              onChange={(e) => update('roasUpper', e.target.value)}
            />
            {errors.roasUpper && (
              <p className="text-sm text-destructive">{errors.roasUpper}</p>
            )}
          </div>
        </div>

        {/* ルール別Δ */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">各ルールの調整値（Δ）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <RuleDeltaInput
              id="deltaRule1"
              label={`ROAS=0, クリック≤${params.clickThreshold}`}
              value={params.deltaRule1}
              onChange={(v) => update('deltaRule1', v)}
              error={errors.deltaRule1}
            />
            <RuleDeltaInput
              id="deltaRule2"
              label={`ROAS=0, クリック>${params.clickThreshold}`}
              value={params.deltaRule2}
              onChange={(v) => update('deltaRule2', v)}
              error={errors.deltaRule2}
            />
            <RuleDeltaInput
              id="deltaRule3"
              label={`0<ROAS<${params.roasLower}`}
              value={params.deltaRule3}
              onChange={(v) => update('deltaRule3', v)}
              error={errors.deltaRule3}
            />
            <RuleDeltaInput
              id="deltaRule4"
              label={`${params.roasLower}≤ROAS<${params.roasUpper}`}
              value={params.deltaRule4}
              onChange={(v) => update('deltaRule4', v)}
              error={errors.deltaRule4}
            />
            <RuleDeltaInput
              id="deltaRule5"
              label={`ROAS≥${params.roasUpper}`}
              value={params.deltaRule5}
              onChange={(v) => update('deltaRule5', v)}
              error={errors.deltaRule5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** ルール別Δ入力フィールド */
function RuleDeltaInput({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  value: number
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs leading-tight block min-h-[2rem]">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
