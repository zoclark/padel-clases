# reservas/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny 
import random
from datetime import timedelta, date
import pandas as pd
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator
# utils DRF / Django
from rest_framework.parsers import MultiPartParser
from django.shortcuts import get_object_or_404 

from .pagination import UsuarioPagination

from .models import (
    Usuario, AlumnoPerfil, TrainingSession, RecursoAlumno,
    Reserva, Pozo, ParticipantePozo, Afinidad, JugadorPozo, AlumnoPerfilEvolucion
)
from .serializers import (
    AlumnoPerfilSerializer, TrainingSessionSerializer, RecursoAlumnoSerializer,
    ReservaSerializer, PozoSerializer, ParticipantePozoSerializer,
    AfinidadSerializer, UsuarioPerfilSerializer, AlumnoPerfilEvolucionSerializer
)
from .utils_stats import validate_stats, get_pool_for_level, get_level_ranges, get_stats_list
from reservas.utils_email import send_verification_email
# --- Import del módulo de emparejamientos ---
from .pairings import generar_emparejamientos


# ================= REGISTRO Y PERFIL ===================

@api_view(["POST"])
def registro_usuario(request):
    datos = request.data
    try:
        if Usuario.objects.filter(username=datos.get("username")).exists():
            return Response({"error": "Usuario ya existe"}, status=400)
        
        usuario = Usuario.objects.create_user(
            username=datos["username"],
            email=datos["email"],
            password=datos["password"],
            rol=datos.get("rol", "alumno"),
            is_active=False
        )

        # 👉 Crear perfil para cualquier rol
        AlumnoPerfil.objects.get_or_create(usuario=usuario)

        send_verification_email(usuario, datos.get("origen", "web"))
        print("✅ Usuario creado desde API:", usuario.username)
        return Response({
            "mensaje": f"Usuario '{usuario.username}' creado correctamente",
            "email": usuario.email
        }, status=201)

    except Exception as e:
        print("❌ Error en el registro:", e)
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    usuario = request.user

    # Asegurar que siempre haya perfil
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




# ================ ENTRENAMIENTOS =======================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_entrenamientos(request):
    alumno = request.user
    if not TrainingSession.objects.filter(alumno=alumno).exists():
        for i in range(10):
            TrainingSession.objects.create(
                alumno=alumno,
                date=date.today() - timedelta(days=i * 7),
                details=random.choice([...]),
                teacher_comment=random.choice([...]),
                session_type=random.choice(["individual", "grupo", "dúo"]),
            )
    sesiones = TrainingSession.objects.filter(alumno=alumno).order_by("-date")
    serializer = TrainingSessionSerializer(sesiones, many=True)
    return Response(serializer.data)


