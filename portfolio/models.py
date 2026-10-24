from django.db import models


class Service(models.Model):
    """A service in the Video or Music menu. Edit them at /admin."""

    CATEGORY_CHOICES = [('video', 'Video production'), ('music', 'Music production')]
    MODE_CHOICES = [
        ('in_person', 'In person'),
        ('remote', 'Remote'),
        ('both', 'In person & online'),
        ('referral', 'I’ll recommend'),
    ]

    category = models.CharField(max_length=5, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=80)
    slug = models.SlugField(help_text='Used in the link, e.g. "color-grading" → /video/#color-grading')
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='in_person')
    summary = models.TextField(help_text='One or two sentences')
    includes = models.TextField(blank=True, help_text='What’s included, one item per line')
    spec = models.CharField(max_length=160, blank=True, help_text='Small print, e.g. what to send or what you deliver')
    # Prices in CAD. Leave both empty to show no price (e.g. referrals).
    price = models.PositiveIntegerField(null=True, blank=True, help_text='Regular price in CAD')
    sale_price = models.PositiveIntegerField(null=True, blank=True,
                                             help_text='Special price in CAD. Leave empty when the special ends')
    price_unit = models.CharField(max_length=40, blank=True, help_text='e.g. "per song", "per hour"')
    price_from = models.BooleanField(default=False, help_text='Show "from" before the price')
    price_note = models.CharField(max_length=200, blank=True, help_text='Short note under the price')
    addons = models.TextField(blank=True, help_text='Optional extras, one per line, e.g. "Extra camera + operator | +$250"')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category', 'order']

    @property
    def on_sale(self):
        return self.price is not None and self.sale_price is not None and self.sale_price < self.price

    def __str__(self):
        return f'{self.get_category_display()} — {self.name}'

    def includes_list(self):
        return [line.strip() for line in self.includes.splitlines() if line.strip()]

    def addons_list(self):
        """Lines like "Extra camera | +$250" become ("Extra camera", "+$250")."""
        rows = []
        for line in self.addons.splitlines():
            if line.strip():
                name, _, price = line.partition('|')
                rows.append((name.strip(), price.strip()))
        return rows


class Package(models.Model):
    """A tier of a service, e.g. "Full set: 3 cameras, 30 min"."""

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='packages')
    name = models.CharField(max_length=60)
    tagline = models.CharField(max_length=120, blank=True, help_text='e.g. "3 cameras · up to 30 min"')
    includes = models.TextField(blank=True, help_text='One item per line')
    price = models.PositiveIntegerField(help_text='Regular price in CAD')
    sale_price = models.PositiveIntegerField(null=True, blank=True, help_text='Special price in CAD')
    featured = models.BooleanField(default=False, help_text='Highlight as the most popular choice')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.service.name}: {self.name}'

    @property
    def on_sale(self):
        return self.sale_price is not None and self.sale_price < self.price

    def includes_list(self):
        return [line.strip() for line in self.includes.splitlines() if line.strip()]


class Video(models.Model):
    """A music video shown in the reel."""

    LOOK_CHOICES = [
        ('tape', 'VHS tape'),
        ('strobe', 'Strobe shapes'),
        ('moon', 'Night road'),
    ]

    title = models.CharField(max_length=120)
    artist = models.CharField(max_length=120)
    role = models.CharField(max_length=120, help_text='What you did, e.g. "Direction · Edit · Color"')
    year = models.PositiveIntegerField()
    runtime = models.CharField(max_length=10, help_text='e.g. 3:42')
    video_file = models.FileField(upload_to='videos/', blank=True, help_text='Optional .mp4 to play in the monitor')
    link = models.URLField(blank=True, help_text='Optional YouTube / Vimeo link')
    hue = models.PositiveIntegerField(default=330, help_text='Color of the generated preview, 0–360')
    look = models.CharField(max_length=10, choices=LOOK_CHOICES, default='tape',
                            help_text='Style of the generated preview when there is no video file')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', '-year']

    def __str__(self):
        return f'{self.artist} — {self.title}'


class Track(models.Model):
    """A song in the mixes tracklist."""

    MODE_CHOICES = [('minor', 'Minor'), ('major', 'Major')]
    GROOVE_CHOICES = [
        ('punk', 'Fast punk'),
        ('half', 'Half-time'),
        ('slow', 'Slow'),
        ('four', 'Four on the floor'),
    ]

    title = models.CharField(max_length=120)
    artist = models.CharField(max_length=120)
    role = models.CharField(max_length=120, help_text='What you did, e.g. "Record · Mix"')
    bpm = models.PositiveIntegerField()
    key = models.CharField(max_length=20, help_text='e.g. E minor')
    lufs = models.CharField(max_length=10, help_text='Integrated loudness, e.g. −9.2')
    mix_file = models.FileField(upload_to='audio/', blank=True, help_text='Final mix (mp3/wav)')
    rough_file = models.FileField(upload_to='audio/', blank=True, help_text='Rough / unmixed version for the A/B switch')
    # Only used for the synthesized demo when there are no audio files yet
    root_note = models.PositiveIntegerField(default=40, help_text='Demo loop root as a MIDI note (40 = E2)')
    mode = models.CharField(max_length=5, choices=MODE_CHOICES, default='minor')
    groove = models.CharField(max_length=5, choices=GROOVE_CHOICES, default='punk')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.artist} — {self.title}'
