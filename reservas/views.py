from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import random
from datetime import timedelta, date
from .models import (
    Usuario, AlumnoPerfil, TrainingSession, RecursoAlumno,
    Reserva, Pozo, ParticipantePozo, Afinidad, JugadorPozo
)
from .serializers import (
    AlumnoPerfilSerializer, TrainingSessionSerializer, RecursoAlumnoSerializer,
    ReservaSerializer, PozoSerializer, ParticipantePozoSerializer,
    AfinidadSerializer
)

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
            rol="alumno"
        )
        print("✅ Usuario creado desde API:", usuario.username)
        return Response({"mensaje": f"Usuario '{usuario.username}' creado correctamente"}, status=201)

    except Exception as e:
        print("❌ Error en el registro:", e)
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    data = {
        "username": request.user.username,
        "rol": request.user.rol,
    }
    if request.user.rol == "alumno":
        try:
            perfil = AlumnoPerfil.objects.get(usuario=request.user)
            data.update(AlumnoPerfilSerializer(perfil).data)
        except AlumnoPerfil.DoesNotExist:
            data["error"] = "Perfil de alumno no encontrado"
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
                details=random.choice([
                    "Sesión táctica", "Entrenamiento físico", "Juego con pareja",
                    "Defensa en pista", "Remates y voleas"
                ]),
                teacher_comment=random.choice([
                    "Buena actitud", "Debe mejorar el control",
                    "Excelente avance esta semana", None
                ]),
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

# ================= FRONTENDAPPVIEW ====================
from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os, traceback

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true", "1", "yes")
        if is_debug and settings.STATICFILES_DIRS:
            index_path = os.path.join(settings.STATICFILES_DIRS[0], "index.html")
        else:
            index_path = os.path.join(settings.STATIC_ROOT, "index.html")
        print(f"📄 Sirviendo index desde: {index_path}")
        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            print(f"❌ index.html no encontrado en {index_path}")
            return HttpResponseServerError(f"❌ index.html no encontrado<br>Esperado en: {index_path}")
        except Exception as e:
            print("❌ Error inesperado al cargar index.html:", e)
            traceback.print_exc()
            return HttpResponseServerError(f"❌ Error cargando index.html:<br>{e}")

# =================== POZOS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_pozos(request):
    pozos = Pozo.objects.all()
    serializer = PozoSerializer(pozos, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pozo(request):
    serializer = PozoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
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
def agregar_participante(request):
    serializer = ParticipantePozoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
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
