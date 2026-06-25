import { NativeModule, requireNativeModule } from 'expo';

declare class VisionocrModule extends NativeModule<{}> {
  /** Run on-device Apple Vision OCR on an image file URI; resolves to recognized text. */
  recognizeText(uri: string): Promise<string>;
}

export default requireNativeModule<VisionocrModule>('Visionocr');
