import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

function parseShadcnHslVar(varValue: string) {
  const v = varValue.trim()
  if (!v) return null
  // shadcn suele guardar: "222.2 47.4% 11.2%"
  const parts = v.split(/\s+/)
  if (parts.length !== 3) return null
  const h = Number.parseFloat(parts[0])
  const s = Number.parseFloat(parts[1].replace('%', ''))
  const l = Number.parseFloat(parts[2].replace('%', ''))
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number) {
  // h: 0..360, s/l: 0..100
  const _s = s / 100
  const _l = l / 100
  const c = (1 - Math.abs(2 * _l - 1)) * _s
  const hh = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r1 = 0, g1 = 0, b1 = 0
  if (hh >= 0 && hh < 1) [r1, g1, b1] = [c, x, 0]
  else if (hh >= 1 && hh < 2) [r1, g1, b1] = [x, c, 0]
  else if (hh >= 2 && hh < 3) [r1, g1, b1] = [0, c, x]
  else if (hh >= 3 && hh < 4) [r1, g1, b1] = [0, x, c]
  else if (hh >= 4 && hh < 5) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  const m = _l - c / 2
  const r = Math.round((r1 + m) * 255)
  const g = Math.round((g1 + m) * 255)
  const b = Math.round((b1 + m) * 255)
  return { r, g, b }
}

function rgbToCss({ r, g, b }: { r: number; g: number; b: number }) {
  return `rgb(${r}, ${g}, ${b})`
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const srgb = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const L1 = Math.max(la, lb)
  const L2 = Math.min(la, lb)
  return (L1 + 0.05) / (L2 + 0.05)
}

function getThemeColorsAsRgb() {
  const root = document.documentElement
  const styles = getComputedStyle(root)
  const primaryRaw = styles.getPropertyValue('--primary')
  const backgroundRaw = styles.getPropertyValue('--background')

  const primaryHsl = parseShadcnHslVar(primaryRaw)
  const backgroundHsl = parseShadcnHslVar(backgroundRaw)

  // Fallbacks si no podemos parsear
  const fallbackPrimary = { h: 0, s: 84, l: 60 } // rojo tipo "brillante"
  const fallbackBackground = { h: 0, s: 0, l: 0 }

  const bg = backgroundHsl ?? fallbackBackground
  const bgRgb = hslToRgb(bg.h, bg.s, bg.l)
  const bgLum = relativeLuminance(bgRgb)

  // Ajuste de contraste manteniendo el tono: si el primary es muy claro sobre fondo claro, oscurecerlo.
  // Si es muy oscuro sobre fondo oscuro, aclararlo para que quede "brillante".
  const p = primaryHsl ?? fallbackPrimary
  let adj = { ...p }
  if (bgLum > 0.65 && adj.l > 62) {
    adj.l = 42
    adj.s = Math.max(adj.s, 85)
  } else if (bgLum < 0.30 && adj.l < 45) {
    adj.l = 70
    adj.s = Math.max(adj.s, 80)
  }

  const primaryRgb = hslToRgb(adj.h, adj.s, adj.l)
  const background = rgbToCss(bgRgb)
  const primary = rgbToCss(primaryRgb)

  return { primary, background, backgroundIsLight: bgLum > 0.65, primaryRgb, backgroundRgb: bgRgb, primaryHsl: adj }
}

export interface StyledQRCodeProps {
  value: string
  size?: number
  logoSrc?: string
  className?: string
}

export function StyledQRCode({ value, size = 140, logoSrc, className }: StyledQRCodeProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.innerHTML = ''

    // Leer colores en el momento del render (cambios de tema)
    const { primary, background, backgroundIsLight, primaryRgb, backgroundRgb, primaryHsl } = getThemeColorsAsRgb()

    // Si el contraste es bajo (ej: pink neon), forzar modo escaneable.
    // Muchos lectores binarizan la imagen, por lo que gradientes/colores claros fallan.
    const ratio = contrastRatio(primaryRgb, backgroundRgb)
    const scanSafe = ratio < 4.5

    const qrBackground = scanSafe ? '#ffffff' : background
    const dotsColor = (() => {
      if (!scanSafe) return primary
      // Mantener el tono del tema pero oscurecer bastante para que contraste sobre blanco
      const safe = hslToRgb(primaryHsl.h, Math.max(primaryHsl.s, 85), 30)
      return rgbToCss(safe)
    })()

    const qr = new QRCodeStyling({
      width: size,
      height: size,
      type: 'canvas',
      data: value,
      image: logoSrc,
      margin: scanSafe ? 20 : 12, // quiet zone más grande para escaneo
      qrOptions: {
        errorCorrectionLevel: 'H',
      },
      backgroundOptions: {
        color: qrBackground,
      },
      dotsOptions: {
        type: 'rounded',
        // Gradiente bonito, pero en scan-safe lo desactivamos para garantizar lectura.
        ...(scanSafe
          ? { color: dotsColor }
          : {
              gradient: {
                type: 'linear',
                rotation: 0,
                colorStops: [
                  { offset: 0, color: primary },
                  { offset: 1, color: backgroundIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)' },
                ],
              },
            }),
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: dotsColor,
      },
      cornersDotOptions: {
        type: 'dot',
        color: dotsColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 4,
        imageSize: scanSafe ? 0.24 : 0.28, // un poco más chico para no tapar módulos
      },
    })

    qr.append(el)

    // Glow suave: da efecto “degradé blanco” sin afectar la lectura (solo sombra).
    const canvas = el.querySelector('canvas') as HTMLCanvasElement | null
    if (canvas && !scanSafe) {
      canvas.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.25))'
    }

    return () => {
      el.innerHTML = ''
    }
  }, [value, size, logoSrc])

  return <div ref={ref} className={className} />
}

