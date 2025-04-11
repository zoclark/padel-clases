from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("reservas.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# Archivos estáticos
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Solo rutas que NO sean /api/, /static/ o /assets → React
urlpatterns += [
    re_path(r'^((?!api|static|assets).)*$', FrontendAppView.as_view()),
]