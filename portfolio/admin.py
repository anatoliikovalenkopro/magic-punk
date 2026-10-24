from django.contrib import admin

from .models import Package, Service, Track, Video


class PackageInline(admin.StackedInline):
    """Edit a service's packages on the same page as the service."""
    model = Package
    extra = 0


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'mode', 'price', 'sale_price', 'order']
    list_editable = ['order']
    list_filter = ['category', 'mode']
    prepopulated_fields = {'slug': ['name']}
    inlines = [PackageInline]


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'year', 'order']
    list_editable = ['order']


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'bpm', 'key', 'order']
    list_editable = ['order']
