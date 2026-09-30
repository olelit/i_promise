export type PixelMap = { width: number; height: number; rows: string[] }

export function createCanvas(width: number, height: number, fill = '.'): string[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => fill),
  )
}

export function setPixel(canvas: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[0].length) {
    return
  }
  canvas[y][x] = ch
}

export function fillRect(
  canvas: string[][],
  x: number,
  y: number,
  w: number,
  h: number,
  ch: string,
): void {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPixel(canvas, xx, yy, ch)
    }
  }
}

export function fillEllipse(
  canvas: string[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ch: string,
): void {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    const dy = (y - cy) / (ry + 0.5)
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy)))
    for (let x = cx - half; x <= cx + half; x += 1) {
      setPixel(canvas, x, y, ch)
    }
  }
}

export function stamp(canvas: string[][], patch: string[], x: number, y: number): void {
  patch.forEach((row, yy) => {
    for (let xx = 0; xx < row.length; xx += 1) {
      const ch = row[xx]
      if (ch !== '.') {
        setPixel(canvas, x + xx, y + yy, ch)
      }
    }
  })
}

export function shiftDown(canvas: string[][]): string[][] {
  const next = createCanvas(canvas[0].length, canvas.length)
  for (let y = 0; y < canvas.length - 1; y += 1) {
    next[y + 1] = [...canvas[y]]
  }
  return next
}

export function toPixelMap(canvas: string[][]): PixelMap {
  const width = canvas[0]?.length ?? 0
  const rows = canvas.map((row) => {
    if (row.length !== width) {
      throw new Error('Pixel map has ragged rows')
    }
    return row.join('')
  })
  return { width, height: canvas.length, rows }
}
