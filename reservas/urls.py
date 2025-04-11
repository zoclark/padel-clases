# reservas/urls.py
from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView

# Rutas de la API
urlpatterns = [
    path("registro/", views.registro_usuario),
    path("perfil/", views.perfil_alumno),
    path("historial-entrenamientos/", views.historial_entrenamientos),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),  # Token para login
]

# Rutas para servir el index.html de React cuando no se encuentre una ruta de la API
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
index_view = never_cache(TemplateView.as_view(template_name="index.html"))

from django.urls import re_path
# Para cualquier ruta que no sea de la API, devolver el index.html
urlpatterns += [
    re_path(r"^.*$", index_view),
]

# Servir archivos estáticos
from django.conf import settings
from django.conf.urls.static import static
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
