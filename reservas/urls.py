# reservas/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path("registro/", views.registro_usuario),
    path("perfil/", views.perfil_alumno),
    path("historial-entrenamientos/", views.historial_entrenamientos),
]


from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.urls import re_path

index_view = never_cache(TemplateView.as_view(template_name="index.html"))

urlpatterns += [
    re_path(r"^.*$", index_view),  # Cualquier ruta que no sea de API va a index.html
]