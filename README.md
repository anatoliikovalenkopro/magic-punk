# Magic Punk

Portfolio site for music videos, recording and mixing. Built with Django.

## Project layout

```
magic_punk/            project settings and main urls.py
portfolio/             the app that is the website
  models.py            Service, Video, Track (stored in the database)
  views.py             home, video and music pages
  urls.py              /  /video/  /music/
  context_processors.py  services for the header menus, contact info
  admin.py             makes Service, Video and Track editable at /admin
  templates/portfolio/ base.html (header, contact, footer) + home/video/music
                       _service.html and _remote_steps.html are reused pieces
  static/portfolio/    css/style.css and js/main.js (players, A/B switch)
  fixtures/            sample_data.json (placeholder projects), services.json
media/                 uploaded video/audio files (created on first upload)
```

## Run it

Open a terminal in this folder:

```
.venv\Scripts\activate
python manage.py runserver 8001
```

Then open http://127.0.0.1:8001/

First time on a new computer:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata sample_data services
python manage.py createsuperuser
```

## Add your real work

1. `python manage.py createsuperuser` (once) and log in at http://127.0.0.1:8001/admin/
2. Under **Portfolio**, edit or delete the sample Videos and Tracks.
   **Services** controls both header menus and the service lists on /video/ and /music/:
   pick the category (Video or Music), the mode (In person, Remote, I'll recommend),
   and write "What's included" one item per line.
3. Videos: upload an .mp4 to **Video file**, and/or paste a YouTube link.
4. Tracks: upload the final mix to **Mix file** and the unmixed version to
   **Rough file** so visitors can A/B them.

Contact email and social links are at the bottom of `magic_punk/settings.py`.

## Going live on magicpunkstudio.com

The domain is already set in `magic_punk/settings.py` (`SITE_DOMAIN`), along with
HTTPS-only security that switches on by itself when `DJANGO_DEBUG=0`.

On the server, set these environment variables:

| Variable | Value |
|---|---|
| `DJANGO_DEBUG` | `0` |
| `DJANGO_SECRET_KEY` | a new random key, made with: `python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"` |
| `DJANGO_ALLOWED_HOSTS` | optional: the host's own address, e.g. `yourname.pythonanywhere.com` |

Then on the server:

```
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
python manage.py createsuperuser
```

Email: the site shows `hello@magicpunkstudio.com`. Turn on free email forwarding at your
domain registrar so it reaches your Gmail.
