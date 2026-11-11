/**
 * Shape Detection API (Chrome on Android, some desktop browsers). Not in the
 * TypeScript DOM library yet, so only what the app uses is declared here.
 */
interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDetectorOptions {
  formats?: string[]
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  static getSupportedFormats(): Promise<string[]>
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}
