import html2canvas from 'html2canvas'

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

function isTransparent(bg: string) {
  if (!bg) return true
  if (bg === 'transparent') return true
  return bg.startsWith('rgba') && bg.endsWith(', 0)') // rgba(r,g,b,0)
}

function getEffectiveBackgroundColor(element: HTMLElement) {
  let el: HTMLElement | null = element
  while (el) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && !isTransparent(bg)) return bg
    el = el.parentElement
  }
  // Fallback al body/document (por si todo es transparente)
  const bodyBg = getComputedStyle(document.body).backgroundColor
  if (bodyBg && !isTransparent(bodyBg)) return bodyBg
  return null
}

export async function captureElementToPngBlob(
  element: HTMLElement,
  options?: { extraPaddingBottomPx?: number; scale?: number }
): Promise<Blob> {
  const backgroundColor = getEffectiveBackgroundColor(element)
  const extraPaddingBottomPx = options?.extraPaddingBottomPx ?? 0
  const scale = options?.scale ?? Math.min(3, window.devicePixelRatio || 2)

  const prevPaddingBottom = element.style.paddingBottom
  const prevBoxSizing = element.style.boxSizing
  try {
    if (extraPaddingBottomPx > 0) {
      const computed = getComputedStyle(element)
      const current = Number.parseFloat(computed.paddingBottom || '0') || 0
      element.style.boxSizing = 'border-box'
      element.style.paddingBottom = `${current + extraPaddingBottomPx}px`
    }

    const rect = element.getBoundingClientRect()
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale,
      useCORS: true,
      logging: false,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) reject(new Error('No se pudo generar la imagen'))
        else resolve(b)
      }, 'image/png')
    })

    return blob
  } finally {
    element.style.paddingBottom = prevPaddingBottom
    element.style.boxSizing = prevBoxSizing
  }

  // unreachable
}

export async function captureElementToViewportPngBlob(
  element: HTMLElement,
  options?: {
    paddingPx?: number
    paddingTopPx?: number
    paddingBottomPx?: number
    widthMultiplier?: number
    canvasScale?: number
    textClassBump?: boolean
  }
): Promise<Blob> {
  const vv = window.visualViewport
  const baseViewportWidth = Math.ceil(vv?.width ?? window.innerWidth)
  const viewportHeight = Math.ceil(vv?.height ?? window.innerHeight)
  const widthMultiplier = options?.widthMultiplier ?? 1
  const viewportWidth = Math.ceil(baseViewportWidth * widthMultiplier)

  const paddingPx = options?.paddingPx ?? 16
  const paddingTopPx = options?.paddingTopPx ?? paddingPx
  const paddingBottomPx = options?.paddingBottomPx ?? paddingPx
  const canvasScale = options?.canvasScale ?? 1
  const textClassBump = options?.textClassBump ?? false

  const backgroundColor = getEffectiveBackgroundColor(element) ?? '#000000'

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = `${viewportWidth}px`
  wrapper.style.height = `${viewportHeight}px`
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.padding = `${paddingTopPx}px ${paddingPx}px ${paddingBottomPx}px`
  wrapper.style.background = backgroundColor
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'center'

  const clone = element.cloneNode(true) as HTMLElement
  clone.style.width = '100%'
  clone.style.maxWidth = '520px'
  clone.style.boxSizing = 'border-box'

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    if (textClassBump) {
      const bumpToken = (cls: string) => {
        // sube 1 escalón para mejorar legibilidad en captura
        return cls
          .replace(/\btext-xs\b/g, 'text-sm')
          .replace(/\btext-sm\b/g, 'text-base')
          .replace(/\btext-base\b/g, 'text-lg')
          .replace(/\btext-lg\b/g, 'text-xl')
          .replace(/\btext-xl\b/g, 'text-2xl')
          .replace(/\btext-2xl\b/g, 'text-3xl')
          .replace(/\btext-3xl\b/g, 'text-4xl')
      }

      const all = clone.querySelectorAll<HTMLElement>('*')
      all.forEach((node) => {
        const cn = node.className
        if (typeof cn === 'string' && cn.includes('text-')) {
          node.className = bumpToken(cn)
        }
      })
      // también el root clonado por si tiene text-*
      if (typeof clone.className === 'string' && clone.className.includes('text-')) {
        clone.className = bumpToken(clone.className)
      }
    }

    // Importante: los <canvas> se clonan sin su bitmap.
    // Copiamos el contenido del canvas original al clonado (ej: QR).
    const srcCanvases = element.querySelectorAll('canvas')
    const dstCanvases = clone.querySelectorAll('canvas')
    const count = Math.min(srcCanvases.length, dstCanvases.length)
    for (let i = 0; i < count; i++) {
      const src = srcCanvases[i] as HTMLCanvasElement
      const dst = dstCanvases[i] as HTMLCanvasElement
      try {
        const nextWidth = Math.max(1, Math.round(src.width * canvasScale))
        const nextHeight = Math.max(1, Math.round(src.height * canvasScale))
        dst.width = nextWidth
        dst.height = nextHeight
        const ctx = dst.getContext('2d')
        if (ctx) ctx.drawImage(src, 0, 0, nextWidth, nextHeight)
      } catch {
        // Si hay canvas tainted/cors, dejamos que html2canvas haga lo mejor posible
      }
    }

    const canvas = await html2canvas(wrapper, {
      backgroundColor,
      scale: 2,
      useCORS: true,
      logging: false,
      width: viewportWidth,
      height: viewportHeight,
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) reject(new Error('No se pudo generar la imagen'))
        else resolve(b)
      }, 'image/png')
    })

    return blob
  } finally {
    wrapper.remove()
  }
}

