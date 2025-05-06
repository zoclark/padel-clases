from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from datetime import timedelta
from django.utils import timezone

from ..models import Notificacion, Usuario
from ..serializers import NotificacionSerializer
from ..utils_email import send_verification_email


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_notificaciones(request):
    notis = request.user.notificaciones.order_by("-fecha")[:50]
    data = [{
        "id": n.id,
        "titulo": n.titulo,
        "cuerpo": n.cuerpo,
        "tipo": n.tipo,
        "fecha": n.fecha,
        "leida": n.leida,
        "extra": n.extra
    } for n in notis]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_notificaciones_leidas(request):
    request.user.notificaciones.filter(leida=False).update(leida=True)
    return Response({"mensaje": "Notificaciones marcadas como leídas"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_notificacion_leida(request, notificacion_id):
    try:
        noti = Notificacion.objects.get(id=notificacion_id, usuario=request.user)
        noti.leida = True
        noti.save()
        return Response({"mensaje": "Notificación marcada como leída"})
    except Notificacion.DoesNotExist:
        return Response({"error": "No se encontró la notificación"}, status=404)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_notificacion(request, pk):
    noti = get_object_or_404(Notificacion, pk=pk, usuario=request.user)
    noti.delete()
    return Response({"detail": "Notificación eliminada"})


@api_view(["POST"])
def resend_verification_email(request):
    email = request.data.get("email")
    if not email:
        return Response({"detail": "Email requerido"}, status=400)

    try:
        user = Usuario.objects.get(email=email)
        if user.is_active:
            return Response({"detail": "El usuario ya está activado."}, status=400)

        if user.last_verification_sent and timezone.now() - user.last_verification_sent < timedelta(minutes=5):
            return Response({"detail": "Ya se ha enviado un correo recientemente. Inténtalo en unos minutos."}, status=429)

        send_verification_email(user)
        user.last_verification_sent = timezone.now()
        user.save(update_fields=["last_verification_sent"])
        return Response({"detail": "Correo de verificación reenviado."})

    except Usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado."}, status=404)


from .models import PushToken, Notificacion

import requests

EXPO_URL = "https://exp.host/--/api/v2/push/send"

def enviar_notificacion_push(titulo, cuerpo, usuarios=None, tipo=None):
    qs = PushToken.objects.filter(user__in=usuarios) if usuarios else PushToken.objects.all()
    tokens = qs.values_list("token", flat=True)

    mensajes = [{
        "to": token,
        "sound": "default",
        "title": titulo,
        "body": cuerpo
    } for token in tokens]

    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    for mensaje in mensajes:
        try:
            requests.post(EXPO_URL, json=mensaje, headers=headers)
        except Exception as e:
            print(f"❌ Error enviando push: {e}")

    usuarios_target = usuarios if usuarios else [t.user for t in qs]
    for user in usuarios_target:
        # ❗ Evita duplicados recientes con mismo tipo + título + cuerpo
        if Notificacion.objects.filter(
            usuario=user,
            titulo=titulo,
            cuerpo=cuerpo,
            tipo=tipo
        ).exists():
            continue  # ya existe la notificación

        Notificacion.objects.create(
            usuario=user,
            titulo=titulo,
            cuerpo=cuerpo,
            tipo=tipo
        )