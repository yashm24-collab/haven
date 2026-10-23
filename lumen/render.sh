#!/usr/bin/env bash
# Renders every Haven visual into launcher/assets with Remotion (`npm ci` first). Rerun after changing the scene.
# Scene images (in lumen/public/, >=1920x1080, no text or UI), most specific wins per time of day:
#   scene-morning.jpg / scene-day.jpg / scene-night.jpg   used as-is for that time of day
#   scene-source.jpg                                       one image, colour-graded into all three
#   (none)                                                 the painted landscape in src/Painted.tsx
set -euo pipefail
cd "$(dirname "$0")"
OUT=../launcher/assets
mkdir -p "$OUT" public
FF=$(node -p "require('ffmpeg-static')")
R="npx remotion"

props() {
  if [[ -f public/scene-$1.jpg ]]; then echo "{\"source\":\"scene-$1.jpg\",\"graded\":true}"
  elif [[ -f public/scene-source.jpg ]]; then echo '{"source":"scene-source.jpg"}'
  else echo '{}'; fi
}

for t in morning day night; do
  C=(src/index.ts --port=3917 --log=error --props="$(props "$t")")
  $R still "${C[@]}" "still-$t" "$OUT/still-$t.jpg" --image-format=jpeg --jpeg-quality=88
  $R still "${C[@]}" "wcbg-$t" "public/bg-wc-$t.jpg" --image-format=jpeg --jpeg-quality=92
  cp "public/bg-wc-$t.jpg" "$OUT/bg-wc-$t.jpg"
  $R still "${C[@]}" "setbg-$t" "$OUT/bg-set-$t.jpg" --image-format=jpeg --jpeg-quality=88
  $R render "${C[@]}" "scene-$t" "$OUT/scene-$t.mp4" --codec=h264 --crf=23
  $R render "${C[@]}" "globe-$t" "$OUT/wc-$t.mp4" --codec=h264 --crf=27
  $R render "${C[@]}" "intro-$t" "$OUT/intro-$t.mp4" --codec=h264 --crf=20
done
C=(src/index.ts --port=3917 --log=error --props="$(props day)")
$R still "${C[@]}" splash ../launcher/splash.png --image-format=png
$R still "${C[@]}" icon ../launcher/largeIcon.png --image-format=png
"$FF" -loglevel error -y -i ../launcher/largeIcon.png -vf scale=80:80 ../launcher/icon.png
ls -la "$OUT"