export async function captureElementToPhonePngBlob(
  element: HTMLElement,
  options?: {
    /** por defecto 1080 */
    width?: number
    /** por defecto 1920 */
    height?: number
    /** tamaño "CSS" del frame (simula un teléfono real) */
    frameCssWidth?: number
    frameCssHeight?: number
    paddingPx?: number
    backgroundColor?: string
    /** max-width del contenido dentro del frame */
    contentMaxWidthPx?: number
    canvasScale?: number
  }
): Promise<Blob> {
  const width = options?.width ?? 1080
  const height = options?.height ?? 1920
  // Simular viewport móvil típico en CSS px (aprox 9:16).
  const frameCssWidth = options?.frameCssWidth ?? 390
  const frameCssHeight = options?.frameCssHeight ?? 693

  const scaleFactor = Math.min(width / frameCssWidth, height / frameCssHeight)

  const paddingPx = options?.paddingPx ?? 16
  const contentMaxWidthPx = options?.contentMaxWidthPx ?? (frameCssWidth - paddingPx * 2)
  const canvasScale = options?.canvasScale ?? scaleFactor

  const backgroundColor =
    options?.backgroundColor ?? getEffectiveBackgroundColor(element) ?? '#000000'

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = `${frameCssWidth}px`
  wrapper.style.height = `${frameCssHeight}px`
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.padding = `${paddingPx}px`
  wrapper.style.background = backgroundColor
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'center'
  wrapper.style.overflow = 'hidden'

  const clone = element.cloneNode(true) as HTMLElement
  clone.style.width = '100%'
  clone.style.maxWidth = `${contentMaxWidthPx}px`
  clone.style.boxSizing = 'border-box'

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    // Copiar bitmap de canvas (QR en canvas)
    const srcCanvases = element.querySelectorAll('canvas')
    const dstCanvases = clone.querySelectorAll('canvas')
    const count = Math.min(srcCanvases.length, dstCanvases.length)
    for (let i = 0; i < count; i++) {
      const src = srcCanvases[i] as HTMLCanvasElement
      const dst = dstCanvases[i] as HTMLCanvasElement
      try {
        const nextWidth = Math.max(1, Math.round(src.width * canvasScale))
        const nextHeight = Math.max(1, Math.round(src.height * canvasScale))
        dst.width = nextWidth
        dst.height = nextHeight
        const ctx = dst.getContext('2d')
        if (ctx) ctx.drawImage(src, 0, 0, nextWidth, nextHeight)
      } catch {
        // noop
      }
    }

    const canvas = await html2canvas(wrapper, {
      backgroundColor,
      scale: scaleFactor,
      useCORS: true,
      logging: false,
      width: frameCssWidth,
      height: frameCssHeight,
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) reject(new Error('No se pudo generar la imagen'))
        else resolve(b)
      }, 'image/png')
    })

    return blob
  } finally {
    wrapper.remove()
  }
}

export async function shareOrDownloadPng(params: {
  blob: Blob
  fileName: string
  title?: string
  text?: string
}) {
  const fileName = sanitizeFileName(params.fileName || 'qr') + '.png'
  const file = new File([params.blob], fileName, { type: 'image/png' })

  const nav: any = navigator
  const canShareFiles = typeof nav?.canShare === 'function' && nav.canShare({ files: [file] })

  if (typeof nav?.share === 'function' && canShareFiles) {
    await nav.share({
      files: [file],
      title: params.title,
      text: params.text,
    })
    return { method: 'share' as const }
  }

  // Fallback: descargar el archivo
  const url = URL.createObjectURL(params.blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }

  return { method: 'download' as const }
}

