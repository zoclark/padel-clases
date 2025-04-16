# reservas/serializers.py
from rest_framework import serializers
from .models import AlumnoPerfil, Caracteristica, TrainingSession, RecursoAlumno
import re
import logging

class CaracteristicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caracteristica
        fields = ["id", "nombre"]

class AlumnoPerfilSerializer(serializers.ModelSerializer):
    # Utilizamos StringRelatedField para mostrar una representación del usuario (puedes ajustarlo)
    usuario = serializers.StringRelatedField(read_only=True)
    caracteristicas = CaracteristicaSerializer(many=True, read_only=True)

    class Meta:
        model = AlumnoPerfil
        fields = '__all__'

class TrainingSessionSerializer(serializers.ModelSerializer):
    date_formatted = serializers.SerializerMethodField()

    class Meta:
        model = TrainingSession
        fields = '__all__'
    def get_date_formatted(self, obj):
        # Devuelve la fecha en formato dd/mm/yyyy
        return obj.date.strftime("%d/%m/%Y")
    


class TrainingSessionSerializer(serializers.ModelSerializer):
    fecha = serializers.DateField(source='date', format='%Y-%m-%d', read_only=True)

    class Meta:
        model = TrainingSession
        fields = '__all__'


from rest_framework import serializers
from .models import RecursoAlumno

class RecursoAlumnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAlumno
        fields = "__all__"


from rest_framework import serializers
from .models import RecursoAlumno


from rest_framework import serializers
from .models import RecursoAlumno


class RecursoAlumnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAlumno
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Verificar si hay thumbnail y mostrarlo en la consola
        if not representation['thumbnail']:  # Si no hay thumbnail, asignar uno
            video_id = self.extract_video_id(instance.url)
            if video_id:
                # Si la URL ya es de YouTube, no agregar el prefijo del servidor
                thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                representation['thumbnail'] = thumbnail_url
                print(f"Generando thumbnail para el recurso: {representation['titulo']}, thumbnail: {thumbnail_url}")
            else:
                print(f"No se pudo extraer el ID de YouTube para la URL: {instance.url}")
        else:
            print(f"Thumbnail existente: {representation['thumbnail']}")

        return representation

    def extract_video_id(self, url):
        # Intentar extraer el ID del video de YouTube
        match = re.search(r"youtube\.com(?:/[^/]+)*\?v=([^&]+)", url)
        if match:
            return match.group(1)
        return None


from rest_framework import serializers
from .models import Reserva

class ReservaSerializer(serializers.ModelSerializer):
    # Añadir la duración al serializador
    duracion = serializers.ReadOnlyField()

    class Meta:
        model = Reserva
        fields = '__all__'  # Agregar los nuevos campos

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['clase'] = instance.clase.descripcion  # Mostrar la descripción de la clase en lugar del ID
        return representation    