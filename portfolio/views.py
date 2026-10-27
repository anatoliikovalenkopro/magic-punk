import re

from django.shortcuts import render

from .models import Photo, Service, Track, Video

YOUTUBE_ID = re.compile(r'(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([\w-]{11})')


def youtube_id(url):
    """'https://www.youtube.com/watch?v=8cBDGLc0bW0&list=...' -> '8cBDGLc0bW0' (or '' if not YouTube)."""
    match = YOUTUBE_ID.search(url or '')
    return match.group(1) if match else ''


def videos_as_data():
    """Plain data for the JavaScript video player (passed with json_script)."""
    return [
        {
            'title': v.title, 'artist': v.artist, 'role': v.role, 'year': v.year,
            'runtime': v.runtime, 'hue': v.hue, 'look': v.look,
            'src': v.video_file.url if v.video_file else '', 'link': v.link,
            'youtube': youtube_id(v.link),
        }
        for v in Video.objects.all()
    ]


def tracks_as_data():
    """Plain data for the JavaScript audio player (passed with json_script)."""
    return [
        {
            'title': t.title, 'artist': t.artist, 'role': t.role, 'bpm': t.bpm,
            'key': t.key, 'lufs': t.lufs, 'root': t.root_note, 'mode': t.mode, 'groove': t.groove,
            'mix': t.mix_file.url if t.mix_file else '',
            'rough': t.rough_file.url if t.rough_file else '',
        }
        for t in Track.objects.all()
    ]


def home(request):
    return render(request, 'portfolio/home.html', {
        'page': 'home',
        'videos_data': videos_as_data(),  # door preview + "Worked with" credits
    })


def video(request):
    return render(request, 'portfolio/video.html', {
        'page': 'video',
        'services': Service.objects.filter(category='video').prefetch_related('packages'),
        'videos_data': videos_as_data(),
    })


def photo(request):
    return render(request, 'portfolio/photo.html', {
        'page': 'photo',
        'services': Service.objects.filter(category='photo').prefetch_related('packages'),
        'photos': Photo.objects.all(),
    })


def music(request):
    return render(request, 'portfolio/music.html', {
        'page': 'music',
        'services': Service.objects.filter(category='music').prefetch_related('packages'),
        'tracks_data': tracks_as_data(),
    })
