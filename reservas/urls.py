from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import registro_usuario, perfil_alumno, historial_entrenamientos, obtener_reservas, recursos_alumno

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("registro/", registro_usuario),
    path("perfil/", perfil_alumno),
    path("historial/", historial_entrenamientos),
    path("recursos-alumno/", recursos_alumno),  # Añade la ruta para los recursos asignados
    path("reservas/", obtener_reservas),  # Añade la ruta para los recursos asignados
]
