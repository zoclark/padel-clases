from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView as DefaultTokenView
from reservas.serializers import CustomTokenObtainPairSerializer
from rest_framework.routers import DefaultRouter

# Routers para viewsets (clubes)
from reservas.views.club_views import (
    ClubViewSet, PistaViewSet, PromocionClubViewSet,
    EventoClubViewSet, PartnershipClubViewSet
)

router = DefaultRouter()
router.register(r'clubes', ClubViewSet, basename='club')
router.register(r'pistas', PistaViewSet, basename='pista')
router.register(r'promociones', PromocionClubViewSet, basename='promocionclub')
router.register(r'eventos-club', EventoClubViewSet, basename='eventoclub')
router.register(r'partnerships', PartnershipClubViewSet, basename='partnershipclub')

class CustomTokenView(DefaultTokenView):
    serializer_class = CustomTokenObtainPairSerializer

# Vistas
from reservas.views.auth_views import *
from reservas.views.usuario_views import *
from reservas.views.entrenamiento_views import *
from reservas.views.recurso_views import *
from reservas.views.reserva_views import *
from reservas.views.pozo_views import *
from reservas.views.amistad_views import *
from reservas.views.notificacion_views import *

urlpatterns = [
    # JWT
    path("token/", CustomTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Social login
    path("auth/oauth2/callback/", GoogleOAuthCallbackView.as_view(), name="google-oauth-callback"),

    # Registro y activación
    path("registro/", RegistroConVerificacionView.as_view(), name="registro_verificado"),
    path("activar/<uidb64>/<token>/", ActivarCuentaView.as_view(), name="activar_cuenta"),
    path("resend-verification-email/", resend_verification_email),
    path("estado-verificacion/", estado_verificacion, name="estado-verificacion"),
    path("solicitar-reset-password/", solicitar_reset_password),
    path("solicitar-reset-password/<uidb64>/<token>/", verificar_token_reset),
    path("solicitar-reset-password/confirm/", confirmar_nueva_password),

    # Perfil
    path("perfil/", perfil_usuario),
    path("completar_onboarding/", completar_onboarding),
    path("push-token/", guardar_push_token),
    path("usuario/foto/", actualizar_foto_perfil),
    path("perfil/foto/eliminar/", eliminar_foto_perfil),

    # Stats
    path("perfil/evolucion-stats/", historial_evolucion_stats),
    path("perfil/evolucion-stats/guardar/", guardar_evolucion_stats),

    # Entrenamientos
    path("historial/", historial_entrenamientos),

    # Recursos
    path("recursos-alumno/", recursos_alumno),

    # Reservas
    path("reservas/", obtener_reservas),

    # Pozos y afinidades
    path("pozos/", listar_pozos),
    path("pozos/crear/", crear_pozo),
    path("pozos/<int:pozo_id>/", detalle_pozo),
    path("pozos/<int:pozo_id>/participantes/", participantes_pozo),
    path("pozos/<int:pozo_id>/pairings/", emparejamiento_pozo),
    path("pozos/participantes/agregar/", agregar_participante),
    path("pozos/participantes/<int:participante_id>/", actualizar_participante),
    path("pozos/participantes/<int:participante_id>/eliminar/", eliminar_participante),
    path("pozos/<int:pozo_id>/importar_excel/", importar_participantes_excel),
    path("pozos/afinidades/crear/", crear_afinidad),
    path("afinidades/<int:usuario_id>/", afinidades_usuario),

    # Amistad
    path("amistad/solicitar/", EnviarSolicitudAmistadView.as_view()),
    path("amistad/gestionar/<int:pk>/", GestionarSolicitudAmistadView.as_view()),
    path("amistad/lista/", ListaAmigosView.as_view()),
    path("amistad/eliminar/<int:pk>/", eliminar_amistad),
    path("amistad/bloquear/<int:usuario_id>/", bloquear_usuario),
    path("amistad/bloqueados/", listar_bloqueados),
    path("amistad/desbloquear/<int:usuario_id>/", desbloquear_usuario),
    path("amistad/recibidas/", solicitudes_recibidas),
    path("amistad/solicitud/<int:pk>/", estado_solicitud_amistad),

    # Usuarios
    path("usuarios/buscar/", buscar_usuarios),
    path("api/perfil/<int:usuario_id>/", ver_perfil_usuario),

    # Notificaciones
    path("notificaciones/", listar_notificaciones),
    path("notificaciones/marcar-leidas/", marcar_notificaciones_leidas),
    path("notificaciones/<int:notificacion_id>/leida/", marcar_notificacion_leida),
    path("notificaciones/eliminar/<int:pk>/", eliminar_notificacion),

    # ViewSets API
    path("api/", include(router.urls)),
]
