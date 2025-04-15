from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import registro_usuario, perfil_alumno, historial_entrenamientos
urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("registro/", registro_usuario),
    path("perfil/", perfil_alumno),
    path("historial/", historial_entrenamientos),
]
# Servir estáticos
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Servir frontend (React)
# Servir React solo para rutas que NO apunten a archivos estáticos
urlpatterns += [
    re_path(r"^(?!api)(?!static/)(?!assets/)(?!media/)(?!favicon\.ico)(?!robots\.txt).*$", FrontendAppView.as_view())
]