import { removeBackground } from '@imgly/background-removal'

export function useImageMask() {
  async function generateMask(imageFile) {
    const blob = await removeBackground(imageFile)
    const mask = await createMaskFromBlob(blob, imageFile)
    return mask
  }

  async function createMaskFromBlob(foregroundBlob, originalFile) {
    const originalImg = await loadImage(originalFile)
    const { width, height } = originalImg

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    const fgImg = await loadImage(foregroundBlob)
    ctx.drawImage(fgImg, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha > 10) {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = 255
      } else {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      let objectUrl = null

      img.onload = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
        resolve(img)
      }
      img.onerror = (err) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
        reject(err)
      }

      if (source instanceof Blob || source instanceof File) {
        objectUrl = URL.createObjectURL(source)
        img.src = objectUrl
      } else {
        img.src = source
      }
    })
  }

  return { generateMask }
}
