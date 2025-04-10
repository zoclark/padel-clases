# reservas/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path("registro/", views.registro_usuario),
    path("perfil/", views.perfil_alumno),
    path("historial-entrenamientos/", views.historial_entrenamientos),
]