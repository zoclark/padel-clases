# reservas/serializers.py

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.db import IntegrityError

from .models import (
    AlumnoPerfil,
    Caracteristica,
    TrainingSession,
    RecursoAlumno,
    Reserva,
    Pozo,
    ParticipantePozo,
    Afinidad,
    Usuario,
    AlumnoPerfilEvolucion,
)
import re

# --- Registro de usuario con unicidad de username/email ---
class RegistroSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="Este nombre de usuario ya existe."
            )
        ]
    )
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="Este email ya está en uso."
            )
        ]
    )
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ("username", "email", "password")

    def create(self, validated_data):
        try:
            # create_user se encarga de hashear la contraseña
            user = Usuario.objects.create_user(**validated_data)
            return user
        except IntegrityError as e:
            err = str(e).lower()
            if 'email' in err:
                raise serializers.ValidationError({'email': 'Este email ya está en uso.'})
            if 'username' in err:
                raise serializers.ValidationError({'username': 'Este nombre de usuario ya existe.'})
            raise

# --- Característica (tags del alumno) ---
class CaracteristicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caracteristica
        fields = ["id", "nombre"]

# --- Perfil de alumno ---
class AlumnoPerfilSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField(read_only=True)
    caracteristicas = CaracteristicaSerializer(many=True, read_only=True)
    genero = serializers.CharField(source="usuario.genero", read_only=True)
    fecha_nacimiento = serializers.DateField(source="usuario.fecha_nacimiento", read_only=True)
    telefono = serializers.CharField(source="usuario.telefono", read_only=True)
    localidad = serializers.CharField(source="usuario.localidad", read_only=True)
    municipio = serializers.CharField(source="usuario.municipio", read_only=True)
    email = serializers.EmailField(source="usuario.email", read_only=True)
    onboarding_completado = serializers.BooleanField(source="usuario.onboarding_completado", read_only=True)
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = AlumnoPerfil
        fields = "__all__"

    def get_is_verified(self, obj):
        return obj.usuario.is_verified

# --- Entrenamientos ---
class TrainingSessionSerializer(serializers.ModelSerializer):
    fecha = serializers.DateField(source="date", format="%Y-%m-%d", read_only=True)

    class Meta:
        model = TrainingSession
        fields = "__all__"

# --- Recursos personalizados ---
class RecursoAlumnoSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = RecursoAlumno
        fields = "__all__"

    def get_thumbnail(self, obj):
        """
        Devuelve la miniatura de YouTube si no hay thumbnail explícito
        """
        if obj.thumbnail:  # Campo explícito en el modelo (si existe)
            return obj.thumbnail.url if hasattr(obj.thumbnail, 'url') else obj.thumbnail

        if obj.url:
            video_id = self.extract_video_id(obj.url)
            if video_id:
                return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        return None

    def extract_video_id(self, url):
        """
        Extrae el ID de un vídeo de YouTube desde múltiples formatos de URL
        """
        match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|\/|$)', url)
        return match.group(1) if match else None


# --- Reservas ---
class ReservaSerializer(serializers.ModelSerializer):
    duracion = serializers.ReadOnlyField()

    class Meta:
        model = Reserva
        fields = "__all__"

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["clase"] = instance.clase.descripcion
        return representation

# --- Participantes de Pozo ---
class ParticipantePozoSerializer(serializers.ModelSerializer):
    juega_con = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ParticipantePozo.objects.all(),
        required=False
    )
    juega_contra = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ParticipantePozo.objects.all(),
        required=False
    )
    no_juega_con = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ParticipantePozo.objects.all(),
        required=False
    )
    no_juega_contra = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ParticipantePozo.objects.all(),
        required=False
    )

    class Meta:
        model = ParticipantePozo
        fields = "__all__"

# --- Afinidades de Pozo ---
class AfinidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Afinidad
        fields = "__all__"

# --- Pozo con sus participantes ---
class PozoSerializer(serializers.ModelSerializer):
    participantes = ParticipantePozoSerializer(many=True, read_only=True)

    class Meta:
        model = Pozo
        fields = "__all__"

# --- Perfil de usuario (otros endpoints) ---
class UsuarioPerfilSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "genero",
            "fecha_nacimiento",
            "telefono",
            "localidad",
            "municipio",
            "onboarding_completado",
            "is_verified",
        ]
        read_only_fields = ["username", "email"]

    def get_is_verified(self, obj):
        return obj.is_verified

    
# --- Evolución de perfil de alumno ---
class AlumnoPerfilEvolucionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumnoPerfilEvolucion
        fields = "__all__"



# en serializers.py
from .models import Amistad
from rest_framework import serializers

class AmistadSerializer(serializers.ModelSerializer):
    de_usuario = UsuarioPerfilSerializer()
    a_usuario = UsuarioPerfilSerializer()
    usuario_actual = serializers.SerializerMethodField()

    def get_usuario_actual(self, obj):
        request = self.context.get("request")
        return request.user.id if request else None

    class Meta:
        model = Amistad
        fields = ["id", "estado", "de_usuario", "a_usuario", "usuario_actual"]

