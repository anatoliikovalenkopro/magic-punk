"""
python manage.py build

Saves the whole site as plain files in docs/, ready for GitHub Pages:
  docs/index.html, docs/video/index.html, docs/music/index.html
  docs/static/...   CSS, JS, photos
  docs/media/...    uploaded audio and video files
  docs/CNAME        tells GitHub Pages which domain to use

Workflow: edit in /admin on your computer -> python manage.py build -> git push.
"""
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test import Client

PAGES = ['/', '/video/', '/music/']


class Command(BaseCommand):
    help = 'Export the site as static files into docs/ for GitHub Pages.'

    def add_arguments(self, parser):
        parser.add_argument('--out', default=str(settings.BASE_DIR / 'docs'), help='Output folder (default: docs/)')

    def handle(self, *args, **options):
        out = Path(options['out'])
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)

        # 1. Render every page through Django, exactly as the browser would get it
        client = Client(HTTP_HOST='localhost')
        for url in PAGES:
            response = client.get(url)
            if response.status_code != 200:
                raise CommandError(f'{url} returned {response.status_code}')
            target = out / url.strip('/') / 'index.html'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(response.content)
            self.stdout.write(f'  page   {url} -> {target.relative_to(out)}')

        # 2. Copy the site's own static files (CSS, JS, images)
        app_static = Path(__file__).resolve().parents[2] / 'static'
        shutil.copytree(app_static, out / 'static')
        self.stdout.write('  static -> static/')

        # 3. Copy uploaded media (audio, video files), if any
        media = Path(settings.MEDIA_ROOT)
        if media.exists() and any(media.iterdir()):
            shutil.copytree(media, out / 'media')
            self.stdout.write('  media  -> media/')

        # 4. GitHub Pages extras: custom domain + skip Jekyll processing
        (out / 'CNAME').write_text(settings.SITE_DOMAIN, encoding='utf-8')  # same format GitHub writes
        (out / '.nojekyll').write_text('', encoding='utf-8')

        self.stdout.write(self.style.SUCCESS(f'Built {len(PAGES)} pages into {out}'))
