# -*- coding: utf-8 -*-
from django.db import models
from django.conf import settings
from django.utils.text import slugify

# ---------- CATALOGOS BASE ----------
class TipoSuperficie(models.Model):
    nombre = models.CharField(max_length=50)
    def __str__(self): return self.nombre

class ServicioClub(models.Model):
    nombre = models.CharField(max_length=50)
    def __str__(self): return self.nombre

class Idioma(models.Model):
    nombre = models.CharField(max_length=50)
    def __str__(self): return self.nombre

class CategoriaReview(models.Model):
    nombre = models.CharField(max_length=50)
    def __str__(self): return self.nombre

class TagClub(models.Model):
    nombre = models.CharField(max_length=30, unique=True)
    def __str__(self): return self.nombre

# ---------- CLUB PRINCIPAL ----------
class Club(models.Model):
    nombre = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    descripcion = models.TextField(blank=True)
    descripcion_corta = models.CharField(max_length=160, blank=True)
    direccion = models.CharField(max_length=255)
    latitud = models.FloatField()
    longitud = models.FloatField()
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    web = models.URLField(blank=True)
    url_whatsapp = models.URLField(blank=True)
    url_instagram = models.URLField(blank=True)
    logo = models.ImageField(upload_to="clubes/logos/", blank=True, null=True)
    video_presentacion = models.URLField(blank=True)
    video_instalaciones = models.URLField(blank=True)
    seo_keywords = models.CharField(max_length=255, blank=True)

    # Características
    carnet_socio = models.BooleanField(default=False)
    permite_reservas_online = models.BooleanField(default=False)
    sistema_reservas_externo = models.URLField(blank=True)
    requiere_reserva_previa = models.BooleanField(default=False)
    ranking_publico = models.BooleanField(default=True)
    acceso_24h = models.BooleanField(default=False)
    pet_friendly = models.BooleanField(default=False)
    tiene_parking = models.BooleanField(default=False)
    transporte_publico_cercano = models.BooleanField(default=False)
    precio_medio_hora = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    ocupacion_promedio = models.IntegerField(null=True, blank=True)
    aforo_maximo = models.PositiveIntegerField(null=True, blank=True)
    anio_fundacion = models.IntegerField(null=True, blank=True)
    tipo_ambiente = models.CharField(max_length=20, choices=[('familiar','Familiar'),('competitivo','Competitivo'),('mixto','Mixto')], default='mixto')
    nivel_medio_jugadores = models.CharField(max_length=20, choices=[('bajo','Bajo'),('medio','Medio'),('alto','Alto')], blank=True)

    # Permisos de organización de eventos internos
    permite_pozos = models.BooleanField(default=False, help_text="Permite organizar partidos tipo pozo")
    permite_ligas = models.BooleanField(default=False, help_text="Permite organizar ligas internas o abiertas")
    permite_eventos_empresariales = models.BooleanField(default=False, help_text="Permite festividades o eventos privados organizados por empresas o comunidades")

    # Plan y gestión
    plan = models.CharField(max_length=20, choices=[('basico', 'Básico'), ('premium', 'Premium')], default='basico')
    contacto_gestor = models.CharField(max_length=100, blank=True)
    contacto_gestor_email = models.EmailField(blank=True)
    contacto_gestor_telefono = models.CharField(max_length=20, blank=True)
    destacado = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    publicado = models.BooleanField(default=False)

    # Servicios extendidos
    ofrece_escuela = models.BooleanField(default=False)
    organiza_torneos = models.BooleanField(default=False)
    alquila_material = models.BooleanField(default=False)
    ofrece_fisioterapia = models.BooleanField(default=False)
    barbacoa_disponible = models.BooleanField(default=False)
    area_social = models.BooleanField(default=False)
    zona_refrigerada = models.BooleanField(default=False)
    zona_sombra = models.BooleanField(default=False)
    wifi_disponible = models.BooleanField(default=False)
    espacio_infantil = models.BooleanField(default=False)

    # Idiomas y SEO
    idiomas = models.ManyToManyField(Idioma, related_name="clubes", blank=True)
    idioma_principal = models.ForeignKey(Idioma, null=True, blank=True, on_delete=models.SET_NULL, related_name='idioma_principal_clubes')
    tags = models.ManyToManyField(TagClub, blank=True)

    # Estadísticas
    num_vistas = models.PositiveIntegerField(default=0)
    num_favoritos = models.PositiveIntegerField(default=0)
    num_reservas = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.nombre)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre

class ClubHorario(models.Model):
    club = models.ForeignKey(Club, related_name="horarios", on_delete=models.CASCADE)
    dia_semana = models.IntegerField(choices=[(i, i) for i in range(7)])
    apertura = models.TimeField()
    cierre = models.TimeField()

