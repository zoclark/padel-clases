# reservas/urls.py
from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView

# Rutas de la API
urlpatterns = [
    path("registro/", views.registro_usuario),
    path("perfil/", views.perfil_alumno),
    path("historial-entrenamientos/", views.historial_entrenamientos),
]

# Servir archivos estáticos
from django.conf import settings
from django.conf.urls.static import static
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
