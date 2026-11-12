"""
python manage.py import_tracks <folder>

Adds every audio file in <folder> to the Mixes player (or refreshes it if a track
with the same title already exists):
  - WAV / AIFF / FLAC are converted to AAC (.m4a, 256 kbps) so they load fast on the web.
    MP3 / M4A files are copied as they are (converting again would only lose quality).
  - Measures integrated loudness (LUFS), length and the waveform shape.
  - Saves the file into media/audio/, ready for `python manage.py build`.

Then rename tracks, set the artist, genre and what you did at /admin.
Uses macOS's built-in afconvert, and numpy + pyloudnorm (pip install -r requirements-dev.txt).
"""
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from portfolio.models import Track

CONVERT = {'.wav', '.aif', '.aiff', '.flac'}
KEEP = {'.mp3', '.m4a'}
PEAK_BARS = 96


def nice_title(stem):
    """'1.water' -> 'Water', 'DopplerShift_Atrophy_Full' -> 'DopplerShift Atrophy Full'."""
    title = re.sub(r'^\d+\s*[.\-_ ]\s*', '', stem.strip())  # leading track numbers
    title = re.sub(r'[_]+', ' ', title)
    title = re.sub(r'\s+', ' ', title).strip() or stem.strip()
    return title[0].upper() + title[1:]


def mmss(seconds):
    seconds = int(round(seconds))
    return f'{seconds // 60}:{seconds % 60:02d}'


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise CommandError(f'{cmd[0]} failed: {result.stderr.strip() or result.stdout.strip()}')


def analyse(path):
    """Decode to 16-bit WAV with afconvert, return (lufs, seconds, peaks)."""
    import numpy as np
    import pyloudnorm

    with tempfile.TemporaryDirectory() as tmp:
        pcm = Path(tmp) / 'decoded.wav'
        run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(path), str(pcm)])
        with wave.open(str(pcm)) as w:
            rate, channels, frames = w.getframerate(), w.getnchannels(), w.getnframes()
            data = np.frombuffer(w.readframes(frames), dtype='<i2').astype(np.float32) / 32768.0
    data = data.reshape(-1, channels)

    lufs = pyloudnorm.Meter(rate).integrated_loudness(data)

    mono = np.abs(data).max(axis=1)
    buckets = np.array_split(mono, PEAK_BARS)
    rms = np.array([np.sqrt(np.mean(b ** 2)) if len(b) else 0.0 for b in buckets])
    peaks = (rms / rms.max()).round(3).tolist() if rms.max() > 0 else [0.0] * PEAK_BARS
    return lufs, len(data) / rate, peaks


class Command(BaseCommand):
    help = 'Import a folder of mixed tracks into the Mixes player.'

    def add_arguments(self, parser):
        parser.add_argument('folder')
        parser.add_argument('--role', default='Mix', help='What you did, for new tracks (default: "Mix")')

    def handle(self, *args, folder, role, **options):
        try:
            import numpy  # noqa: F401
            import pyloudnorm  # noqa: F401
        except ImportError:
            raise CommandError('Run: pip install -r requirements-dev.txt')

        src = Path(folder).expanduser()
        files = sorted(p for p in src.iterdir() if p.suffix.lower() in CONVERT | KEEP)
        if not files:
            raise CommandError(f'No audio files in {src}')

        out_dir = Path(settings.MEDIA_ROOT) / 'audio'
        out_dir.mkdir(parents=True, exist_ok=True)
        next_order = (Track.objects.order_by('-order').values_list('order', flat=True).first() or 0) + 1

        for path in files:
            title = nice_title(path.stem)
            slug = slugify(title) or slugify(path.stem) or 'track'
            if path.suffix.lower() in CONVERT:
                target = out_dir / f'{slug}.m4a'
                run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '256000', '-q', '127', str(path), str(target)])
            else:
                target = out_dir / f'{slug}{path.suffix.lower()}'
                target.write_bytes(path.read_bytes())

            lufs, seconds, peaks = analyse(target)
            track = Track.objects.filter(title=title).first() or Track(title=title, role=role, order=next_order)
            if not track.pk:
                next_order += 1
            track.mix_file.name = f'audio/{target.name}'
            track.lufs = f'{lufs:.1f}'.replace('-', '−')
            track.duration = mmss(seconds)
            track.peaks = json.dumps(peaks)
            track.save()
            size = target.stat().st_size / 1e6
            self.stdout.write(f'  {path.name:40} -> {target.name:30} {size:5.1f} MB  {track.duration}  {track.lufs} LUFS')

        self.stdout.write(self.style.SUCCESS(f'Imported {len(files)} tracks. Edit titles, artists and genres at /admin.'))
