export type WebcamAspectRatio = '4/3' | '16/9' | 'square';

interface ContainedMediaRectInput {
  containerWidth: number;
  containerHeight: number;
  sourceWidth: number;
  sourceHeight: number;
}

interface MediaSize {
  width: number;
  height: number;
}

const FALLBACK_SOURCE_SIZES: Record<WebcamAspectRatio, MediaSize> = {
  '4/3': { width: 4, height: 3 },
  '16/9': { width: 16, height: 9 },
  square: { width: 1, height: 1 }
};

export function getSourceSizeForAspectRatio(aspectRatio: WebcamAspectRatio): MediaSize {
  return FALLBACK_SOURCE_SIZES[aspectRatio];
}

export function getContainedMediaRect({
  containerWidth,
  containerHeight,
  sourceWidth,
  sourceHeight
}: ContainedMediaRectInput): MediaSize {
  if (containerWidth <= 0 || containerHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight);

  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale
  };
}
