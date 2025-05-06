# Importación de path desde django.urls
from django.urls import path, include

# Importaciones de vistas
from reservas.views import (
    perfil_usuario, historial_entrenamientos, obtener_reservas, recursos_alumno,
    crear_pozo, listar_pozos, detalle_pozo, participantes_pozo,
    emparejamiento_pozo, agregar_participante, actualizar_participante, eliminar_participante,
    afinidades_usuario, crear_afinidad,
    importar_participantes_excel,
    historial_evolucion_stats, guardar_evolucion_stats,
    onboarding_perfil_alumno, completar_onboarding, guardar_push_token,
    FrontendAppView, estado_verificacion,
)

from reservas.views_auth import RegistroConVerificacionView, ActivarCuentaView
from reservas.views import resend_verification_email
from reservas.views.amistad_views import (
    EnviarSolicitudAmistadView, GestionarSolicitudAmistadView, ListaAmigosView,
    eliminar_amistad, bloquear_usuario, desbloquear_usuario, listar_bloqueados,
    solicitudes_recibidas
)
from reservas.views.notificacion_views import (
    listar_notificaciones, marcar_notificaciones_leidas, marcar_notificacion_leida, eliminar_notificacion
)
from reservas.views.usuario_views import buscar_usuarios, ver_perfil_usuario
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView  # Importar JWT
from reservas.views.usuario_views import actualizar_foto_perfil, eliminar_foto_perfil

# URLs de las vistas
urlpatterns = [
    # JWT
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Registro y Autenticación
    path("registro/", RegistroConVerificacionView.as_view(), name="registro_verificado"),
    path("activar/<uidb64>/<token>/", ActivarCuentaView.as_view(), name="activar_cuenta"),
    path("resend-verification-email/", resend_verification_email),
    path("estado-verificacion/", estado_verificacion, name="estado-verificacion"),

    # Perfil de usuario
    path("perfil/", perfil_usuario),
    path("completar_onboarding/", completar_onboarding, name="completar_onboarding"),
    path("push-token/", guardar_push_token),
    path("usuario/foto/", actualizar_foto_perfil),
    path("perfil/foto/eliminar/", eliminar_foto_perfil, name="eliminar_foto_perfil"),

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
    path("usuarios/buscar/", buscar_usuarios),
    path("api/perfil/<int:usuario_id>/", ver_perfil_usuario),
    path("amistad/recibidas/", solicitudes_recibidas),

    # Notificaciones
    path("notificaciones/", listar_notificaciones),
    path("notificaciones/marcar-leidas/", marcar_notificaciones_leidas),
    path("notificaciones/<int:notificacion_id>/leida/", marcar_notificacion_leida),
    path("notificaciones/eliminar/<int:pk>/", eliminar_notificacion, name="eliminar_notificacion"),

    # Importar Excel
    path("pozos/<int:pozo_id>/importar_excel/", importar_participantes_excel, name="importar_participantes_excel"),

    ]
