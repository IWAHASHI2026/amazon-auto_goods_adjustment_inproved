import { describe, it, expect } from 'vitest'
import { toSafeNumber, clampBid, roundBid, getDelta, adjustBid } from './bid-adjuster'
import { DEFAULT_PARAMS } from './types'

// --- toSafeNumber ---
describe('toSafeNumber', () => {
  it('数値はそのまま返す', () => {
    expect(toSafeNumber(42)).toBe(42)
    expect(toSafeNumber(3.14)).toBe(3.14)
    expect(toSafeNumber(0)).toBe(0)
  })

  it('数値文字列を数値に変換する', () => {
    expect(toSafeNumber('100')).toBe(100)
    expect(toSafeNumber('3.5')).toBe(3.5)
  })

  it('空欄は0を返す', () => {
    expect(toSafeNumber('')).toBe(0)
  })

  it('nullは0を返す', () => {
    expect(toSafeNumber(null)).toBe(0)
  })

  it('undefinedは0を返す', () => {
    expect(toSafeNumber(undefined)).toBe(0)
  })

  it('"--"など変換不能な文字列は0を返す', () => {
    expect(toSafeNumber('--')).toBe(0)
    expect(toSafeNumber('abc')).toBe(0)
    expect(toSafeNumber('N/A')).toBe(0)
  })

  it('NaNは0を返す', () => {
    expect(toSafeNumber(NaN)).toBe(0)
  })

  it('Infinityは0を返す', () => {
    expect(toSafeNumber(Infinity)).toBe(0)
    expect(toSafeNumber(-Infinity)).toBe(0)
  })
})

// --- clampBid ---
describe('clampBid', () => {
  it('範囲内の値はそのまま返す', () => {
    expect(clampBid(50)).toBe(50)
    expect(clampBid(1)).toBe(1)
    expect(clampBid(200)).toBe(200)
  })

  it('最小値未満は1にクランプする', () => {
    expect(clampBid(0)).toBe(1)
    expect(clampBid(-10)).toBe(1)
    expect(clampBid(0.5)).toBe(1)
  })

  it('最大値超過は200にクランプする', () => {
    expect(clampBid(201)).toBe(200)
    expect(clampBid(999)).toBe(200)
  })
})

// --- roundBid ---
describe('roundBid', () => {
  it('小数第2位で四捨五入する', () => {
    expect(roundBid(10.456)).toBe(10.46)
    expect(roundBid(10.454)).toBe(10.45)
    expect(roundBid(10.455)).toBe(10.46)
  })

  it('整数はそのまま返す', () => {
    expect(roundBid(10)).toBe(10)
  })

  it('小数第1位まではそのまま返す', () => {
    expect(roundBid(10.5)).toBe(10.5)
  })
})

// --- getDelta ---
describe('getDelta（デフォルトパラメータ）', () => {
  const p = DEFAULT_PARAMS

  it('ルール1: ROAS==0 かつ Clicks<=30 → Δ=-1', () => {
    expect(getDelta(0, 0, p)).toBe(-1)
    expect(getDelta(0, 15, p)).toBe(-1)
    expect(getDelta(0, 30, p)).toBe(-1)
  })

  it('ルール2: ROAS==0 かつ Clicks>30 → Δ=-7', () => {
    expect(getDelta(0, 31, p)).toBe(-7)
    expect(getDelta(0, 100, p)).toBe(-7)
  })

  it('ルール3: 0<ROAS<3 → Δ=-5', () => {
    expect(getDelta(0.1, 0, p)).toBe(-5)
    expect(getDelta(1, 50, p)).toBe(-5)
    expect(getDelta(2.99, 10, p)).toBe(-5)
  })

  it('ルール4: 3<=ROAS<6 → Δ=0', () => {
    expect(getDelta(3, 0, p)).toBe(0)
    expect(getDelta(4.5, 20, p)).toBe(0)
    expect(getDelta(5.99, 100, p)).toBe(0)
  })

  it('ルール5: ROAS>=6 → Δ=+3', () => {
    expect(getDelta(6, 0, p)).toBe(3)
    expect(getDelta(10, 50, p)).toBe(3)
    expect(getDelta(100, 0, p)).toBe(3)
  })
})

describe('getDelta（カスタムパラメータ）', () => {
  const custom = {
    ...DEFAULT_PARAMS,
    clickThreshold: 50,
    roasLower: 2,
    roasUpper: 8,
    deltaRule1: -2,
    deltaRule2: -10,
    deltaRule3: -3,
    deltaRule4: 1,
    deltaRule5: 5,
  }

  it('カスタム閾値でルール1/2の境界が変わる', () => {
    expect(getDelta(0, 50, custom)).toBe(-2) // <=50
    expect(getDelta(0, 51, custom)).toBe(-10) // >50
  })

  it('カスタムROAS境界でルール3/4/5の境界が変わる', () => {
    expect(getDelta(1.99, 0, custom)).toBe(-3) // <2
    expect(getDelta(2, 0, custom)).toBe(1) // >=2 && <8
    expect(getDelta(7.99, 0, custom)).toBe(1)
    expect(getDelta(8, 0, custom)).toBe(5) // >=8
  })
})

// --- adjustBid ---
describe('adjustBid', () => {
  const p = DEFAULT_PARAMS

  it('通常の調整（ルール1: bid=18, ROAS=0, clicks=10 → 18+(-1)=17）', () => {
    expect(adjustBid(18, 0, 10, p)).toBe(17)
  })

  it('通常の調整（ルール2: bid=48, ROAS=0, clicks=50 → 48+(-7)=41）', () => {
    expect(adjustBid(48, 0, 50, p)).toBe(41)
  })

  it('通常の調整（ルール3: bid=30, ROAS=2, clicks=20 → 30+(-5)=25）', () => {
    expect(adjustBid(30, 2, 20, p)).toBe(25)
  })

  it('通常の調整（ルール4: bid=20, ROAS=4, clicks=10 → 20+0=20）', () => {
    expect(adjustBid(20, 4, 10, p)).toBe(20)
  })

  it('通常の調整（ルール5: bid=50, ROAS=10, clicks=30 → 50+3=53）', () => {
    expect(adjustBid(50, 10, 30, p)).toBe(53)
  })

  it('下限クランプ: bid=2, ROAS=0, clicks=50 → 2+(-7)=-5 → 1', () => {
    expect(adjustBid(2, 0, 50, p)).toBe(1)
  })

  it('上限クランプ: bid=199, ROAS=10, clicks=0 → 199+3=202 → 200', () => {
    expect(adjustBid(199, 10, 0, p)).toBe(200)
  })

  it('小数の四捨五入: bid=10.555, ROAS=0, clicks=0 → 10.555+(-1)=9.555 → 9.56', () => {
    expect(adjustBid(10.555, 0, 0, p)).toBe(9.56)
  })

  it('入札額が0の場合でも最小1にクランプ', () => {
    expect(adjustBid(0, 0, 0, p)).toBe(1)
  })
})
