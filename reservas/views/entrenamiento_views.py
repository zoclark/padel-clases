from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta, date
import random

from ..models import TrainingSession, AlumnoPerfil, AlumnoPerfilEvolucion
from ..serializers import TrainingSessionSerializer, AlumnoPerfilEvolucionSerializer, AlumnoPerfilSerializer
from ..utils_stats import get_stats_list, get_pool_for_level, validate_stats


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
                    "Trabajo físico", "Defensa de pared", "Smash", "Táctica de juego"
                ]),
                teacher_comment=random.choice([
                    "Buen progreso", "Debe mejorar desplazamiento", "Excelente actitud"
                ]),
                session_type=random.choice(["individual", "grupo", "dúo"]),
            )
    sesiones = TrainingSession.objects.filter(alumno=alumno).order_by("-date")
    serializer = TrainingSessionSerializer(sesiones, many=True)
    return Response(serializer.data)

