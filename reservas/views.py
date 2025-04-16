from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import random
from datetime import timedelta, date
from .models import Usuario
from .models import AlumnoPerfil
from .serializers import AlumnoPerfilSerializer
from .models import TrainingSession
from .serializers import TrainingSessionSerializer
from .models import TrainingSession
from .serializers import TrainingSessionSerializer
from .models import RecursoAlumno
from .serializers import RecursoAlumnoSerializer
from .models import Reserva
from .serializers import ReservaSerializer


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
def perfil_alumno(request):
    if request.user.rol != "alumno":
        return Response({"error": "Solo disponible para usuarios alumnos"}, status=403)

    try:
        perfil = AlumnoPerfil.objects.get(usuario=request.user)
        serializer = AlumnoPerfilSerializer(perfil)
        return Response(serializer.data)
    except AlumnoPerfil.DoesNotExist:
        return Response({"error": "Perfil no encontrado"}, status=404)

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
                    "Sesión táctica", "Entrenamiento físico", "Juego con pareja", "Defensa en pista", "Remates y voleas"
                ]),
                teacher_comment=random.choice([
                    "Buena actitud", "Debe mejorar el control", "Excelente avance esta semana", None
                ]),
                session_type=random.choice(["individual", "grupo", "dúo"]),
            )

    sesiones = TrainingSession.objects.filter(alumno=alumno).order_by("-date")
    serializer = TrainingSessionSerializer(sesiones, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recursos_alumno(request):
    try:
        recursos = RecursoAlumno.objects.filter(alumno=request.user)
        serializer = RecursoAlumnoSerializer(recursos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obtener_reservas(request):
    # Filtra las reservas de acuerdo al usuario autenticado (request.user)
    reservas = Reserva.objects.filter(alumno=request.user)

    # Serializa las reservas
    serializer = ReservaSerializer(reservas, many=True)

    # Retorna las reservas en la respuesta
    return Response(serializer.data)







# ========================
# FRONTENDAPPVIEW CORREGIDO
# ========================
from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os
import traceback


from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os

from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
import os
from django.conf import settings

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        # Leer el valor DEBUG (True en local, False en producción)
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true", "1", "yes")

        # Determinar ruta del index.html
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
        


