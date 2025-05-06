from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
import pandas as pd
import os

from ..models import Pozo, ParticipantePozo, JugadorPozo, Afinidad
from ..serializers import ParticipantePozoSerializer, PozoSerializer, AfinidadSerializer
from ..pairings import generar_emparejamientos


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_pozos(request):
    pozos = Pozo.objects.prefetch_related("participantes").all().order_by("fecha", "hora_inicio")
    data = []
    for pozo in pozos:
        participantes = [
            {
                "id": p.id,
                "usuario_id": p.usuario.id if p.usuario else None,
                "nombre": p.nombre,
                "es_organizador": p.es_organizador,
            }
            for p in pozo.participantes.all()
        ]
        data.append({
            "id": pozo.id,
            "titulo": pozo.titulo,
            "fecha": pozo.fecha,
            "hora_inicio": pozo.hora_inicio.strftime("%H:%M"),
            "hora_fin": pozo.hora_fin.strftime("%H:%M"),
            "tipo": pozo.tipo,
            "num_pistas": pozo.num_pistas,
            "participantes": participantes,
        })
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pozo(request):
    serializer = PozoSerializer(data=request.data)
    if serializer.is_valid():
        pozo = serializer.save(creado_por=request.user)
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
def emparejamiento_pozo(request, pozo_id):
    pozo = get_object_or_404(Pozo, id=pozo_id)
    qs = ParticipantePozo.objects.filter(pozo=pozo).prefetch_related(
        'juega_con','juega_contra','no_juega_con','no_juega_contra'
    )
    jugadores = [{
        "id": p.id,
        "nombre": p.nombre,
        "nivel": float(p.nivel),
        "genero": p.genero,
        "mano_dominante": p.mano_dominante,
        "posicion": p.posicion,
        "pista_fija": p.pista_fija,
        "juega_con": [c.id for c in p.juega_con.all()],
        "juega_contra": [c.id for c in p.juega_contra.all()],
        "no_juega_con": [c.id for c in p.no_juega_con.all()],
        "no_juega_contra": [c.id for c in p.no_juega_contra.all()],
    } for p in qs]

    resultado = generar_emparejamientos(jugadores, pozo.num_pistas, pozo.tipo)
    return Response(resultado, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def agregar_participante(request):
    data = request.data.copy()

    if request.user.rol == "alumno":
        data["usuario"] = request.user.id
    else:
        usuario_payload = data.get("usuario")
        if usuario_payload is not None:
            if str(usuario_payload) == str(request.user.id):
                data["usuario"] = request.user.id
            else:
                return Response({"error": "No tienes permiso para inscribir a otro usuario."}, status=403)
        else:
            data["usuario"] = None

    for campo in ("nombre", "genero", "mano_dominante"):
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].strip().lower()
    if "nivel" in data:
        try:
            data["nivel"] = int(float(data["nivel"]))
        except:
            pass
    if "posicion" in data:
        clave = data["posicion"].strip().lower()
        data["posicion"] = {"reves": "reves", "drive": "drive", "ambos": "ambos"}.get(clave, "ambos")
    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf > 0 else None
        except:
            data["pista_fija"] = None

    for rel in ("juega_con", "juega_contra", "no_juega_con", "no_juega_contra"):
        if rel in data:
            try:
                data[rel] = int(data[rel])
            except:
                data.pop(rel, None)

    if data.get("usuario"):
        ya_existe = ParticipantePozo.objects.filter(pozo=data["pozo"], usuario=data["usuario"]).exists()
        if ya_existe:
            return Response({"error": "Ya estás inscrito en este pozo."}, status=400)

    es_organizador = request.user.rol == "organizador" and data.get("usuario") == request.user.id

    serializer = ParticipantePozoSerializer(data=data)
    if serializer.is_valid():
        participante = serializer.save(es_organizador=es_organizador)

        for campo_m2m in ("juega_con", "juega_contra", "no_juega_con", "no_juega_contra"):
            if data.get(campo_m2m):
                getattr(participante, campo_m2m).set(data[campo_m2m])

        JugadorPozo.objects.create(
            pozo=participante.pozo,
            nombre=participante.nombre,
            nivel=int(participante.nivel),
            registrado=bool(participante.usuario)
        )
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
        mp = {"reves":"reves","drive":"drive","ambos":"ambos"}
        data["posicion"] = mp.get(data["posicion"].strip().lower(), data["posicion"])
    if "pista_fija" in data:
        try:
            pf = int(data["pista_fija"])
            data["pista_fija"] = pf if pf>0 else None
        except:
            data["pista_fija"] = None

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
        return Response({"error": "Participante no encontrado"}, status=404)

    # Protección contra borrado del organizador apuntado a sí mismo
    if participante.es_organizador:
        return Response({"error": "No se puede eliminar al organizador inscrito."}, status=403)

    participante.delete()
    return Response({"mensaje": "Participante eliminado"}, status=204)




@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def detalle_pozo(request, pozo_id):
    pozo = get_object_or_404(Pozo, id=pozo_id)
    if request.method == "GET":
        return Response(PozoSerializer(pozo).data)

    serializer = PozoSerializer(pozo, data=request.data, partial=(request.method == "PATCH"))
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def importar_participantes_excel(request, pozo_id):
    pozo = get_object_or_404(Pozo, id=pozo_id)
    file = request.FILES.get("file")
    if not file:
        return Response({"error": "Fichero no recibido"}, status=400)
    try:
        df = pd.read_excel(file)
        df.columns = [c.lower() for c in df.columns]
    except Exception as e:
        return Response({"error": f"Error leyendo Excel: {e}"}, status=400)

    expected = {"nombre", "nivel", "genero", "posicion", "mano_dominante", "pista_fija"}
    if not expected.issubset(set(df.columns)):
        return Response({"error": f"Columnas requeridas: {', '.join(expected)}"}, status=400)

    capacidad = pozo.num_pistas * 4
    existentes = {p.nombre.lower(): p for p in ParticipantePozo.objects.filter(pozo=pozo)}
    nuevos = []
    errores = []

    for index, row in df.iterrows():
        try:
            nombre = str(row["nombre"]).strip().lower()
            genero = str(row["genero"]).strip().lower()
            posicion = str(row["posicion"]).strip().lower()
            mano = str(row["mano_dominante"]).strip().lower()
            pista_fija = row.get("pista_fija")
            pista_fija = int(pista_fija) if pd.notnull(pista_fija) else None
            nivel = int(row.get("nivel") or 0)

            genero = genero if genero in ["hombre", "mujer"] else "hombre"
            posicion = posicion if posicion in ["reves", "drive", "ambos"] else "ambos"
            mano = mano if mano in ["diestro", "zurdo"] else "diestro"

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
                for k, v in datos.items():
                    setattr(p_exist, k, v)
                p_exist.save()
            else:
                nuevos.append(datos)

        except Exception as e:
            errores.append(f"Fila {index + 2} ('{row.get('nombre', '')}'): {e}")

    if len(existentes) + len(nuevos) > capacidad:
        return Response({"error": f"Excede capacidad del pozo ({capacidad})"}, status=400)

    ParticipantePozo.objects.bulk_create([ParticipantePozo(**d) for d in nuevos])
    participantes = ParticipantePozo.objects.filter(pozo=pozo)
    serializer = ParticipantePozoSerializer(participantes, many=True)

    return Response({"datos": serializer.data, "errores": errores}, status=207 if errores else 201)
