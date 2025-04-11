from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("reservas.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# ✅ Esto debe ir al final
urlpatterns += [
    re_path(r'^((?!api|static|assets|favicon\.ico).)*$', TemplateView.as_view(template_name="index.html")),
]