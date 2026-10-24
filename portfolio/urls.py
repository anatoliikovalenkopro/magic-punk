from django.urls import path

from . import views

app_name = 'portfolio'

urlpatterns = [
    path('', views.home, name='home'),
    path('video/', views.video, name='video'),
    path('music/', views.music, name='music'),
]
