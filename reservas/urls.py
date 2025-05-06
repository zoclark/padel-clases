from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

from reservas.views import (
    registro_usuario, perfil_usuario, historial_entrenamientos, obtener_reservas, recursos_alumno,
    crear_pozo, listar_pozos, detalle_pozo, participantes_pozo,
    emparejamiento_pozo,  # <-- nueva vista
    agregar_participante, actualizar_participante, eliminar_participante,
    afinidades_usuario, crear_afinidad,
    importar_participantes_excel,
    historial_evolucion_stats, guardar_evolucion_stats,
    onboarding_perfil_alumno, completar_onboarding, guardar_push_token,
    FrontendAppView,
    estado_verificacion,                 # ★ ➊ importamos la vista pública
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from reservas.views_auth import RegistroConVerificacionView, ActivarCuentaView
from reservas.views import resend_verification_email
from reservas.views import (
    lista_amigos, eliminar_notificacion, guardar_token_push, marcar_notificacion_leida, solicitudes_recibidas, marcar_notificaciones_leidas, eliminar_foto_perfil, actualizar_foto_perfil, ver_perfil_usuario, buscar_usuarios, listar_bloqueados, desbloquear_usuario, eliminar_amistad, bloquear_usuario, EnviarSolicitudAmistadView, GestionarSolicitudAmistadView
)
from reservas.views import (
    listar_notificaciones)
urlpatterns = [
    # Auth / Perfil
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("perfil/", perfil_usuario),
    path("completar_onboarding/", completar_onboarding, name="completar_onboarding"),
    path("push-token/", guardar_push_token),
    path("registro/", RegistroConVerificacionView.as_view(), name="registro_verificado"),
    path("activar/<uidb64>/<token>/", ActivarCuentaView.as_view(), name="activar_cuenta"),
    path("resend-verification-email/", resend_verification_email),
    path("estado-verificacion/", estado_verificacion, name="estado-verificacion"),  # ★ ➋ nueva ruta
    path("usuario/foto/", actualizar_foto_perfil),
    path("perfil/foto/eliminar/", eliminar_foto_perfil, name="eliminar_foto_perfil"),
    path('guardar-token', guardar_token_push),
    # Entrenamientos / Recursos / Reservas
    path("historial/", historial_entrenamientos),
    path("recursos-alumno/", recursos_alumno),
    path("reservas/", obtener_reservas),
    path("perfil/evolucion/", historial_evolucion_stats),
    path("perfil/evolucion/guardar/", guardar_evolucion_stats),
    path("onboarding-perfil/", onboarding_perfil_alumno, name="onboarding-perfil"),

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
    path("amistad/lista/", lista_amigos, name="lista_amigos"),
    path("amistad/eliminar/<int:usuario_id>/", eliminar_amistad),
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
