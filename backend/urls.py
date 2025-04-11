# backend/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from reservas.views import FrontendAppView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("reservas.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# 👇 Esto permite servir archivos estáticos correctamente
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# ✅ Este re_path debe ir el último y debe excluir api/static/assets
urlpatterns += [
    re_path(r'^((?!api|static|assets|favicon\.ico).)*$', FrontendAppView.as_view()),
]
