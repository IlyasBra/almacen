/** Longest side of stored photos: sharp on a phone, light on storage. */
export const PHOTO_MAX_SIZE = 1200

/**
 * Shrinks a camera photo to at most PHOTO_MAX_SIZE px and re-encodes it as
 * JPEG. Phone photos are 3–10 MB; this keeps each one around 150 KB.
 */
export async function resizeImage(file: Blob, maxSize = PHOTO_MAX_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not encode the photo'))
        },
        'image/jpeg',
        0.82,
      )
    })
  } finally {
    bitmap.close()
  }
}
