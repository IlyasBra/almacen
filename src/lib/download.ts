/** Saves text as a file through a temporary link (the standard way in browsers). */
export function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 10_000)
}
