// src/types/index.ts

export interface SrcsetEntry {
  url: string;
  width: number;
}

export interface GalleryImage {
  id: string;
  title: string;
  photographer: string;
  location: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurDataUrl: string;
  srcset: {
    webp: SrcsetEntry[];
    jpeg: SrcsetEntry[];
  };
  src: string;
}
