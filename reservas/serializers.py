# reservas/serializers.py
from rest_framework import serializers
from .models import (
    AlumnoPerfil, Caracteristica, TrainingSession, RecursoAlumno, 
    Reserva, Pozo, ParticipantePozo, Afinidad
)
import re

# --- Característica (tags del alumno) ---
class CaracteristicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caracteristica
        fields = ["id", "nombre"]

# --- Perfil de alumno ---
class AlumnoPerfilSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField(read_only=True)
    caracteristicas = CaracteristicaSerializer(many=True, read_only=True)

    class Meta:
        model = AlumnoPerfil
        fields = '__all__'

# --- Entrenamientos ---
class TrainingSessionSerializer(serializers.ModelSerializer):
    fecha = serializers.DateField(source='date', format='%Y-%m-%d', read_only=True)

    class Meta:
        model = TrainingSession
        fields = '__all__'

# --- Recursos personalizados ---
class RecursoAlumnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAlumno
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        if not representation['thumbnail']:
            video_id = self.extract_video_id(instance.url)
            if video_id:
                thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                representation['thumbnail'] = thumbnail_url
                print(f"Generando thumbnail para el recurso: {representation['titulo']}, thumbnail: {thumbnail_url}")
            else:
                print(f"No se pudo extraer el ID de YouTube para la URL: {instance.url}")
        else:
            print(f"Thumbnail existente: {representation['thumbnail']}")

        return representation

    def extract_video_id(self, url):
        match = re.search(r"youtube\.com(?:/[^/]+)*\?v=([^&]+)", url)
        if match:
            return match.group(1)
        return None

# --- Reservas ---
class ReservaSerializer(serializers.ModelSerializer):
    duracion = serializers.ReadOnlyField()

    class Meta:
        model = Reserva
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['clase'] = instance.clase.descripcion
        return representation

# --- Pozos y Participantes ---
class ParticipantePozoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipantePozo
        fields = "__all__"

class AfinidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Afinidad
        fields = "__all__"

class PozoSerializer(serializers.ModelSerializer):
    participantes = ParticipantePozoSerializer(many=True, read_only=True)
    class Meta:
        model = Pozo
        fields = "__all__"
