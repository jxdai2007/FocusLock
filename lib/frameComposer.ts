export async function composeFrames(
  webcamB64: string,
  screenB64: string | null,
): Promise<string> {
  if (!screenB64) return webcamB64

  const [webcamImg, screenImg] = await Promise.all([
    loadBase64Jpeg(webcamB64),
    loadBase64Jpeg(screenB64),
  ])

  const canvas = document.createElement('canvas')
  const panelW = 480
  const panelH = 360
  canvas.width = panelW * 2
  canvas.height = panelH
  const ctx = canvas.getContext('2d')
  if (!ctx) return webcamB64

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawContain(ctx, webcamImg, 0, 0, panelW, panelH)
  drawContain(ctx, screenImg, panelW, 0, panelW, panelH)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText('WEBCAM', 12, 26)
  ctx.fillText('SCREEN', panelW + 12, 26)

  return canvas.toDataURL('image/jpeg', 0.65).split(',')[1]
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height
  const pr = w / h
  let dw = w
  let dh = h
  if (ir > pr) {
    dh = w / ir
  } else {
    dw = h * ir
  }
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function loadBase64Jpeg(b64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${b64}`
  })
}

