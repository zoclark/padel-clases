from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView as DefaultTokenView
from reservas.serializers import CustomTokenObtainPairSerializer


class CustomTokenView(DefaultTokenView):
    serializer_class = CustomTokenObtainPairSerializer

# Vistas de autenticación
from reservas.views.auth_views import (solicitar_reset_password, 
    verificar_token_reset, confirmar_nueva_password,
    resend_verification_email, GoogleOAuthCallbackView,
    RegistroConVerificacionView, ActivarCuentaView,
    estado_verificacion, completar_onboarding, 
)

# Vistas de usuario
from reservas.views.usuario_views import (
    perfil_usuario, guardar_push_token,
    actualizar_foto_perfil, eliminar_foto_perfil,
    buscar_usuarios, ver_perfil_usuario,
    historial_evolucion_stats, guardar_evolucion_stats
)

# Vistas de entrenamiento
from reservas.views.entrenamiento_views import historial_entrenamientos

# Vistas de recursos
from reservas.views.recurso_views import recursos_alumno

# Vistas de reservas (esto está definido en `reserva_views.py`)
from reservas.views.reserva_views import obtener_reservas

# Vistas de pozos y afinidades
from reservas.views.pozo_views import (
    crear_pozo, listar_pozos, detalle_pozo, participantes_pozo,
    emparejamiento_pozo, agregar_participante, actualizar_participante, eliminar_participante,
    importar_participantes_excel, crear_afinidad, afinidades_usuario
)

# Vistas de amistad
from reservas.views.amistad_views import (
    EnviarSolicitudAmistadView, GestionarSolicitudAmistadView, ListaAmigosView,
    eliminar_amistad, bloquear_usuario, desbloquear_usuario, listar_bloqueados,
    solicitudes_recibidas, estado_solicitud_amistad
)

# Vistas de notificaciones
from reservas.views.notificacion_views import (
    listar_notificaciones, marcar_notificaciones_leidas,
    marcar_notificacion_leida, eliminar_notificacion
)


urlpatterns = [
    # JWT
    path("token/", CustomTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Login social
    path('auth/oauth2/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),
    # Registro y Autenticación
    path("registro/", RegistroConVerificacionView.as_view(), name="registro_verificado"),
    path("activar/<uidb64>/<token>/", ActivarCuentaView.as_view(), name="activar_cuenta"),
    path("resend-verification-email/", resend_verification_email),
    path("estado-verificacion/", estado_verificacion, name="estado-verificacion"),
    path("solicitar-reset-password/", solicitar_reset_password, name="solicitar_reset_password"),
    path("solicitar-reset-password/<uidb64>/<token>/", verificar_token_reset, name="verificar_token_reset"),
    path("solicitar-reset-password/confirm/", confirmar_nueva_password, name="confirmar_nueva_password"),

    # Perfil de usuario
    path("perfil/", perfil_usuario),
    path("completar_onboarding/", completar_onboarding, name="completar_onboarding"),
    path("push-token/", guardar_push_token),
    path("usuario/foto/", actualizar_foto_perfil),
    path("perfil/foto/eliminar/", eliminar_foto_perfil, name="eliminar_foto_perfil"),

    #Stats
    path("perfil/evolucion-stats/", historial_evolucion_stats, name="historial_evolucion_stats"),
    path("perfil/evolucion-stats/guardar/", guardar_evolucion_stats, name="guardar_evolucion_stats"),

    # Entrenamientos
    path("historial/", historial_entrenamientos),

    # Recursos
    path("recursos-alumno/", recursos_alumno),

    # Reservas
    path("reservas/", obtener_reservas),

    # Pozos & Participantes
    path("pozos/", listar_pozos),
    path("pozos/crear/", crear_pozo),
    path("pozos/<int:pozo_id>/", detalle_pozo, name="detalle_pozo"),
    path("pozos/<int:pozo_id>/participantes/", participantes_pozo),
    path("pozos/<int:pozo_id>/pairings/", emparejamiento_pozo, name="pozo_pairings"),
    path("pozos/participantes/agregar/", agregar_participante),
    path("pozos/participantes/<int:participante_id>/", actualizar_participante, name="actualizar_participante"),
    path("pozos/participantes/<int:participante_id>/eliminar/", eliminar_participante, name="eliminar_participante"),

    # Afinidades
    path("afinidades/<int:usuario_id>/", afinidades_usuario),
    path("pozos/afinidades/crear/", crear_afinidad),

    # Amistades
    path("amistad/solicitar/", EnviarSolicitudAmistadView.as_view(), name="solicitar_amistad"),
    path("amistad/gestionar/<int:pk>/", GestionarSolicitudAmistadView.as_view(), name="gestionar_amistad"),
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
    path("notificaciones/eliminar/<int:pk>/", eliminar_notificacion, name="eliminar_notificacion"),

    # Importar Excel
    path("pozos/<int:pozo_id>/importar_excel/", importar_participantes_excel, name="importar_participantes_excel"),
]
