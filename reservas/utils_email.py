# reservas/utils_email.py
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.template.loader import render_to_string

def send_verification_email(user, origen="web"):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    subject = "Activa tu cuenta en Metrik Padel"
    message = (
        f"Hola {user.username},\n\n"
        "Gracias por registrarte en Metrik Padel.\n\n"
        "Para activar tu cuenta:\n"
        f"- App: metrikpadel://activar-cuenta/{uid}/{token}\n"
        f"- Web: https://www.metrikpadel.com/activar-cuenta/{uid}/{token}\n\n"
        "Si no te registraste, puedes ignorar este correo.\n\n"
        "¡Nos vemos en la pista! 🎾"
    )

    html_message = render_to_string("email/verificacion.html", {
        "user": user,
        "uid": uid,
        "token": token,
    })

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
        html_message=html_message
    )
