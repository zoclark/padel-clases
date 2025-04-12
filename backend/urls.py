from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("reservas.urls")),  # TODO bajo /api/
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])

# React frontend
urlpatterns += [
    re_path(r"^(?!api|static|assets).*", FrontendAppView.as_view())
]