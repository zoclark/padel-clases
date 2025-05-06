from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
import os
from django.db import models

from ..models import (
    Usuario, AlumnoPerfil, AlumnoPerfilEvolucion,
    Amistad, Notificacion, PushToken
)
from ..serializers import (
    AlumnoPerfilSerializer, AlumnoPerfilEvolucionSerializer
)
from ..utils_stats import (
    validate_stats, get_pool_for_level, get_stats_list
)
from ..pagination import UsuarioPagination
from ..utils_email import send_verification_email


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    usuario = request.user
    perfil, _ = AlumnoPerfil.objects.get_or_create(usuario=usuario)
    data = {
        "id": usuario.id,
        "username": usuario.username,
        "email": usuario.email,
        "first_name": usuario.first_name,
        "last_name": usuario.last_name,
        "rol": usuario.rol,
        "genero": usuario.genero,
        "onboarding_completado": usuario.onboarding_completado
    }
    data.update(AlumnoPerfilSerializer(perfil).data)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_evolucion_stats(request):
    perfil = AlumnoPerfil.objects.get(usuario=request.user)
    evoluciones = perfil.evoluciones.order_by("-fecha")
    serializer = AlumnoPerfilEvolucionSerializer(evoluciones, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guardar_evolucion_stats(request):
    perfil = get_object_or_404(AlumnoPerfil, usuario=request.user)
    stats = request.data.get("stats") or perfil.to_stats_dict()
    evolucion = AlumnoPerfilEvolucion.objects.create(perfil=perfil, stats=stats)
    serializer = AlumnoPerfilEvolucionSerializer(evolucion)
    return Response(serializer.data, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def onboarding_perfil_alumno(request):
    nivel = float(request.data.get("nivel", 0))
    stats = {stat: int(request.data.get(stat, 0)) for stat in get_stats_list()}
    alertas = validate_stats(nivel, stats)
    if alertas:
        return Response({"alertas": alertas}, status=400)

    perfil, _ = AlumnoPerfil.objects.get_or_create(usuario=request.user)
    for stat, valor in stats.items():
        setattr(perfil, stat, valor)
    perfil.nivel = nivel
    perfil.save()

    AlumnoPerfilEvolucion.objects.create(perfil=perfil, stats=stats)

    serializer = AlumnoPerfilSerializer(perfil)
    return Response({
        "mensaje": "Perfil creado/actualizado correctamente",
        "perfil": serializer.data,
        "pool_usado": sum(stats.values()),
        "pool_max": get_pool_for_level(nivel)
    }, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def completar_onboarding(request):
    request.user.onboarding_completado = True
    request.user.save()
    return Response({"onboarding_completado": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def actualizar_foto_perfil(request):
    usuario = request.user
    foto = request.FILES.get("foto")

    if not foto:
        return Response({"error": "No se ha enviado ninguna imagen."}, status=400)
    if foto.size > 2 * 1024 * 1024:
        return Response({"error": "La imagen no puede superar los 2MB."}, status=400)
    if foto.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        return Response({"error": "Formato de imagen no permitido."}, status=400)

    usuario.foto_perfil = foto
    usuario.save()

    return Response({
        "mensaje": "Foto de perfil actualizada correctamente.",
        "foto_url": request.build_absolute_uri(usuario.foto_perfil.url)
    }, status=200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_foto_perfil(request):
    usuario = request.user
    if not usuario.foto_perfil:
        return Response({"mensaje": "No hay ninguna foto de perfil que eliminar."})

    ruta_archivo = usuario.foto_perfil.path
    usuario.foto_perfil.delete(save=False)
    usuario.save()

    try:
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)
    except Exception as e:
        print(f"⚠️ Error al eliminar archivo: {e}")

    return Response({"mensaje": "Foto de perfil eliminada correctamente."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ver_perfil_usuario(request, usuario_id):
    actual = request.user
    objetivo = get_object_or_404(Usuario, id=usuario_id)

    if actual != objetivo:
        bloqueado = Amistad.objects.filter(
            models.Q(de_usuario=actual, a_usuario=objetivo, estado="bloqueada") |
            models.Q(de_usuario=objetivo, a_usuario=actual, estado="bloqueada")
        ).exists()
        if bloqueado:
            return Response({"detail": "Acceso denegado. Usuario bloqueado."}, status=403)

        if objetivo.perfil_privado:
            amistad = Amistad.objects.filter(
                models.Q(de_usuario=actual, a_usuario=objetivo) |
                models.Q(de_usuario=objetivo, a_usuario=actual),
                estado="aceptada"
            ).exists()
            if not amistad:
                return Response({"detail": "Este perfil es privado."}, status=403)

    perfil = get_object_or_404(AlumnoPerfil, usuario=objetivo)
    serializer = AlumnoPerfilSerializer(perfil)
    return Response({
        "id": objetivo.id,
        "username": objetivo.username,
        "email": objetivo.email,
        "rol": objetivo.rol,
        "genero": objetivo.genero,
        "perfil_privado": objetivo.perfil_privado,
        "foto_perfil": objetivo.foto_perfil.url if objetivo.foto_perfil else None,
        "nivel": getattr(perfil, "nivel", 0),
        "perfil": serializer.data
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_usuarios(request):
    q = request.query_params.get("q", "").strip().lower()
    usuario_actual = request.user
    paginador = UsuarioPagination()

    bloqueados_ids = set(
        Amistad.objects.filter(de_usuario=usuario_actual, estado="bloqueada")
        .values_list("a_usuario_id", flat=True)
    )

    amistades = Amistad.objects.filter(
        models.Q(de_usuario=usuario_actual) | models.Q(a_usuario=usuario_actual),
        estado__in=["aceptada", "pendiente", "bloqueada"]
    )

    estado_por_id = {}
    solicitudes_enviadas_ids = set()
    for a in amistades:
        otro = a.a_usuario if a.de_usuario == usuario_actual else a.de_usuario
        estado = (
            a.estado if a.estado != "pendiente" or a.de_usuario == usuario_actual else "recibida"
        )
        estado_por_id[otro.id] = estado
        if a.estado == "pendiente" and a.de_usuario == usuario_actual:
            solicitudes_enviadas_ids.add(otro.id)

    usuarios = Usuario.objects.exclude(id=usuario_actual.id)
    if q:
        usuarios = usuarios.filter(username__icontains=q)

    page = paginador.paginate_queryset(usuarios, request)
    perfiles = AlumnoPerfil.objects.filter(usuario__in=page)
    perfiles_por_id = {p.usuario_id: p for p in perfiles}

    data = []
    for u in page:
        perfil = perfiles_por_id.get(u.id)
        estado = estado_por_id.get(u.id)
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "foto": u.foto_perfil.url if u.foto_perfil else None,
            "nivel": perfil.nivel if perfil else None,
            "esAmigo": estado == "aceptada",
            "solicitudEnviada": u.id in solicitudes_enviadas_ids,
            "estaBloqueado": estado == "bloqueada",
            "perfil_privado": u.perfil_privado,
            "estado": estado
        })

    return paginador.get_paginated_response({"resultados": data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guardar_push_token(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token requerido"}, status=400)
    PushToken.objects.update_or_create(user=request.user, defaults={"token": token})
    return Response({"mensaje": "Token guardado correctamente"})
