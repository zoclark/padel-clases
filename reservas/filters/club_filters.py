from django_filters import rest_framework as filters, BaseInFilter
from reservas.models import Club, Pista, PromocionClub, EventoClub, PartnershipClub
from django.db.models import Q

class NumberInFilter(BaseInFilter, filters.NumberFilter):
    pass

class ClubFilter(filters.FilterSet):
    nombre = filters.CharFilter(lookup_expr='icontains')
    direccion = filters.CharFilter(lookup_expr='icontains')
    tipo_ambiente = filters.ChoiceFilter(choices=Club._meta.get_field('tipo_ambiente').choices)
    nivel_medio_jugadores = filters.ChoiceFilter(choices=Club._meta.get_field('nivel_medio_jugadores').choices)
    idioma = NumberInFilter(field_name='idiomas__id', lookup_expr='in')
    tag = NumberInFilter(field_name='tags__id', lookup_expr='in')
    permite_reservas_online = filters.BooleanFilter()
    destacado = filters.BooleanFilter()
    activo = filters.BooleanFilter()
    publicado = filters.BooleanFilter()
    precio_medio_hora = filters.RangeFilter()
    ocupacion_promedio = filters.RangeFilter()
    aforo_maximo = filters.RangeFilter()
    latitud_min = filters.NumberFilter(field_name='latitud', lookup_expr='gte')
    latitud_max = filters.NumberFilter(field_name='latitud', lookup_expr='lte')
    longitud_min = filters.NumberFilter(field_name='longitud', lookup_expr='gte')
    longitud_max = filters.NumberFilter(field_name='longitud', lookup_expr='lte')
    q = filters.CharFilter(method='filter_q')

    def filter_q(self, queryset, name, value):
        return queryset.filter(
            Q(nombre__icontains=value) |
            Q(descripcion__icontains=value) |
            Q(direccion__icontains=value)
        )

    class Meta:
        model = Club
        fields = [
            'nombre', 'direccion', 'tipo_ambiente', 'nivel_medio_jugadores',
            'idioma', 'tag', 'permite_reservas_online', 'destacado', 'activo',
            'publicado', 'precio_medio_hora', 'ocupacion_promedio', 'aforo_maximo'
        ]

class PistaFilter(filters.FilterSet):
    indoor = filters.BooleanFilter()
    cubierta_exterior = filters.BooleanFilter()
    abierta = filters.BooleanFilter()
    es_1vs1 = filters.BooleanFilter()
    es_competicion = filters.BooleanFilter()
    iluminacion_nocturna = filters.BooleanFilter()
    accesible_minusvalidos = filters.BooleanFilter()
    superficie = filters.NumberFilter(field_name='superficie__id')

    class Meta:
        model = Pista
        fields = []

class PromocionClubFilter(filters.FilterSet):
    activa = filters.BooleanFilter()
    fecha_inicio = filters.DateFilter(field_name='fecha_inicio', lookup_expr='gte')
    fecha_fin = filters.DateFilter(field_name='fecha_fin', lookup_expr='lte')

    class Meta:
        model = PromocionClub
        fields = []

class EventoClubFilter(filters.FilterSet):
    publico = filters.BooleanFilter()
    fecha_inicio = filters.DateFilter(field_name='fecha_inicio', lookup_expr='gte')
    fecha_fin = filters.DateFilter(field_name='fecha_fin', lookup_expr='lte')

    class Meta:
        model = EventoClub
        fields = []

class PartnershipClubFilter(filters.FilterSet):
    nombre_empresa = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = PartnershipClub
        fields = []