# ================ RECURSOS PERSONALIZADOS =============
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recursos_alumno(request):
    try:
        recursos = RecursoAlumno.objects.filter(alumno=request.user)
        serializer = RecursoAlumnoSerializer(recursos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ================ RESERVAS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obtener_reservas(request):
    reservas = Reserva.objects.filter(alumno=request.user)
    serializer = ReservaSerializer(reservas, many=True)
    return Response(serializer.data)


# ================ FRONTENDAPPVIEW ====================
from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os, traceback

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true","1","yes")
        if is_debug and settings.STATICFILES_DIRS:
            index_path = os.path.join(settings.STATICFILES_DIRS[0],"index.html")
        else:
            index_path = os.path.join(settings.STATIC_ROOT,"index.html")
        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except Exception as e:
            return HttpResponseServerError(f"❌ Error cargando index.html:<br>{e}")


# =================== POZOS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_pozos(request):
    pozos = Pozo.objects.prefetch_related("participantes").all().order_by("fecha", "hora_inicio")

    data = []
    for pozo in pozos:
        participantes = [
            {
                "id": p.id,
                "usuario_id": p.usuario.id if p.usuario else None,
                "nombre": p.nombre,
                "es_organizador": p.es_organizador,    # <<< aquí
            }
            for p in pozo.participantes.all()
        ]

        data.append({
            "id": pozo.id,
            "titulo": pozo.titulo,
            "fecha": pozo.fecha,
            "hora_inicio": pozo.hora_inicio.strftime("%H:%M"),
            "hora_fin": pozo.hora_fin.strftime("%H:%M"),
            "tipo": pozo.tipo,
            "num_pistas": pozo.num_pistas,
            "participantes": participantes,
        })

    return Response(data)

# --- Tu vista actualizada ---
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pozo(request):
    serializer = PozoSerializer(data=request.data)
    if serializer.is_valid():
        pozo = serializer.save(creado_por=request.user)

        # 👉 Enviar notificación a todos los usuarios
        titulo = "¡Nuevo pozo disponible!"
        cuerpo = f"{pozo.titulo} a las {pozo.hora_inicio.strftime('%H:%M')}"
        enviar_notificacion_push(titulo, cuerpo)

        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def participantes_pozo(request, pozo_id):
    participantes = ParticipantePozo.objects.filter(pozo_id=pozo_id)
    serializer = ParticipantePozoSerializer(participantes, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def emparejamiento_pozo(request, pozo_id):
    """
    POST: genera emparejamientos para el pozo
    """
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error":"Pozo no encontrado"}, status=404)

    qs = ParticipantePozo.objects.filter(pozo=pozo).prefetch_related(
        'juega_con','juega_contra','no_juega_con','no_juega_contra'
    )
    jugadores = []
    for p in qs:
        jugadores.append({
            "id": p.id,
            "nombre": p.nombre,
            "nivel": float(p.nivel),
            "genero": p.genero,
            "mano_dominante": p.mano_dominante,
            "posicion": p.posicion,
            "pista_fija": p.pista_fija,
            "juega_con":    [c.id for c in p.juega_con.all()],
            "juega_contra": [c.id for c in p.juega_contra.all()],
            "no_juega_con":    [c.id for c in p.no_juega_con.all()],
            "no_juega_contra": [c.id for c in p.no_juega_contra.all()],
        })

     # Llamar a la función y obtener el diccionario completo
    resultado_emparejamiento = generar_emparejamientos(
        jugadores,
        pozo.num_pistas,
        pozo.tipo
    )

    # Devolver el diccionario completo como respuesta JSON
    return Response(resultado_emparejamiento, status=status.HTTP_200_OK)
    # --- FIN CAMBIO CLAVE ---


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def agregar_participante(request):
    data = request.data.copy()

    # Protección reforzada
    if request.user.rol == "alumno":
        data["usuario"] = request.user.id
    else:
        # Si no es alumno (es organizador), validamos manualmente
        usuario_payload = data.get("usuario")
        if usuario_payload is not None:
            if str(usuario_payload) == str(request.user.id):
                data["usuario"] = request.user.id
            else:
                return Response({"error": "No tienes permiso para inscribir a otro usuario."}, status=403)
        else:
            data["usuario"] = None  # jugador externo sin cuenta

    # Normalización
    for campo in ("nombre", "genero", "mano_dominante"):
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].strip().lower()
    if "nivel" in data:
        try:
            data["nivel"] = int(float(data["nivel"]))
        except:
            pass
    if "posicion" in data:
        clave = data["posicion"].strip().lower()
        data["posicion"] = {"reves": "reves", "drive": "drive", "ambos": "ambos"}.get(clave, "ambos")
    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf > 0 else None
        except:
            data["pista_fija"] = None

    for rel in ("juega_con", "juega_contra", "no_juega_con", "no_juega_contra"):
        if rel in data:
            try:
                data[rel] = int(data[rel])
            except:
                data.pop(rel, None)

    if data.get("usuario"):
        ya_existe = ParticipantePozo.objects.filter(pozo=data["pozo"], usuario=data["usuario"]).exists()
        if ya_existe:
            return Response({"error": "Ya estás inscrito en este pozo."}, status=400)

    es_organizador = request.user.rol == "organizador" and data.get("usuario") == request.user.id

    serializer = ParticipantePozoSerializer(data=data)
    if serializer.is_valid():
        participante = serializer.save(es_organizador=es_organizador)

        for campo_m2m in ("juega_con", "juega_contra", "no_juega_con", "no_juega_contra"):
            if data.get(campo_m2m):
                getattr(participante, campo_m2m).set(data[campo_m2m])

        JugadorPozo.objects.create(
            pozo=participante.pozo,
            nombre=participante.nombre,
            nivel=int(participante.nivel),
            registrado=bool(participante.usuario)
        )
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def afinidades_usuario(request, usuario_id):
    afinidades = Afinidad.objects.filter(participante__usuario_id=usuario_id)
    serializer = AfinidadSerializer(afinidades, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_afinidad(request):
    serializer = AfinidadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def actualizar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error":"Participante no encontrado"}, status=404)

    data = request.data.copy()
    data.pop("pozo", None)  # no permitimos cambiar el pozo

    # normaliza texto e ints
    for campo in ("nombre","genero","mano_dominante"):
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].strip().lower()
    if "nivel" in data:
        try:
            data["nivel"] = int(float(data["nivel"]))
        except:
            pass
    if "posicion" in data:
        mp = {"reves":"reves","drive":"drive","ambos":"ambos"}
        data["posicion"] = mp.get(data["posicion"].strip().lower(), data["posicion"])
    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf>0 else None
        except:
            data["pista_fija"] = None

    serializer = ParticipantePozoSerializer(participante, data=data, partial=True)
    if serializer.is_valid():
        participante = serializer.save()

        # ahora sí seteamos las relaciones M2M
        if "juega_con" in data:
            participante.juega_con.set(data["juega_con"])
        if "juega_contra" in data:
            participante.juega_contra.set(data["juega_contra"])
        if "no_juega_con" in data:
            participante.no_juega_con.set(data["no_juega_con"])
        if "no_juega_contra" in data:
            participante.no_juega_contra.set(data["no_juega_contra"])

        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error": "Participante no encontrado"}, status=404)

    # Protección contra borrado del organizador apuntado a sí mismo
    if participante.es_organizador:
        return Response({"error": "No se puede eliminar al organizador inscrito."}, status=403)

    participante.delete()
    return Response({"mensaje": "Participante eliminado"}, status=204)

@api_view(["GET","PUT","PATCH"])
@permission_classes([IsAuthenticated])
def detalle_pozo(request, pozo_id):
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error":"Pozo no encontrado"}, status=404)

    if request.method=="GET":
        return Response(PozoSerializer(pozo).data)

    partial = (request.method=="PATCH")
    serializer = PozoSerializer(pozo, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["POST"]) 
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def importar_participantes_excel(request, pozo_id):
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error": "Pozo no encontrado"}, status=404)

    file = request.FILES.get("file")
    if not file:
        return Response({"error": "Fichero no recibido"}, status=400)

    try:
        df = pd.read_excel(file)
        df.columns = [c.lower() for c in df.columns]
    except Exception as e:
        return Response({"error": f"Error leyendo Excel: {e}"}, status=400)

    expected = {"nombre", "nivel", "genero", "posicion", "mano_dominante", "pista_fija"}
    if not expected.issubset(set(df.columns)):
        return Response({"error": f"Columnas requeridas: {', '.join(expected)}"}, status=400)

    capacidad = pozo.num_pistas * 4
    existentes = {p.nombre.lower(): p for p in ParticipantePozo.objects.filter(pozo=pozo)}
    nuevos = []
    errores = []

    for index, row in df.iterrows():
        try:
            nombre = str(row["nombre"]).strip().lower()
            genero = str(row["genero"]).strip().lower()
            posicion = str(row["posicion"]).strip().lower()
            mano = str(row["mano_dominante"]).strip().lower()
            pista_fija = row.get("pista_fija")
            pista_fija = int(pista_fija) if pd.notnull(pista_fija) else None
            nivel = int(row.get("nivel") or 0)

            genero = genero if genero in ["hombre", "mujer"] else "hombre"
            posicion = posicion if posicion in ["reves", "drive", "ambos"] else "ambos"
            mano = mano if mano in ["diestro", "zurdo"] else "diestro"

            datos = dict(
                pozo=pozo,
                nombre=nombre,
                genero=genero,
                posicion=posicion,
                mano_dominante=mano,
                pista_fija=pista_fija,
                nivel=nivel,
            )

            p_exist = existentes.get(nombre)
            if p_exist:
                for k, v in datos.items():
                    setattr(p_exist, k, v)
                p_exist.save()
            else:
                nuevos.append(datos)

        except Exception as e:
            errores.append(f"Fila {index + 2} ('{row.get('nombre', '')}'): {e}")

    if len(existentes) + len(nuevos) > capacidad:
        return Response({"error": f"Excede capacidad del pozo ({capacidad})"}, status=400)

    ParticipantePozo.objects.bulk_create([ParticipantePozo(**d) for d in nuevos])
    participantes = ParticipantePozo.objects.filter(pozo=pozo)
    serializer = ParticipantePozoSerializer(participantes, many=True)

    return Response({"datos": serializer.data, "errores": errores}, status=207 if errores else 201)


# ================= PERFIL / EVOLUCIÓN ====================
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
    try:
        perfil = AlumnoPerfil.objects.get(usuario=request.user)
    except AlumnoPerfil.DoesNotExist:
        return Response({"error": "Perfil de alumno no encontrado"}, status=404)

    stats = request.data.get("stats")
    if not stats:
        stats = perfil.to_stats_dict()

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

    perfil, creado = AlumnoPerfil.objects.get_or_create(usuario=request.user)
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
    usuario = request.user
    usuario.onboarding_completado = True
    usuario.save()
    return Response({"onboarding_completado": True})




import requests

EXPO_URL = "https://exp.host/--/api/v2/push/send"

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guardar_push_token(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token requerido"}, status=400)
    PushToken.objects.update_or_create(user=request.user, defaults={"token": token})
    return Response({"mensaje": "Token guardado correctamente"})


from .models import PushToken, Notificacion


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

from django.utils import timezone
from datetime import timedelta

@api_view(["POST"])
def resend_verification_email(request):
    email = request.data.get("email")
    if not email:
        return Response({"detail": "Email requerido"}, status=400)
    
    try:
        user = Usuario.objects.get(email=email)
        if user.is_active:
            return Response({"detail": "El usuario ya está activado."}, status=400)

        # ✅ ANTI-SPAM: máximo una vez cada 5 minutos
        if user.last_verification_sent and timezone.now() - user.last_verification_sent < timedelta(minutes=5):
            return Response({"detail": "Ya se ha enviado un correo recientemente. Inténtalo en unos minutos."}, status=429)

        send_verification_email(user)
        user.last_verification_sent = timezone.now()
        user.save(update_fields=["last_verification_sent"])
        return Response({"detail": "Correo de verificación reenviado."})
    
    except Usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado."}, status=404)
# ───────────────────────────────────────────────────────────
#  VISTA PÚBLICA  estado_verificacion
# ───────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def estado_verificacion(request):
    """
    GET /estado-verificacion/?email=foo@bar.com
    Devuelve siempre 200 con {"is_verified": true|false}.
    """
    email = request.query_params.get('email')
    if not email:
        return Response({"detail": "Se requiere el parámetro email"}, status=400)

    e = email.strip().lower()
    # Búsqueda case-insensitive; si no lo encuentra, user será None
    user = Usuario.objects.filter(email__iexact=e).first()
    # is_verified es un alias de is_active en el modelo
    return Response({"is_verified": bool(user and user.is_active)})



# en views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Amistad, Usuario
from .serializers import AmistadSerializer
from django.shortcuts import get_object_or_404
from django.db import models

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
        # Crear notificación persistente
        Notificacion.objects.create(
            usuario=receptor,
            titulo="Nueva solicitud de amistad",
            cuerpo=f"{request.user.username} quiere agregarte como amigo",
            tipo="amistad",
            extra={"solicitud_id": amistad.id}  # ✅ AÑADIDO
        )

        # Enviar notificación push al móvil
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
    serializer_class = AmistadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        return Amistad.objects.filter(
            estado="aceptada"
        ).filter(models.Q(de_usuario=usuario) | models.Q(a_usuario=usuario))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
    



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_notificaciones(request):
    notis = request.user.notificaciones.order_by("-fecha")[:50]
    data = [
    {
        "id": n.id,
        "titulo": n.titulo,
        "cuerpo": n.cuerpo,
        "tipo": n.tipo,
        "fecha": n.fecha,
        "leida": n.leida,
        "extra": n.extra  # ✅ MOSTRAR CAMPO EXTRA
    }
    for n in notis
]
    return Response(data)


from .pagination import UsuarioPagination
from .serializers import AlumnoPerfilSerializer

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
    solicitudes_enviadas_ids = set()  # ✅ NUEVO
    for a in amistades:
        otro = a.a_usuario if a.de_usuario == usuario_actual else a.de_usuario
        estado = (
            a.estado if a.estado != "pendiente" or a.de_usuario == usuario_actual else "recibida"
        )
        estado_por_id[otro.id] = estado

        # ✅ Si es solicitud pendiente Y yo la envié
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
            "estado": estado  # ✅ Añadido campo estado explícitamente
        })

    # Sugerencias
    sugerencias_lista = list(
        Usuario.objects.exclude(id=usuario_actual.id).order_by("?")[:5]
    )
    perfiles_sug = AlumnoPerfil.objects.filter(usuario__in=sugerencias_lista)
    perfiles_sug_por_id = {p.usuario_id: p for p in perfiles_sug}

    sugerencias_data = []
    for u in sugerencias_lista:
        perfil = perfiles_sug_por_id.get(u.id)
        sugerencias_data.append({
            "id": u.id,
            "username": u.username,
            "foto": perfil.usuario.foto_perfil.url if perfil and perfil.usuario.foto_perfil else None,
            "nivel": perfil.nivel if perfil else None
        })

    return paginador.get_paginated_response({
        "resultados": data,
        "sugerencias": sugerencias_data
    })



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ver_perfil_usuario(request, usuario_id):
    actual = request.user
    objetivo = get_object_or_404(Usuario, id=usuario_id)

    if actual.id == objetivo.id:
        # Puedes ver tu propio perfil
        pass
    else:
        # Comprobación de bloqueos
        bloqueado = Amistad.objects.filter(
            models.Q(de_usuario=actual, a_usuario=objetivo, estado="bloqueada") |
            models.Q(de_usuario=objetivo, a_usuario=actual, estado="bloqueada")
        ).exists()
        if bloqueado:
            return Response({"detail": "Acceso denegado. Usuario bloqueado."}, status=403)

        # Comprobación de privacidad
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



