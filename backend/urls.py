from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from django.contrib import admin
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from reservas.views import FrontendAppView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("reservas.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# Archivos estáticos primero
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Al final del todo: Catch-all para React
urlpatterns += [
    re_path(r"^.*$", FrontendAppView.as_view()),
]
