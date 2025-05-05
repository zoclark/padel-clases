from rest_framework.pagination import LimitOffsetPagination

class UsuarioPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 50