from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def actualizar_foto_perfil(request):
    usuario = request.user
    foto = request.FILES.get("foto")

    if not foto:
        return Response({"error": "No se ha enviado ninguna imagen."}, status=400)

    # ✅ Validación de tamaño máximo (2 MB)
    if foto.size > 2 * 1024 * 1024:
        return Response({"error": "La imagen no puede superar los 2MB."}, status=400)

    # ✅ Validación de tipo MIME seguro
    if foto.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        return Response({"error": "Formato de imagen no permitido."}, status=400)

    usuario.foto_perfil = foto
    usuario.save()

    return Response({
        "mensaje": "Foto de perfil actualizada correctamente.",
        "foto_url": request.build_absolute_uri(usuario.foto_perfil.url)
    }, status=200)


from django.conf import settings

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_foto_perfil(request):
    usuario = request.user

    if not usuario.foto_perfil:
        return Response({"mensaje": "No hay ninguna foto de perfil que eliminar."}, status=200)

    # Ruta del archivo actual (por si quieres borrarlo físicamente)
    ruta_archivo = usuario.foto_perfil.path

    # Elimina la referencia en el modelo
    usuario.foto_perfil.delete(save=False)
    usuario.save()

    # Intenta eliminar el archivo físico si existe
    try:
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)
    except Exception as e:
        print(f"⚠️ Error al eliminar el archivo: {e}")

    return Response({"mensaje": "Foto de perfil eliminada correctamente."}, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_notificaciones_leidas(request):
    request.user.notificaciones.filter(leida=False).update(leida=True)
    return Response({"mensaje": "Notificaciones marcadas como leídas"})


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
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guardar_token_push(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Token no proporcionado'}, status=400)
    
    user = request.user
    user.push_token = token  # asume que tienes ese campo en tu modelo User
    user.save()
    return Response({'success': True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_notificacion(request, pk):
    noti = get_object_or_404(Notificacion, pk=pk, usuario=request.user)
    noti.delete()
    return Response({"detail": "Notificación eliminada"})