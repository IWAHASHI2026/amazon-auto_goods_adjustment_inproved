import { Settings2, SlidersHorizontal, TrendingUp } from 'lucide-react'
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
        <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
          <Settings2 className="h-5 w-5 text-violet-500" />
          入札調整ルール設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* クリック閾値 */}
        <div>
          <h3 className="text-sm font-medium text-indigo-600 flex items-center gap-1.5 mb-3">
            <SlidersHorizontal className="h-4 w-4" />
            閾値設定
          </h3>
          <div className="max-w-xs space-y-2">
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
        </div>

        {/* ルール別Δ（ROAS値をインライン編集可能） */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-violet-600 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            各ルールの調整値（Δ）
          </h3>
          <div className="space-y-3">
            {/* Rule 1: ROAS=0, clicks<=threshold */}
            <RuleRow
              ruleNum={1}
              badgeColor="bg-red-100 text-red-700"
              condition={
                <span className="text-xs">ROAS = 0, クリック ≤ {params.clickThreshold}</span>
              }
              deltaId="deltaRule1"
              deltaValue={params.deltaRule1}
              onDeltaChange={(v) => update('deltaRule1', v)}
              deltaError={errors.deltaRule1}
            />

            {/* Rule 2: ROAS=0, clicks>threshold */}
            <RuleRow
              ruleNum={2}
              badgeColor="bg-orange-100 text-orange-700"
              condition={
                <span className="text-xs">ROAS = 0, クリック &gt; {params.clickThreshold}</span>
              }
              deltaId="deltaRule2"
              deltaValue={params.deltaRule2}
              onDeltaChange={(v) => update('deltaRule2', v)}
              deltaError={errors.deltaRule2}
            />

            {/* Rule 3: 0<ROAS<roasLower */}
            <RuleRow
              ruleNum={3}
              badgeColor="bg-amber-100 text-amber-700"
              condition={
                <div className="flex items-center gap-1 text-xs">
                  <span>0 &lt; ROAS &lt;</span>
                  <Input
                    className="w-20 h-7 text-xs"
                    type="number"
                    min={0}
                    step="any"
                    value={params.roasLower}
                    onChange={(e) => update('roasLower', e.target.value)}
                  />
                </div>
              }
              deltaId="deltaRule3"
              deltaValue={params.deltaRule3}
              onDeltaChange={(v) => update('deltaRule3', v)}
              deltaError={errors.deltaRule3}
              extraError={errors.roasLower}
            />

            {/* Rule 4: roasLower<=ROAS<roasUpper */}
            <RuleRow
              ruleNum={4}
              badgeColor="bg-emerald-100 text-emerald-700"
              condition={
                <div className="flex items-center gap-1 text-xs">
                  <span>{params.roasLower} ≤ ROAS &lt;</span>
                  <Input
                    className="w-20 h-7 text-xs"
                    type="number"
                    min={0}
                    step="any"
                    value={params.roasUpper}
                    onChange={(e) => update('roasUpper', e.target.value)}
                  />
                </div>
              }
              deltaId="deltaRule4"
              deltaValue={params.deltaRule4}
              onDeltaChange={(v) => update('deltaRule4', v)}
              deltaError={errors.deltaRule4}
              extraError={errors.roasUpper}
            />

            {/* Rule 5: ROAS>=roasUpper */}
            <RuleRow
              ruleNum={5}
              badgeColor="bg-blue-100 text-blue-700"
              condition={
                <span className="text-xs">ROAS ≥ {params.roasUpper}</span>
              }
              deltaId="deltaRule5"
              deltaValue={params.deltaRule5}
              onDeltaChange={(v) => update('deltaRule5', v)}
              deltaError={errors.deltaRule5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** 各ルールの行コンポーネント */
function RuleRow({
  ruleNum,
  badgeColor,
  condition,
  deltaId,
  deltaValue,
  onDeltaChange,
  deltaError,
  extraError,
}: {
  ruleNum: number
  badgeColor: string
  condition: React.ReactNode
  deltaId: string
  deltaValue: number
  onDeltaChange: (value: string) => void
  deltaError?: string
  extraError?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${badgeColor} shrink-0 mt-1`}>
        R{ruleNum}
      </span>
      <div className="flex-1 min-w-0">
        <div className="mb-1.5">{condition}</div>
        {extraError && <p className="text-xs text-destructive mb-1">{extraError}</p>}
      </div>
      <div className="shrink-0 space-y-1">
        <Label htmlFor={deltaId} className="text-xs text-muted-foreground">Δ</Label>
        <Input
          id={deltaId}
          className="w-24 h-8"
          type="number"
          step="any"
          value={deltaValue}
          onChange={(e) => onDeltaChange(e.target.value)}
        />
        {deltaError && <p className="text-xs text-destructive">{deltaError}</p>}
      </div>
    </div>
  )
}
