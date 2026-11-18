"""Estimate a steady beat grid and nearby audio onsets using NumPy and FFmpeg."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    raise SystemExit("Install NumPy to use beat_grid.py.")


SAMPLE_RATE = 22050
WINDOW = 1024
HOP = 220
BANDS = ((38, 122), (122, 340), (340, 1800), (1800, 4500), (4500, 9000))


def decode(path, start, length):
    result = subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-i", str(path),
        "-t", str(length), "-map", "0:a:0", "-ac", "1", "-ar", str(SAMPLE_RATE),
        "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1",
    ], capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip())
    return np.frombuffer(result.stdout, dtype="<f4")


def onset_curve(signal):
    windows = np.lib.stride_tricks.sliding_window_view(signal, WINDOW)[::HOP]
    window = np.hanning(WINDOW)
    bins = np.fft.rfftfreq(WINDOW, 1 / SAMPLE_RATE)
    masks = [(bins >= low) & (bins < high) for low, high in BANDS]
    flux = np.zeros((len(BANDS), len(windows)))
    previous = None
    for start in range(0, len(windows), 512):
        spectra = np.log1p(np.abs(np.fft.rfft(windows[start:start + 512] * window, axis=1)) * 2)
        if previous is None:
            previous = spectra[:1]
        change = np.maximum(0, np.diff(spectra, axis=0, prepend=previous))
        previous = spectra[-1:]
        for index, mask in enumerate(masks):
            flux[index, start:start + len(spectra)] = change[:, mask].mean(axis=1)
    scale = np.maximum(1e-5, np.quantile(flux, .96, axis=1))
    scaled = np.minimum(flux / scale[:, None], 3)
    return scaled.T @ np.array([.42, .68, .86, .84, .58])


def analyze(signal, offset, minimum, maximum):
    if len(signal) < SAMPLE_RATE * 4:
        raise ValueError("Select at least four seconds of music.")
    curve = onset_curve(signal)
    if not np.any(curve):
        raise ValueError("The selected audio is silent.")
    speed = HOP / SAMPLE_RATE
    time = np.arange(len(curve)) * speed + WINDOW / (2 * SAMPLE_RATE)
    spectrum = np.abs(np.fft.rfft(curve - np.mean(curve), n=2 ** int(np.ceil(np.log2(len(curve) * 8)))))
    bpms = np.linspace(0, 30 / speed, len(spectrum))
    window = np.flatnonzero((bpms >= minimum) & (bpms <= maximum))
    if not len(window):
        raise ValueError("No beat candidates within the selected BPM range.")
    peak = window[np.argmax(spectrum[window])]
    center = float(bpms[peak])
    step = float(bpms[1])
    candidates = np.linspace(max(minimum, center - step), min(maximum, center + step), 21)
    complex_scores = np.array([np.sum(curve * np.exp(-2j * np.pi * bpm / 60 * time)) for bpm in candidates])
    winner = np.argmax(np.abs(complex_scores))
    bpm = float(candidates[winner])
    period = 60 / bpm
    phase = float((-np.angle(complex_scores[winner]) * period / (2 * np.pi)) % period)
    beats = []
    for predicted in np.arange(phase, time[-1], period):
        nearby = np.flatnonzero(np.abs(time - predicted) <= .085)
        if not len(nearby):
            continue
        strongest = nearby[np.argmax(curve[nearby])]
        beats.append({"beat": round(float(predicted) + offset, 4),
                      "onset": round(float(time[strongest]) + offset, 4),
                      "relative_strength": round(float(curve[strongest]), 3)})
    return {"bpm_estimate": round(bpm, 3), "beat_interval": round(period, 5),
            "first_grid_time": round(phase + offset, 4), "beats": beats}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--end", type=float)
    parser.add_argument("--min-bpm", type=float, default=72)
    parser.add_argument("--max-bpm", type=float, default=160)
    args = parser.parse_args()
    if args.start < 0 or args.end is not None and args.end <= args.start:
        parser.error("Set a nonnegative start and an end after it.")
    if not 20 <= args.min_bpm < args.max_bpm <= 400:
        parser.error("Choose an increasing BPM range between 20 and 400.")
    length = args.end - args.start if args.end is not None else 300
    if length > 600:
        parser.error("Analyze segments of up to 600 seconds.")
    try:
        signal = decode(args.input, args.start, length)
        print(json.dumps(analyze(signal, args.start, args.min_bpm, args.max_bpm), indent=2))
    except (OSError, RuntimeError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
