"""Inspect and replace the music bed of a rendered video. Requires FFmpeg."""
import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path


def run(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f"{arguments[0]} exited with status {result.returncode}")
    return result


def probe(path):
    return json.loads(run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]).stdout)


def first_stream(info, kind):
    return next((stream for stream in info["streams"] if stream["codec_type"] == kind), None)


def duration_of(stream):
    value = stream.get("duration")
    if value not in (None, "N/A"):
        return float(value)
    ticks = stream.get("duration_ts")
    base = stream.get("time_base")
    if ticks is not None and base:
        num, den = map(int, base.split("/"))
        return ticks * num / den
    return None


def inspect(args):
    info = probe(args.input)
    video = first_stream(info, "video")
    audio = first_stream(info, "audio")
    if not video:
        raise ValueError("The input does not contain a video stream.")
    options = f"d={args.black_min}:pix_th={args.pixel_threshold}:pic_th={args.picture_threshold}"
    result = run([
        "ffmpeg", "-hide_banner", "-nostats", "-xerror", "-i", str(args.input),
        "-map", "0:v:0", "-map", "0:a:0?", "-vf", f"scale=320:-2,blackdetect={options}", "-f", "null", "-"
    ])
    matches = re.findall(
        r"black_start:([0-9.e+-]+)\s+black_end:([0-9.e+-]+)\s+black_duration:([0-9.e+-]+)",
        result.stderr,
    )
    black = [{"start": float(start), "end": float(end), "duration": float(length)}
             for start, end, length in matches]
    video_duration = duration_of(video)
    audio_duration = duration_of(audio) if audio else None
    container_duration = info["format"].get("duration")
    tail = bool(black and video_duration is not None and black[-1]["end"] >= video_duration - .12)
    overhang = None
    if video_duration is not None and audio_duration is not None:
        video_end = video_duration + float(video.get("start_time", 0))
        audio_end = audio_duration + float(audio.get("start_time", 0))
        overhang = round(max(0, audio_end - video_end), 4)
    report = {
        "video": {"width": video["width"], "height": video["height"], "codec": video["codec_name"],
                  "fps": video["avg_frame_rate"], "display_aspect_ratio": video.get("display_aspect_ratio"),
                  "duration": video_duration},
        "audio": {"codec": audio["codec_name"], "duration": audio_duration} if audio else None,
        "container_duration": float(container_duration) if container_duration else None,
        "black_segments": black, "black_tail_detected": tail, "audio_overhang": overhang,
        "decode_passed": True,
    }
    print(json.dumps(report, indent=2))
    return 2 if args.require_clean and (black or (overhang is not None and overhang > .12)) else 0


def mux(args):
    video = first_stream(probe(args.picture), "video")
    audio = first_stream(probe(args.audio), "audio")
    if not video or not audio:
        raise ValueError("Supply a rendered picture with video and a source with audio.")
    duration = duration_of(video)
    if duration is None or not math.isfinite(duration) or duration <= 0:
        raise ValueError("The picture stream must report its duration.")
    if args.fade < 0 or args.fade > duration or not math.isfinite(args.fade):
        raise ValueError("--fade must be between zero and the picture duration.")
    if args.output.suffix.lower() != ".mp4":
        raise ValueError("Use an .mp4 output path.")
    filters = f"asetpts=PTS-STARTPTS,apad,atrim=duration={duration:.8f}"
    if args.fade:
        filters += f",afade=t=out:st={duration-args.fade:.8f}:d={args.fade:.8f}:curve=hsin"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-n",
        "-i", str(args.picture), "-i", str(args.audio),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", filters,
        "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(args.output),
    ])
    print(args.output)
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("inspect", help="Probe, decode and find black video intervals.")
    audit.add_argument("input", type=Path)
    audit.add_argument("--black-min", type=float, default=.6, help="Minimum black interval in seconds.")
    audit.add_argument("--pixel-threshold", type=float, default=.12)
    audit.add_argument("--picture-threshold", type=float, default=.985)
    audit.add_argument("--require-clean", action="store_true", help="Return status 2 if black segments or audio overhang are detected.")
    audit.set_defaults(task=inspect)
    edit = commands.add_parser("mux", help="Copy picture and trim or pad a replacement audio track.")
    edit.add_argument("picture", type=Path)
    edit.add_argument("audio", type=Path)
    edit.add_argument("output", type=Path)
    edit.add_argument("--fade", type=float, default=0, help="Audio fade-out duration in seconds.")
    edit.set_defaults(task=mux)
    args = parser.parse_args()
    if args.command == "inspect" and (not math.isfinite(args.black_min) or args.black_min <= 0 or
            not 0 <= args.pixel_threshold <= 1 or not 0 <= args.picture_threshold <= 1):
        parser.error("Use a positive minimum duration and thresholds between zero and one.")
    try:
        return args.task(args)
    except (OSError, RuntimeError, ValueError, KeyError) as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
