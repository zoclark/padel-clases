from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import registro_usuario, perfil_usuario, historial_entrenamientos, obtener_reservas, recursos_alumno
from .views import (
    crear_pozo, listar_pozos, participantes_pozo, agregar_participante, afinidades_usuario, crear_afinidad
)
from .views import actualizar_participante, eliminar_participante, detalle_pozo


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("registro/", registro_usuario),
    path("perfil/", perfil_usuario),
    path("historial/", historial_entrenamientos),
    path("recursos-alumno/", recursos_alumno),  # Añade la ruta para los recursos asignados
    path("reservas/", obtener_reservas),
    path("pozos/", listar_pozos),
    path("pozos/crear/", crear_pozo),
    path('pozos/<int:pozo_id>/', detalle_pozo,           name='detalle_pozo'),
    path("pozos/<int:pozo_id>/participantes/", participantes_pozo),
    path("pozos/participantes/agregar/", agregar_participante),
    path("afinidades/<int:usuario_id>/", afinidades_usuario),
    path("pozos/afinidades/crear/", crear_afinidad),
     path("pozos/participantes/<int:participante_id>/", actualizar_participante, name="actualizar_participante"),
    path("pozos/participantes/<int:participante_id>/eliminar/", eliminar_participante, name="eliminar_participante"),
]


