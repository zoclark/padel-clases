# reservas/serializers.py
from rest_framework import serializers
from .models import AlumnoPerfil, Caracteristica, TrainingSession

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
        fields = ['id', 'fecha', 'details', 'teacher_comment', 'session_type']