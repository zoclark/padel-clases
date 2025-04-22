# views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
import random
from datetime import timedelta, date
import pandas as pd

from .models import (
    Usuario, AlumnoPerfil, TrainingSession, RecursoAlumno,
    Reserva, Pozo, ParticipantePozo, Afinidad, JugadorPozo
)
from .serializers import (
    AlumnoPerfilSerializer, TrainingSessionSerializer, RecursoAlumnoSerializer,
    ReservaSerializer, PozoSerializer, ParticipantePozoSerializer,
    AfinidadSerializer, UsuarioPerfilSerializer
)


# ================= REGISTRO Y PERFIL ===================
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
            rol="alumno"
        )
        print("✅ Usuario creado desde API:", usuario.username)
        return Response({"mensaje": f"Usuario '{usuario.username}' creado correctamente"}, status=201)
    except Exception as e:
        print("❌ Error en el registro:", e)
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    data = {"rol": request.user.rol}
    if request.user.rol == "alumno":
        try:
            perfil = AlumnoPerfil.objects.get(usuario=request.user)
            data.update(AlumnoPerfilSerializer(perfil).data)
        except AlumnoPerfil.DoesNotExist:
            data["error"] = "Perfil de alumno no encontrado"
    else:
        data.update(UsuarioPerfilSerializer(request.user).data)
    return Response(data)


# ================ ENTRENAMIENTOS =======================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_entrenamientos(request):
    alumno = request.user
    if not TrainingSession.objects.filter(alumno=alumno).exists():
        for i in range(10):
            TrainingSession.objects.create(
                alumno=alumno,
                date=date.today() - timedelta(days=i * 7),
                details=random.choice([...]),
                teacher_comment=random.choice([...]),
                session_type=random.choice(["individual", "grupo", "dúo"]),
            )
    sesiones = TrainingSession.objects.filter(alumno=alumno).order_by("-date")
    serializer = TrainingSessionSerializer(sesiones, many=True)
    return Response(serializer.data)


