from rest_framework import status
from .models import Usuario

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import TrainingSession
from .serializers import TrainingSessionSerializer


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


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import AlumnoPerfilSerializer
from .models import AlumnoPerfil

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


import random
from datetime import timedelta, date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import TrainingSession
from .serializers import TrainingSessionSerializer

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
        # Obtener el valor de la variable de entorno 'DEBUG'
        debug_value = os.getenv("DEBUG", "False").lower()  # 'DEBUG' debería ser True o False en el .env
        
        # Verificar si estamos en modo debug o producción
        is_debug = debug_value in ("true", "1", "yes")  # Si DEBUG es True, estamos en desarrollo (local)
        
        # Dependiendo de si estamos en modo debug o no, asignamos la ruta correcta del archivo index.html
        if is_debug:
            # En local (modo desarrollo), usamos STATICFILES_DIRS
            index_path = os.path.join(settings.STATICFILES_DIRS[0], "index.html")
        else:
            # En producción, usamos STATIC_ROOT
            index_path = os.path.join(settings.STATIC_ROOT, "index.html")
        
        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            return HttpResponseServerError(f"❌ index.html not found<br>Expected at: {index_path}")
        except Exception as e:
            return HttpResponseServerError(f"❌ Error loading index.html:<br>{e}")