# notificaciones/serializers.py
from rest_framework import serializers
from .models import Notificacion
from .models import Amistad
class NotificacionSerializer(serializers.ModelSerializer):
    extra = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = ['id', 'titulo', 'cuerpo', 'tipo', 'fecha', 'leida', 'extra']

    def get_extra(self, obj):
        if obj.tipo == 'amistad':
            amistad = Amistad.objects.filter(notificacion=obj).first()
            if amistad:
                return {'solicitud_id': amistad.id}
        return {}
    

 # al final de serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from rest_framework import serializers

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_input = attrs.get("username") or ""
        password = attrs.get("password")

        login_input = login_input.strip().lower()

        # Buscar por username o email (insensible a mayúsculas)
        from .models import Usuario
        user = Usuario.objects.filter(username__iexact=login_input).first() or \
               Usuario.objects.filter(email__iexact=login_input).first()

        if user is None:
            raise serializers.ValidationError({"detail": "No se encontró ningún usuario con ese nombre o email."})

        user = authenticate(username=user.username, password=password)

        if user is None:
            raise serializers.ValidationError({"detail": "Contraseña incorrecta o cuenta inactiva."})

        # Generar el token
        data = super().validate({"username": user.username, "password": password})
        data["usuario_id"] = user.id
        data["username"] = user.username
        data["email"] = user.email
        data["rol"] = user.rol
        return data   
    
from rest_framework import serializers
from .models import (
    Club, ClubHorario, ClubServicio, ClubImagen, Pista, TarifaFranja,
    IncidenciaPista, PromocionClub, PartnershipClub, EventoClub,
    ClubUsuarioRelacion, ReviewClub, ResumenReviewIA, LogroClub,
    RankingClub, HistorialClubUsuario, PrediccionOcupacion, MapaCalorClub,
    TipoSuperficie, ServicioClub, Idioma, CategoriaReview, TagClub
)
class TipoSuperficieSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoSuperficie
        fields = ['id', 'nombre']

class ServicioClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioClub
        fields = ['id', 'nombre']

class IdiomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Idioma
        fields = ['id', 'nombre']

class CategoriaReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaReview
        fields = ['id', 'nombre']

class TagClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagClub
        fields = ['id', 'nombre']

class ClubHorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubHorario
        fields = ['dia_semana', 'apertura', 'cierre']

class ClubServicioSerializer(serializers.ModelSerializer):
    servicio = ServicioClubSerializer(read_only=True)

    class Meta:
        model = ClubServicio
        fields = ['servicio']

class ClubImagenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubImagen
        fields = ['imagen', 'descripcion', 'orden']

class PistaSerializer(serializers.ModelSerializer):
    superficie = TipoSuperficieSerializer(read_only=True)

    class Meta:
        model = Pista
        fields = [
            'id', 'nombre', 'indoor', 'cubierta_exterior', 'abierta',
            'es_1vs1', 'es_competicion', 'iluminacion_nocturna',
            'accesible_minusvalidos', 'superficie'
        ]

class TarifaFranjaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TarifaFranja
        fields = '__all__'

class IncidenciaPistaSerializer(serializers.ModelSerializer):
    pista = serializers.StringRelatedField()

    class Meta:
        model = IncidenciaPista
        fields = '__all__'

class PromocionClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromocionClub
        fields = '__all__'

class PartnershipClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnershipClub
        fields = '__all__'

class EventoClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoClub
        fields = '__all__'

class ClubUsuarioRelacionSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField()

    class Meta:
        model = ClubUsuarioRelacion
        fields = '__all__'

class ReviewClubSerializer(serializers.ModelSerializer):
    categorias = CategoriaReviewSerializer(many=True, read_only=True)
    usuario = serializers.StringRelatedField()

    class Meta:
        model = ReviewClub
        fields = ['id', 'usuario', 'rating', 'comentario', 'fecha', 'categorias']

class ResumenReviewIASerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumenReviewIA
        fields = ['resumen_positivo', 'resumen_negativo', 'actualizado']

class LogroClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogroClub
        fields = ['titulo', 'descripcion', 'icono', 'fecha_otorgado']

class RankingClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankingClub
        fields = ['provincia', 'region', 'puntuacion_total', 'posicion', 'ultima_actualizacion']

class HistorialClubUsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField()

    class Meta:
        model = HistorialClubUsuario
        fields = '__all__'

class PrediccionOcupacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrediccionOcupacion
        fields = '__all__'

class MapaCalorClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapaCalorClub
        fields = '__all__'

class ClubSerializer(serializers.ModelSerializer):
    horarios = ClubHorarioSerializer(many=True, read_only=True)
    servicios = ClubServicioSerializer(many=True, read_only=True)
    imagenes = ClubImagenSerializer(many=True, read_only=True)
    pistas = PistaSerializer(many=True, read_only=True)
    promociones = PromocionClubSerializer(many=True, read_only=True)
    partnerships = PartnershipClubSerializer(many=True, read_only=True)
    eventos = EventoClubSerializer(many=True, read_only=True)
    logros = LogroClubSerializer(many=True, read_only=True)
    ranking = RankingClubSerializer(read_only=True)
    resumen_reviews = ResumenReviewIASerializer(read_only=True)
    idiomas = IdiomaSerializer(many=True, read_only=True)
    idioma_principal = IdiomaSerializer(read_only=True)
    tags = TagClubSerializer(many=True, read_only=True)

    class Meta:
        model = Club
        fields = '__all__'