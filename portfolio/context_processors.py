from pathlib import Path

from django.conf import settings

from .models import Service, Track

STATIC_DIR = Path(__file__).resolve().parent / 'static' / 'portfolio'


def _version(relative_path):
    """File's last-modified time, used as ?v= so browsers reload CSS/JS after every edit."""
    try:
        return int((STATIC_DIR / relative_path).stat().st_mtime)
    except OSError:
        return 0


def site(request):
    """Data every page needs: the header menus and the contact block."""
    services = list(Service.objects.all())
    return {
        'nav_video': [s for s in services if s.category == 'video'],
        'nav_music': [s for s in services if s.category == 'music'],
        'has_tracks': Track.objects.exists(),  # hides the mixes player until a real song is added
        'css_version': _version('css/style.css'),
        'js_version': _version('js/main.js'),
        'owner_name': settings.OWNER_NAME,
        'special_label': settings.SPECIAL_LABEL,
        'special_note': settings.SPECIAL_NOTE,
        'contact_email': settings.CONTACT_EMAIL,
        'social_links': settings.SOCIAL_LINKS,
    }
