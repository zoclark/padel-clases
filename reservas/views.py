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
    # Solo permitimos acceso si el usuario tiene rol "alumno"
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
    # Generar datos aleatorios si no existen (modo demo o prueba)
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



from django.views.generic import View
from django.http import HttpResponse
from django.conf import settings
import os

class FrontendAppView(View):
    def get(self, request):
        try:
            with open(os.path.join(settings.STATIC_ROOT, "index.html")) as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            return HttpResponse(
                "index.html not found! Build your frontend first.", status=501
            )