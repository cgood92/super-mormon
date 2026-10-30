/** Optimized gallery art. painting() requests these only when first rendered. */
export const GALLERY_PAINTINGS = {
  "peace-city": "peace-city.jpg",
  "mormon-records": "mormon-records.jpg",
  lehonti: "lehonti.jpg",
  morianton: "morianton.jpg",
  teancum: "teancum.jpg",
  gid: "gid.jpg",
  nephihah: "nephihah.jpg",
  samuel: "samuel.jpg",
  signs: "signs.jpg",
  gathering: "gathering.jpg",
  "christ-bountiful": "christ-bountiful.jpg",
} as const;

export function galleryPaintingFile(id: string): string | undefined {
  const file = GALLERY_PAINTINGS[id as keyof typeof GALLERY_PAINTINGS];
  return file
    ? `${import.meta.env?.BASE_URL ?? "/"}art/gallery/${file}`
    : undefined;
}
