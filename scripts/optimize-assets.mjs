import sharp from "sharp";
for (const name of ["emerald", "sage", "neon", "gold"]) {
  await sharp(`public/assets/${name}.jpg`)
    .webp({ quality: 82 })
    .toFile(`public/assets/${name}.webp`);
  await sharp(`public/assets/${name}.jpg`)
    .resize(400, 400)
    .webp({ quality: 78 })
    .toFile(`public/assets/${name}-card.webp`);
}
