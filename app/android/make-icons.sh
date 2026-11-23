#!/usr/bin/env bash
# Ganti ikon default Capacitor dengan logo SarjanaCheck. Jalankan dari app/android setelah `cap add android`.
set -euo pipefail
IM=$(command -v magick || command -v convert)
SRC=icon-source.png
RES=android/app/src/main/res
declare -A LEG=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
declare -A FG=([mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)
for d in "${!LEG[@]}"; do
  s=${LEG[$d]}; f=${FG[$d]}; inner=$((f * 60 / 100))
  "$IM" "$SRC" -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher.png"
  "$IM" "$SRC" -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher_round.png"
  "$IM" "$SRC" -resize ${inner}x${inner} -background none -gravity center -extent ${f}x${f} "$RES/mipmap-$d/ic_launcher_foreground.png"
done
printf '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#10131A</color>\n</resources>\n' \
  > "$RES/values/ic_launcher_background.xml"
