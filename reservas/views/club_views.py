from rest_framework import viewsets, permissions, filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend
from reservas.models import (
    Club, Pista, PromocionClub, EventoClub, PartnershipClub
)
from reservas.serializers import (
    ClubSerializer, PistaSerializer, PromocionClubSerializer,
    EventoClubSerializer, PartnershipClubSerializer
)
from reservas.filters.club_filters import (
    ClubFilter, PistaFilter, PromocionClubFilter,
    EventoClubFilter, PartnershipClubFilter
)

# CLUBES
class ClubViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = ClubFilter
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['nombre', 'precio_medio_hora', 'num_reservas', 'num_vistas']
    ordering = ['nombre']  # Orden predeterminado

# PISTAS
class PistaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Pista.objects.select_related('club', 'superficie').all()
    serializer_class = PistaSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = PistaFilter
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['nombre']
    ordering = ['nombre']

# PROMOCIONES
class PromocionClubViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PromocionClub.objects.select_related('club').all()
    serializer_class = PromocionClubSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = PromocionClubFilter
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['fecha_inicio', 'fecha_fin']
    ordering = ['-fecha_inicio']

# EVENTOS
class EventoClubViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EventoClub.objects.select_related('club').all()
    serializer_class = EventoClubSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = EventoClubFilter
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['fecha_inicio', 'fecha_fin']
    ordering = ['-fecha_inicio']

# PARTNERS
class PartnershipClubViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PartnershipClub.objects.select_related('club').all()
    serializer_class = PartnershipClubSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = PartnershipClubFilter
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['nombre_empresa']
    ordering = ['nombre_empresa']
