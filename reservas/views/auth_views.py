from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_str, force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.conf import settings
from django.shortcuts import get_object_or_404
from datetime import timedelta
import requests
import os
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from ..models import Usuario, AlumnoPerfil, AlumnoPerfilEvolucion, PushToken
from ..serializers import AlumnoPerfilSerializer, AlumnoPerfilEvolucionSerializer
from ..utils_stats import validate_stats, get_level_ranges, get_pool_for_level, get_stats_list
from ..utils_email import send_verification_email

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

@api_view(["POST"])
def registro_usuario(request):
    datos = request.data
    try:
        if Usuario.objects.filter(username=datos.get("username")).exists():
            return Response({"error": "Usuario ya existe"}, status=400)
        
        usuario = Usuario.objects.create_user(
            username=datos["username"],
            email=datos["email"],
            password=datos["password"],
            rol=datos.get("rol", "alumno"),
            is_active=False
        )

        AlumnoPerfil.objects.get_or_create(usuario=usuario)

        send_verification_email(usuario, datos.get("origen", "web"))
        return Response({
            "mensaje": f"Usuario '{usuario.username}' creado correctamente",
            "email": usuario.email
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

class RegistroConVerificacionView(APIView):
    def post(self, request):
        data = request.data
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        origen = data.get("origen", "web")

        if Usuario.objects.filter(username=username).exists():
            return Response({"detail": "El usuario ya existe."}, status=400)
        if Usuario.objects.filter(email=email).exists():
            return Response({"detail": "El email ya está registrado."}, status=400)

        usuario = Usuario.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False
        )

        send_verification_email(usuario, origen)

        return Response({
            "detail": "Se ha enviado un email de activación.",
            "email": usuario.email,
            "uid": urlsafe_base64_encode(force_bytes(usuario.pk)),
            "token": default_token_generator.make_token(usuario)
        }, status=201)

class ActivarCuentaView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            usuario = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return Response({"detail": "Enlace inválido."}, status=400)

        if usuario.is_active:
            return Response({"detail": "Esta cuenta ya está activada."})

        if default_token_generator.check_token(usuario, token):
            usuario.is_active = True
            usuario.save()

            try:
                push_token = PushToken.objects.get(user=usuario).token
                payload = {
                    "to": push_token,
                    "sound": "default",
                    "title": "✅ Cuenta activada",
                    "body": "Tu cuenta ha sido verificada correctamente. ¡Ya puedes usar la app!",
                    "data": {"verificada": True}
                }
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                requests.post(EXPO_PUSH_URL, json=payload, headers=headers)
            except PushToken.DoesNotExist:
                pass
            except Exception as e:
                print("❌ Error enviando push tras activación:", e)

            return Response({"detail": "Cuenta activada correctamente. Ya puedes iniciar sesión."})

        return Response({"detail": "Token inválido o expirado."}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def onboarding_perfil_alumno(request):
    nivel = float(request.data.get("nivel", 0))
    stats = {stat: int(request.data.get(stat, 0)) for stat in get_stats_list()}
    alertas = validate_stats(nivel, stats)
    if alertas:
        return Response({"alertas": alertas}, status=400)

    perfil, _ = AlumnoPerfil.objects.get_or_create(usuario=request.user)
    for stat, valor in stats.items():
        setattr(perfil, stat, valor)
    perfil.nivel = nivel
    perfil.save()

    AlumnoPerfilEvolucion.objects.create(perfil=perfil, stats=stats)

    serializer = AlumnoPerfilSerializer(perfil)
    return Response({
        "mensaje": "Perfil creado/actualizado correctamente",
        "perfil": serializer.data,
        "pool_usado": sum(stats.values()),
        "pool_max": get_pool_for_level(nivel)
    }, status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def completar_onboarding(request):
    usuario = request.user
    usuario.onboarding_completado = True
    usuario.save()
    return Response({"onboarding_completado": True})


@api_view(["POST"])
def resend_verification_email(request):
    email = request.data.get("email")
    if not email:
        return Response({"detail": "Email requerido"}, status=400)
    
    try:
        user = Usuario.objects.get(email=email)
        if user.is_active:
            return Response({"detail": "El usuario ya está activado."}, status=400)
        if user.last_verification_sent and timezone.now() - user.last_verification_sent < timedelta(minutes=5):
            return Response({"detail": "Ya se ha enviado un correo recientemente. Inténtalo en unos minutos."}, status=429)

        send_verification_email(user)
        user.last_verification_sent = timezone.now()
        user.save(update_fields=["last_verification_sent"])
        return Response({"detail": "Correo de verificación reenviado."})
    
    except Usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado."}, status=404)

@api_view(["GET"])
@permission_classes([AllowAny])
def estado_verificacion(request):
    email = request.query_params.get('email')
    if not email:
        return Response({"detail": "Se requiere el parámetro email"}, status=400)

    user = Usuario.objects.filter(email__iexact=email.strip().lower()).first()
    return Response({"is_verified": bool(user and user.is_active)})


reset_token_generator = PasswordResetTokenGenerator()
from ..utils_email import send_verification_email, send_reset_email

@api_view(["POST"])
@permission_classes([AllowAny])
def solicitar_reset_password(request):
    email = request.data.get("email", "").strip().lower()
    origen = request.data.get("origen", "web")

    if not email:
        return Response({"detail": "Email requerido"}, status=400)

    user = Usuario.objects.filter(email__iexact=email).first()
    if not user:
        return Response({"detail": "No se ha encontrado un usuario con ese email."}, status=404)

    # Opcional: limitar la frecuencia del envío (como verificación)
    if user.last_verification_sent and timezone.now() - user.last_verification_sent < timedelta(minutes=5):
        return Response({"detail": "Ya se ha enviado un correo recientemente. Inténtalo en unos minutos."}, status=429)

    try:
        uid, token = send_reset_email(user, origen)
        user.last_verification_sent = timezone.now()
        user.save(update_fields=["last_verification_sent"])
        return Response({
            "detail": "Se ha enviado un correo para restablecer la contraseña.",
            "email": user.email,
            "uid": uid,
            "token": token
        })
    except Exception as e:
        print("❌ Error enviando email de reset:", str(e))
        return Response({"detail": f"Error al enviar el correo: {str(e)}"}, status=500)

@api_view(["GET"])
@permission_classes([AllowAny])
def verificar_token_reset(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = Usuario.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
        return Response({"detail": "Token inválido."}, status=400)

    if reset_token_generator.check_token(user, token):
        return Response({"valid": True})
    return Response({"valid": False}, status=400)

@api_view(["POST"])
@permission_classes([AllowAny])
def confirmar_nueva_password(request):
    uidb64 = request.data.get("uid")
    token = request.data.get("token")
    nueva_password = request.data.get("password")

    if not all([uidb64, token, nueva_password]):
        return Response({"detail": "Faltan datos"}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = Usuario.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
        return Response({"detail": "Token inválido."}, status=400)

    if not reset_token_generator.check_token(user, token):
        return Response({"detail": "Token inválido o expirado."}, status=400)

    user.set_password(nueva_password)
    user.save()
    return Response({"detail": "Contraseña actualizada correctamente."})


import requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET

print("🧪 GOOGLE_CLIENT_ID:", settings.GOOGLE_CLIENT_ID)
REDIRECT_URI = 'https://metrikpadel.com/api/auth/oauth2/callback/'

class GoogleOAuthCallbackView(APIView):
    def get(self, request):
        code = request.GET.get('code')
        if not code:
            return Response({'error': 'No se recibió código'}, status=400)

        # 1. Intercambiar código por access_token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
        token_resp = requests.post(token_url, data=token_data)
        if token_resp.status_code != 200:
            print("❌ Error token_resp:", token_resp.text)
            return Response({'error': 'Fallo al obtener access_token'}, status=400)
        
        access_token = token_resp.json().get('access_token')

        # 2. Obtener información del usuario
        userinfo_resp = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        if userinfo_resp.status_code != 200:
            return Response({'error': 'Fallo al obtener datos del usuario'}, status=400)

        info = userinfo_resp.json()
        email = info.get('email')
        name = info.get('name', '')
        picture = info.get('picture', '')

        if not email:
            return Response({'error': 'Email no encontrado'}, status=400)

        # 3. Crear o encontrar el usuario
        user, _ = User.objects.get_or_create(email=email, defaults={
            'username': email,
            'first_name': name,
            'is_active': True,
        })

        if not user.is_active:
            user.is_active = True
            user.save()

        # 4. Generar JWT
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        # 5. Redirigir al móvil con deep link y tokens
        deeplink = f"metrikpadel://login_success?access={access}&refresh={refresh}"
        return HttpResponse(f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Redirigiendo a MetrikPadel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body {{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: sans-serif;
        background-color: #1e1e1e;
        color: white;
        margin: 0;
      }}
      a {{
        background-color: #6C5CE7;
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        margin-top: 20px;
      }}
    </style>
  </head>
  <body>
    <p>Haz clic en el botón para abrir la app MetrikPadel</p>

    <!-- Universal deep link -->
    <a href="metrikpadel://login_success?access={access}&refresh={refresh}">Abrir App</a>

    <!-- Android fallback usando intent:// -->
    <a href="intent://login_success?access={access}&refresh={refresh}#Intent;scheme=metrikpadel;package=com.zoclark.metrikpadelappnative;end">
      Abrir App (Android)
    </a>
  </body>
</html>
""")