# ================ RECURSOS PERSONALIZADOS =============
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recursos_alumno(request):
    try:
        recursos = RecursoAlumno.objects.filter(alumno=request.user)
        serializer = RecursoAlumnoSerializer(recursos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ================ RESERVAS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obtener_reservas(request):
    reservas = Reserva.objects.filter(alumno=request.user)
    serializer = ReservaSerializer(reservas, many=True)
    return Response(serializer.data)


# ================ FRONTENDAPPVIEW ====================
from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os, traceback

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true","1","yes")
        if is_debug and settings.STATICFILES_DIRS:
            index_path = os.path.join(settings.STATICFILES_DIRS[0],"index.html")
        else:
            index_path = os.path.join(settings.STATIC_ROOT,"index.html")
        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except Exception as e:
            return HttpResponseServerError(f"❌ Error cargando index.html:<br>{e}")


# =================== POZOS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_pozos(request):
    pozos = Pozo.objects.all()
    serializer = PozoSerializer(pozos, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pozo(request):
    serializer = PozoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def participantes_pozo(request, pozo_id):
    participantes = ParticipantePozo.objects.filter(pozo_id=pozo_id)
    serializer = ParticipantePozoSerializer(participantes, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def agregar_participante(request):
    data = request.data.copy()

    # género si viene de usuario autenticado
    if request.user.is_authenticated:
        data["usuario"] = request.user.id
        data["genero"] = request.user.genero or data.get("genero","hombre")

    # normalizaciones básicas
    for campo in ("nombre","genero","mano_dominante"):
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].strip().lower()
    if "nivel" in data:
        try: data["nivel"] = int(float(data["nivel"]))
        except: pass

    if "posicion" in data:
        clave = data["posicion"].strip().lower()
    mapping = {
        "Reves":  "reves",
        "Drive":  "drive",
        "Ambos":  "ambos",
    }
    data["posicion"] = mapping.get(clave, "ambos")

    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf>0 else None
        except: data["pista_fija"] = None

    # nuevos campos de afinidades/parejas
    for rel in ("juega_con","juega_contra","no_juega_con","no_juega_contra"):
        if rel in data:
            try: data[rel] = int(data[rel])
            except: data.pop(rel,None)

    serializer = ParticipantePozoSerializer(data=data)
    if serializer.is_valid():
        participante = serializer.save()

        # asignar relaciones M2M
        if data.get("juega_con"):
            participante.juega_con.set(data["juega_con"])
        if data.get("juega_contra"):
            participante.juega_contra.set(data["juega_contra"])
        if data.get("no_juega_con"):
            participante.no_juega_con.set(data["no_juega_con"])
        if data.get("no_juega_contra"):
            participante.no_juega_contra.set(data["no_juega_contra"])

        # crear JugadorPozo
        JugadorPozo.objects.create(
            pozo=participante.pozo,
            nombre=participante.nombre,
            nivel=int(participante.nivel),
            registrado=bool(participante.usuario)
        )
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def afinidades_usuario(request, usuario_id):
    afinidades = Afinidad.objects.filter(participante__usuario_id=usuario_id)
    serializer = AfinidadSerializer(afinidades, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_afinidad(request):
    serializer = AfinidadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def actualizar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error":"Participante no encontrado"}, status=404)

    data = request.data.copy()
    data.pop("pozo", None)  # no permitimos cambiar el pozo

    # normaliza texto e ints
    for campo in ("nombre","genero","mano_dominante"):
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].strip().lower()
    if "nivel" in data:
        try:
            data["nivel"] = int(float(data["nivel"]))
        except:
            pass
    if "posicion" in data:
        mp = {"Reves":"reves","Drive":"drive","Ambos":"ambos"}
        data["posicion"] = mp.get(data["posicion"].strip().lower(), data["posicion"])
    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf>0 else None
        except:
            data["pista_fija"] = None

    # ----------- Eliminamos este bloque -----------
    # for rel in ("juega_con","juega_contra","no_juega_con","no_juega_contra"):
    #     if rel in data:
    #         try: data[rel] = int(data[rel])
    #         except: data.pop(rel,None)
    # -----------------------------------------------

    serializer = ParticipantePozoSerializer(participante, data=data, partial=True)
    if serializer.is_valid():
        participante = serializer.save()

        # ahora sí seteamos las relaciones M2M
        if "juega_con" in data:
            participante.juega_con.set(data["juega_con"])
        if "juega_contra" in data:
            participante.juega_contra.set(data["juega_contra"])
        if "no_juega_con" in data:
            participante.no_juega_con.set(data["no_juega_con"])
        if "no_juega_contra" in data:
            participante.no_juega_contra.set(data["no_juega_contra"])

        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error":"Participante no encontrado"},status=404)
    participante.delete()
    return Response({"mensaje":"Participante eliminado"}, status=204)


@api_view(["GET","PUT","PATCH"])
@permission_classes([IsAuthenticated])
def detalle_pozo(request, pozo_id):
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error":"Pozo no encontrado"}, status=404)

    if request.method=="GET":
        return Response(PozoSerializer(pozo).data)

    partial = (request.method=="PATCH")
    serializer = PozoSerializer(pozo, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ================= IMPORTACIÓN EXCEL ==================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def importar_participantes_excel(request, pozo_id):
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error":"Pozo no encontrado"}, status=404)

    file = request.FILES.get("file")
    if not file:
        return Response({"error":"Fichero no recibido"}, status=400)

    try:
        df = pd.read_excel(file)
        df.columns = [c.lower() for c in df.columns]
    except Exception as e:
        return Response({"error":f"Error leyendo Excel: {e}"}, status=400)

    expected = {"nombre","nivel","genero","posicion","mano_dominante","pista_fija"}
    if not expected.issubset(set(df.columns)):
        return Response({"error":f"Columnas requeridas: {', '.join(expected)}"}, status=400)

    capacidad = pozo.num_pistas * 4
    existentes = {p.nombre.lower(): p for p in ParticipantePozo.objects.filter(pozo=pozo)}
    nuevos = []

    for _, row in df.iterrows():
        try:
            nombre         = str(row["nombre"]).strip().lower()
            genero         = str(row["genero"]).strip().lower()
            posicion       = str(row["posicion"]).strip().lower()
            mano           = str(row["mano_dominante"]).strip().lower()
            pista_fija     = row.get("pista_fija")
            pista_fija     = int(pista_fija) if pd.notnull(pista_fija) else None
            nivel          = int(row.get("nivel") or 0)
            genero         = genero if genero in ["hombre","mujer"] else "hombre"
            posicion       = posicion if posicion in ["reves","drive","ambos"] else "ambos"
            mano           = mano if mano in ["diestro","zurdo"] else "diestro"

            datos = dict(
                pozo=pozo,
                nombre=nombre,
                genero=genero,
                posicion=posicion,
                mano_dominante=mano,
                pista_fija=pista_fija,
                nivel=nivel,
            )

            p_exist = existentes.get(nombre)
            if p_exist:
                for k,v in datos.items():
                    setattr(p_exist, k, v)
                p_exist.save()
            else:
                nuevos.append(datos)

        except Exception as e:
            return Response({"error":f"Error en fila '{row.get('nombre')}': {e}"}, status=400)

    if len(existentes)+len(nuevos) > capacidad:
        return Response({"error":f"Excede capacidad ({capacidad})"}, status=400)

    ParticipantePozo.objects.bulk_create([ParticipantePozo(**d) for d in nuevos])
    serializer = ParticipantePozoSerializer(ParticipantePozo.objects.filter(pozo=pozo), many=True)
    return Response(serializer.data, status=201)
