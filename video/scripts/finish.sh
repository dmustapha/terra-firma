#!/usr/bin/env bash
# Terra Firma film, last mile: mix the cleaned voice over the ducked music bed, hit -16 LUFS, mux onto the Remotion
# picture, write a QuickTime-safe H.264 (yuv420p limited range, level 4.1, faststart) + AAC file.
# Usage: scripts/finish.sh   (expects build/raw.mp4 from `npm run render` and build/voice.wav from voice_assemble.py)
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=build/raw.mp4; VOICE=build/voice.wav; MUSIC="$HOME/vultr-rush/video/voice/music.mp3"; OUT=out/terra-firma-demo.mp4
mkdir -p out build/mix
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW")
FO=$(python3 -c "print(round($D-4.2,2))")
# bed: Digital Technology by AtlasAudio (Pixabay Content License); 284 s long, so no loop is needed for a <3 min film
ffmpeg -v error -y -i "$VOICE" -i "$MUSIC" -filter_complex "
[1:a]atrim=0:$D,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=-2dB,afade=in:st=0:d=1.5,afade=out:st=$FO:d=4.0[m];
[0:a]atrim=0:$D,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=$D,asplit=3[v][sc][vs];
[m][sc]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=600[duck];
[duck]asplit=2[d1][ms];
[d1][v]amix=inputs=2:normalize=0[mix]" \
  -map "[mix]" build/mix/premix.wav -map "[ms]" build/mix/bed.wav -map "[vs]" build/mix/voice.wav
# one linear gain to -16 LUFS integrated, then a true-peak guard
I=$(ffmpeg -hide_banner -i build/mix/premix.wav -af ebur128 -f null - 2>&1 | awk '/Integrated loudness:/{getline; print $2}')
G=$(python3 -c "print(round(-16-($I),2))")
echo "premix integrated $I LUFS, gain $G dB"
ffmpeg -v error -y -i "$RAW" -i build/mix/premix.wav -filter_complex "[1:a]volume=${G}dB,alimiter=limit=0.84:level=false[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.1 \
  -vf "scale=out_range=tv,format=yuv420p" -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -ar 48000 -t "$D" -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,pix_fmt,color_range,width,height,r_frame_rate,profile,level -of compact "$OUT"
