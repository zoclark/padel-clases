# reservas/utils_email.py
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"https://www.metrikpadel.com/verificar/{uid}/{token}"

    subject = "Activa tu cuenta en Metrik Padel"
    message = (
        f"Hola {user.username},\n\n"
        "Gracias por registrarte en Metrik Padel.\n\n"
        "Por favor haz clic en el siguiente enlace para activar tu cuenta:\n\n"
        f"{link}\n\n"
        "Si no te registraste, puedes ignorar este correo.\n\n"
        "¡Nos vemos en la pista! 🎾"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )