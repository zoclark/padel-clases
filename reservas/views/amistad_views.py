from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models

from ..models import Amistad, Usuario, Notificacion
from ..serializers import AmistadSerializer
from .notificacion_views import enviar_notificacion_push

from rest_framework.permissions import IsAuthenticated, AllowAny 

class EnviarSolicitudAmistadView(generics.CreateAPIView):
    serializer_class = AmistadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        receptor_username = request.data.get("a_usuario")
        if not receptor_username:
            return Response({"detail": "Debes indicar a qué usuario enviar la solicitud."}, status=400)

        receptor = get_object_or_404(Usuario, username=receptor_username)

        if receptor == request.user:
            return Response({"detail": "No puedes enviarte una solicitud a ti mismo."}, status=400)

        if Amistad.objects.filter(de_usuario=request.user, a_usuario=receptor).exists():
            return Response({"detail": "Ya has enviado una solicitud."}, status=400)

        amistad = Amistad.objects.create(de_usuario=request.user, a_usuario=receptor)
        Notificacion.objects.create(
            usuario=receptor,
            titulo="Nueva solicitud de amistad",
            cuerpo=f"{request.user.username} quiere agregarte como amigo",
            tipo="amistad",
            extra={"solicitud_id": amistad.id}
        )
        enviar_notificacion_push(
            titulo="Solicitud de amistad",
            cuerpo=f"{request.user.username} quiere agregarte como amigo",
            usuarios=[receptor]
        )
        return Response({"detail": "Solicitud enviada correctamente."}, status=201)


class GestionarSolicitudAmistadView(generics.UpdateAPIView):
    serializer_class = AmistadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        solicitud = get_object_or_404(
            Amistad, id=kwargs["pk"], a_usuario=request.user, estado="pendiente"
        )
        accion = request.data.get("accion")
        if accion == "aceptar":
            solicitud.estado = "aceptada"
            solicitud.save()
            return Response({"detail": "Solicitud aceptada."})
        elif accion == "rechazar":
            solicitud.delete()
            return Response({"detail": "Solicitud rechazada."})
        return Response({"detail": "Acción inválida. Usa 'aceptar' o 'rechazar'."}, status=400)


class ListaAmigosView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        usuario = request.user
        amistades = Amistad.objects.filter(
            estado="aceptada"
        ).filter(
            models.Q(de_usuario=usuario) | models.Q(a_usuario=usuario)
        )

        resultado = []
        for amistad in amistades:
            amigo = amistad.a_usuario if amistad.de_usuario == usuario else amistad.de_usuario
            resultado.append({
                "id": amistad.id,
                "amigo": {
                    "id": amigo.id,
                    "username": amigo.username,
                    "email": amigo.email,
                    "foto": amigo.foto_perfil.url if amigo.foto_perfil else None,
                }
            })

        return Response(resultado)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def eliminar_amistad(request, pk):
    usuario = request.user
    try:
        amistad = Amistad.objects.get(pk=pk)
        if amistad.de_usuario != usuario and amistad.a_usuario != usuario:
            return Response({"detail": "No autorizado."}, status=403)
        amistad.delete()
        return Response({"detail": "Amistad eliminada."}, status=204)
    except Amistad.DoesNotExist:
        return Response({"detail": "Amistad no encontrada."}, status=404)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def bloquear_usuario(request, usuario_id):
    usuario = request.user
    try:
        amistad = Amistad.objects.get(
            models.Q(de_usuario=usuario, a_usuario_id=usuario_id) |
            models.Q(de_usuario_id=usuario_id, a_usuario=usuario)
        )
        amistad.estado = "bloqueada"
        amistad.save()
    except Amistad.DoesNotExist:
        Amistad.objects.create(
            de_usuario=usuario,
            a_usuario_id=usuario_id,
            estado="bloqueada"
        )
    return Response({"detail": "Usuario bloqueado correctamente."})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def listar_bloqueados(request):
    bloqueos = Amistad.objects.filter(de_usuario=request.user, estado="bloqueada")
    data = [
        {
            "id": b.id,
            "username": b.a_usuario.username,
            "email": b.a_usuario.email
        }
        for b in bloqueos
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def desbloquear_usuario(request, usuario_id):
    try:
        amistad = Amistad.objects.get(
            de_usuario=request.user,
            a_usuario_id=usuario_id,
            estado="bloqueada"
        )
        amistad.delete()
        return Response({"detail": "Usuario desbloqueado correctamente."})
    except Amistad.DoesNotExist:
        return Response({"detail": "No tienes bloqueado a este usuario."}, status=404)

# En amistad_views.py (añadir esta vista)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def solicitudes_recibidas(request):
    solicitudes = Amistad.objects.filter(a_usuario=request.user, estado="pendiente")
    data = [
    {
        "id": a.id,
        "de_usuario_id": a.de_usuario.id,
        "username": a.de_usuario.username,
        "foto": a.de_usuario.foto_perfil.url if a.de_usuario.foto_perfil else None,
    }
        for a in solicitudes
    ]
    return Response(data)