class ClubServicio(models.Model):
    club = models.ForeignKey(Club, related_name="servicios", on_delete=models.CASCADE)
    servicio = models.ForeignKey(ServicioClub, on_delete=models.CASCADE)

class ClubImagen(models.Model):
    club = models.ForeignKey(Club, related_name="imagenes", on_delete=models.CASCADE)
    imagen = models.ImageField(upload_to="clubes/imagenes/")
    descripcion = models.CharField(max_length=100, blank=True)
    orden = models.PositiveIntegerField(default=0)

class Pista(models.Model):
    club = models.ForeignKey(Club, related_name="pistas", on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    indoor = models.BooleanField(default=False)
    cubierta_exterior = models.BooleanField(default=False)
    abierta = models.BooleanField(default=False)
    es_1vs1 = models.BooleanField(default=False)
    es_competicion = models.BooleanField(default=False)
    iluminacion_nocturna = models.BooleanField(default=False)
    accesible_minusvalidos = models.BooleanField(default=False)
    superficie = models.ForeignKey(TipoSuperficie, on_delete=models.SET_NULL, null=True, blank=True)

class TarifaFranja(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    dia_semana = models.IntegerField(choices=[(i, i) for i in range(7)])
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    precio = models.DecimalField(max_digits=6, decimal_places=2)

class IncidenciaPista(models.Model):
    pista = models.ForeignKey(Pista, on_delete=models.CASCADE)
    descripcion = models.TextField()
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=[('abierta','Abierta'),('cerrada','Cerrada temporalmente')])

class PromocionClub(models.Model):
    club = models.ForeignKey(Club, related_name="promociones", on_delete=models.CASCADE)
    titulo = models.CharField(max_length=100)
    descripcion = models.TextField()
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    activa = models.BooleanField(default=True)

class PartnershipClub(models.Model):
    club = models.ForeignKey(Club, related_name="partnerships", on_delete=models.CASCADE)
    nombre_empresa = models.CharField(max_length=100)
    enlace = models.URLField(blank=True)
    descripcion = models.TextField(blank=True)
    logo = models.ImageField(upload_to='clubes/partners/', blank=True, null=True)

class EventoClub(models.Model):
    club = models.ForeignKey(Club, related_name="eventos", on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    publico = models.BooleanField(default=True)

class ClubUsuarioRelacion(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tipo_relacion = models.CharField(max_length=20, choices=[
        ('favorito', 'Favorito'),
        ('socio', 'Socio'),
        ('entrenador', 'Entrenador'),
        ('administrador', 'Administrador'),
        ('colaborador', 'Colaborador')
    ])
    fecha = models.DateTimeField(auto_now_add=True)

class ReviewClub(models.Model):
    club = models.ForeignKey(Club, related_name='reviews', on_delete=models.CASCADE)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField()
    comentario = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    categorias = models.ManyToManyField(CategoriaReview, blank=True)

class ResumenReviewIA(models.Model):
    club = models.OneToOneField(Club, on_delete=models.CASCADE, related_name="resumen_reviews")
    resumen_positivo = models.TextField(blank=True)
    resumen_negativo = models.TextField(blank=True)
    actualizado = models.DateTimeField(auto_now=True)

class LogroClub(models.Model):
    club = models.ForeignKey(Club, related_name='logros', on_delete=models.CASCADE)
    titulo = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    icono = models.ImageField(upload_to='clubes/logros/', blank=True, null=True)
    fecha_otorgado = models.DateField(auto_now_add=True)

class RankingClub(models.Model):
    club = models.OneToOneField(Club, related_name='ranking', on_delete=models.CASCADE)
    provincia = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True)
    puntuacion_total = models.FloatField(default=0)
    posicion = models.PositiveIntegerField(default=0)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

class HistorialClubUsuario(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tipo_evento = models.CharField(max_length=30, choices=[
        ('reserva', 'Reserva'),
        ('torneo', 'Torneo'),
        ('entrenamiento', 'Entrenamiento')
    ])
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(blank=True)

class PrediccionOcupacion(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    fecha = models.DateField()
    ocupacion_esperada = models.FloatField()
    factor_clima = models.FloatField()
    factor_festivo = models.FloatField()
    generado_en = models.DateTimeField(auto_now_add=True)

class MapaCalorClub(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    dia_semana = models.IntegerField()
    hora = models.TimeField()
    intensidad = models.IntegerField()

class PerfilEstiloJugador(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    estilo = models.CharField(max_length=50)
    nivel = models.CharField(max_length=20)
    frecuencia_juego = models.CharField(max_length=20)
    clubes_favoritos = models.ManyToManyField(Club, blank=True)
