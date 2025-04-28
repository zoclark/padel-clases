# pairings.py
# -*- coding: utf-8 -*-

from typing import List, Dict, Any, Tuple, Optional, Set, DefaultDict
import itertools
import random # Asegurarse de que está importado
import math
from collections import defaultdict
import logging
import json # Añadido para logging del resultado final

# --- Configuración de Logging ---
# Ajustar nivel a DEBUG para ver más detalles si es necesario
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Tipos ---
Player = Dict[str, Any]
Pair = Tuple[Player, Player]
Match = Tuple[Pair, Pair] # (pair1, pair2)
CourtAssignment = Dict[int, Match] # {pista_num: Match}
PlayerId = int
CourtNum = int

# --- Constantes (Ajustables) ---
# Penalizaciones/Costos (valores más altos indican mayor "costo" o "indeseabilidad")
COST_GENDER_MISMATCH_MIXTO = 500.0    # Costo alto si una pareja no es mixta en pozo mixto (si es posible)
COST_POSITION_CLASH = 5.0         # Costo por drive-drive o reves-reves
COST_ZURDO_CLASH = 5.0            # Costo por zurdo-zurdo
COST_LEVEL_DIFF_INSIDE_PAIR = 50.0   # Costo base por cada punto de diferencia *dentro* de una pareja
COST_LEVEL_DIFF_BETWEEN_PAIRS = 10.0 # Costo base por cada punto de diferencia *entre* parejas en un partido (multiplicador)
COST_SOFT_CONSTRAINT_VIOLATION = 0.1 # Pequeño costo por violar preferencias (mano/posición) si el nivel lo permite
COST_LEVEL_COURT_MISMATCH_FACTOR = 500.0 # Factor de penalización por diferencia de nivel entre pareja y pista (ajustar según necesidad)
# Umbrales
MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS = 1.0 # Diferencia máxima de nivel medio entre parejas para ignorar choques de mano/posición

# --- NUEVAS CONSTANTES PARA ALEATORIEDAD ---
RANDOMNESS_TOLERANCE = 0.5 # Costo adicional permitido para considerar una opción como "igual de buena" para la aleatoriedad (0.0 = solo empates exactos)
LEVEL_TOLERANCE_FOR_RANKING = 0.2 # Diferencia máxima de nivel medio para considerar partidos como "de nivel similar" al rankear en Fase 5
# NUEVO: Pequeño épsilon para comparaciones de nivel flotante
LEVEL_EPSILON = 0.001

# Prioridades (para ordenar)
PRIORITY_FIXED = -10000
PRIORITY_MANDATORY_RELATION = -5000

# --- Clases Auxiliares ---

class PairingState:
    """Almacena el estado del proceso de emparejamiento."""
    def __init__(self, players: List[Player], num_courts: int, pool_type: str):
        self.players = {p['id']: p for p in players}
        self.num_courts = num_courts
        self.pool_type = pool_type
        self.required_players = num_courts * 4
        # self.available_players = set(self.players.keys()) # No se usa activamente, get_unassigned_players es más útil
        self.assigned_players: Set[PlayerId] = set() # IDs de jugadores asignados a un partido final o marcados con error irresoluble
        # Estructura: {court_num: {'pair1': Pair | None, 'pair2': Pair | None, 'fixed_players': set()}}
        self.courts: Dict[CourtNum, Dict[str, Any]] = {
            i + 1: {'pair1': None, 'pair2': None, 'fixed_players': set()} for i in range(num_courts)
        }
        self.final_matches: List[Dict] = []
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def get_player(self, player_id: PlayerId) -> Optional[Player]:
        """Obtiene los datos de un jugador por su ID."""
        return self.players.get(player_id)

    def is_assigned(self, player_id: PlayerId) -> bool:
        """Comprueba si un jugador ya ha sido asignado o marcado con error."""
        return player_id in self.assigned_players

    def get_unassigned_players(self) -> List[Player]:
        """Devuelve la lista de jugadores que aún no han sido asignados a un partido ni marcados con error."""
        return [p for pid, p in self.players.items() if pid not in self.assigned_players]

    def add_warning(self, message: str):
        """Añade un aviso y lo loggea."""
        if message not in self.warnings: # Evitar duplicados exactos
            logging.warning(message)
            self.warnings.append(message)

    def add_error(self, message: str):
        """Añade un error y lo loggea."""
        if message not in self.errors: # Evitar duplicados exactos
            logging.error(message)
            self.errors.append(message)


# --- Funciones de Validación y Cálculo ---

def calculate_pair_avg_level(p1: Player, p2: Player) -> float:
    """Calcula el nivel medio de una pareja."""
    # Asegurarse de que p1 y p2 son diccionarios válidos
    if not isinstance(p1, dict) or not isinstance(p2, dict):
        logging.error(f"Intento de calcular nivel medio con jugadores inválidos: {p1}, {p2}")
        return 0.0
    lvl1 = float(p1.get('nivel', 0.0))
    lvl2 = float(p2.get('nivel', 0.0))
    return (lvl1 + lvl2) / 2.0

def get_pair_level(pair: Optional[Pair]) -> float: # MODIFICADO: Aceptar Optional[Pair]
    """Obtiene el nivel medio de una pareja ya formada."""
    if not pair or len(pair) != 2 or not pair[0] or not pair[1]:
        # logging.error(f"Intento de obtener nivel de una pareja inválida o None: {pair}")
        # Devolver un valor muy bajo o alto puede ser mejor que 0.0 para ordenar
        return -1.0 # O float('inf') si se prefiere que vayan al final
    return calculate_pair_avg_level(pair[0], pair[1])

# NUEVO: Función para calcular el nivel medio de un partido potencial
def get_match_avg_level(pair1: Optional[Pair], pair2: Optional[Pair]) -> float:
    """Calcula el nivel medio de un partido (promedio de los niveles medios de las parejas)."""
    level1 = get_pair_level(pair1)
    level2 = get_pair_level(pair2)
    if level1 < 0 or level2 < 0:
        return -1.0 # Indica error o pareja inválida
    return (level1 + level2) / 2.0

def check_relation(p1: Player, p2: Player, relation_type: str) -> bool:
    """Verifica si existe una relación específica (en cualquier dirección)."""
    if not p1 or not p2: return False # Seguridad
    p1_relations = p1.get(relation_type, [])
    p2_relations = p2.get(relation_type, [])
    # Asegurarse de que las relaciones son listas antes de comprobar
    if not isinstance(p1_relations, list): p1_relations = []
    if not isinstance(p2_relations, list): p2_relations = []
    # Convertir IDs a int si son strings en las relaciones
    try:
        p1_rel_ids = {int(x) for x in p1_relations}
    except (ValueError, TypeError):
        # logging.warning(f"Relación '{relation_type}' inválida para {p1.get('nombre', '?')}: {p1_relations}")
        p1_rel_ids = set()
    try:
        p2_rel_ids = {int(x) for x in p2_relations}
    except (ValueError, TypeError):
        # logging.warning(f"Relación '{relation_type}' inválida para {p2.get('nombre', '?')}: {p2_relations}")
        p2_rel_ids = set()

    p1_id = p1.get('id')
    p2_id = p2.get('id')
    if p1_id is None or p2_id is None: return False # Seguridad

    return p2_id in p1_rel_ids or p1_id in p2_rel_ids

def _calculate_target_level_for_court(state: PairingState, court_num: int) -> float:
    """Estima el nivel medio objetivo del partido para un número de pista dado."""
    if not state.players:
        return 3.0 # Valor por defecto razonable si no hay jugadores

    # Usar niveles de TODOS los jugadores para el cálculo de min/max
    levels = [float(p.get('nivel', 0.0)) for p in state.players.values() if p]
    if not levels:
        return 3.0

    min_lvl = min(levels)
    max_lvl = max(levels)
    num_courts = state.num_courts

    if num_courts <= 1 or max_lvl == min_lvl:
        # Si solo hay 1 pista o todos tienen el mismo nivel, el objetivo es el nivel medio
        return sum(levels) / len(levels)

    # Interpolación lineal: Pista 1 debería tener nivel cercano a max_lvl, Pista N cercano a min_lvl
    # Ajuste para que no sea exactamente min/max, sino un poco más centrado si se desea
    # span = max_lvl - min_lvl
    # adjusted_max = max_lvl - span * 0.1 # Ej: Apuntar un 10% por debajo del máximo real
    # adjusted_min = min_lvl + span * 0.1 # Ej: Apuntar un 10% por encima del mínimo real
    # if adjusted_max < adjusted_min: adjusted_max = adjusted_min = (max_lvl + min_lvl) / 2.0
    # target_level = adjusted_max - (court_num - 1) * (adjusted_max - adjusted_min) / (num_courts - 1)

    # Interpolación simple min/max
    target_level = max_lvl - (court_num - 1) * (max_lvl - min_lvl) / (num_courts - 1)

    # Asegurar que el objetivo está dentro de los límites reales
    return max(min_lvl, min(max_lvl, target_level))

def is_pair_mixed(pair: Optional[Pair]) -> bool:
    """Verifica si una pareja es mixta (un hombre y una mujer)."""
    if not pair or len(pair) != 2 or not pair[0] or not pair[1]:
        return False # Pareja inválida no es mixta
    p1, p2 = pair
    g1 = p1.get('genero')
    g2 = p2.get('genero')
    if not g1 or not g2:
        return False # Género desconocido no forma pareja mixta
    # Es mixta si los géneros son diferentes y son 'hombre' y 'mujer'
    return (g1 == 'hombre' and g2 == 'mujer') or \
           (g1 == 'mujer' and g2 == 'hombre')


# --- Funciones de Validación de Restricciones ---

def can_be_pair(p1: Player, p2: Player, state: PairingState) -> bool:
    """Verifica si dos jugadores pueden formar pareja según las reglas duras."""
    if not p1 or not p2: return False
    p1_id = p1.get('id')
    p2_id = p2.get('id')
    if p1_id is None or p2_id is None : return False # Seguridad
    if p1_id == p2_id: return False

    # No jugar con
    if check_relation(p1, p2, 'no_juega_con'):
        # logging.debug(f"Restricción can_be_pair: {p1.get('nombre')} no_juega_con {p2.get('nombre')}")
        return False

    # Pista fija incompatible
    p1_fixed = p1.get('pista_fija')
    p2_fixed = p2.get('pista_fija')
    if p1_fixed is not None and p2_fixed is not None and p1_fixed != p2_fixed:
        # logging.debug(f"Restricción can_be_pair: Incompatibilidad pista fija {p1_fixed} vs {p2_fixed}")
        return False

    # Género (para pozos no mixtos/parejas)
    p1_gender = p1.get('genero')
    p2_gender = p2.get('genero')
    if state.pool_type == "hombres" and (p1_gender != 'hombre' or p2_gender != 'hombre'):
        # logging.debug(f"Restricción can_be_pair: Género incompatible para pool hombres {p1_gender} / {p2_gender}")
        return False
    if state.pool_type == "mujeres" and (p1_gender != 'mujer' or p2_gender != 'mujer'):
        # logging.debug(f"Restricción can_be_pair: Género incompatible para pool mujeres {p1_gender} / {p2_gender}")
        return False

    return True

def check_match_hard_constraints(pair1: Optional[Pair], pair2: Optional[Pair], state: PairingState) -> bool: # MODIFICADO: Aceptar Optional
    """Verifica si un partido propuesto viola restricciones duras."""
    if not pair1 or len(pair1) != 2 or not pair1[0] or not pair1[1] or \
       not pair2 or len(pair2) != 2 or not pair2[0] or not pair2[1]:
        # logging.error(f"Intento de verificar restricciones de partido con parejas inválidas: {pair1}, {pair2}")
        return False # No se puede formar el partido

    p1a, p1b = pair1
    p2a, p2b = pair2
    # Validar que todos los jugadores son diccionarios válidos
    if not all(isinstance(p, dict) for p in [p1a, p1b, p2a, p2b]):
         # logging.error(f"Jugador inválido encontrado en check_match_hard_constraints: {pair1}, {pair2}")
         return False
    players_in_match = [p1a, p1b, p2a, p2b]
    player_ids_in_match = {p['id'] for p in players_in_match if p.get('id') is not None}
    if len(player_ids_in_match) < 4: return False # Jugador duplicado o ID faltante

    # Verificar 'no_juega_contra' entre rivales
    rival_pairs = [(p1a, p2a), (p1a, p2b), (p1b, p2a), (p1b, p2b)]
    for r1, r2 in rival_pairs:
        if check_relation(r1, r2, 'no_juega_contra'):
            # logging.debug(f"Conflicto 'no_juega_contra': {r1.get('nombre')} vs {r2.get('nombre')}")
            return False

    # Verificar 'juega_contra' obligatorio no cumplido
    for p in players_in_match:
        must_play_against_ids = p.get('juega_contra', [])
        if not isinstance(must_play_against_ids, list): must_play_against_ids = [] # Asegurar lista
        # Convertir IDs a int si son strings
        try:
            must_play_against_ids_int = {int(x) for x in must_play_against_ids}
        except (ValueError, TypeError):
            must_play_against_ids_int = set()

        p_id = p.get('id')
        if p_id is None: continue # Jugador inválido

        for rival_id in must_play_against_ids_int:
            rival_player = state.get_player(rival_id)
            # Si el rival obligatorio está en el pool, NO está en este partido, Y AÚN NO HA SIDO ASIGNADO -> Conflicto
            if rival_id in state.players and rival_id not in player_ids_in_match and not state.is_assigned(rival_id):
                # logging.debug(f"Conflicto 'juega_contra' no cumplido: {p.get('nombre')} debe jugar contra {rival_player.get('nombre') if rival_player else 'ID '+str(rival_id)} pero no está en el partido y está disponible.")
                return False
            # Si el rival obligatorio está en este partido, verificar que NO sea pareja
            elif rival_id in player_ids_in_match:
                # Determinar si rival_id es pareja de p_id en este partido
                is_partner = False
                if p_id == p1a.get('id') and rival_id == p1b.get('id'): is_partner = True
                elif p_id == p1b.get('id') and rival_id == p1a.get('id'): is_partner = True
                elif p_id == p2a.get('id') and rival_id == p2b.get('id'): is_partner = True
                elif p_id == p2b.get('id') and rival_id == p2a.get('id'): is_partner = True

                if is_partner:
                    # logging.debug(f"Conflicto 'juega_contra': {p.get('nombre')} debe jugar contra {rival_player.get('nombre') if rival_player else 'ID '+str(rival_id)} pero son pareja en este partido")
                    return False

    # Verificar Caso Especial: 'no_juega_con' Y 'no_juega_contra'
    for i in range(4):
        for j in range(i + 1, 4):
            p_i = players_in_match[i]
            p_j = players_in_match[j]
            no_con = check_relation(p_i, p_j, 'no_juega_con')
            no_contra = check_relation(p_i, p_j, 'no_juega_contra')
            if no_con and no_contra:
                # logging.debug(f"Conflicto 'Caso Especial': {p_i.get('nombre')} y {p_j.get('nombre')} no pueden compartir pista")
                return False

    return True


# --- Funciones de Cálculo de Costos/Penalizaciones ---

def calculate_pair_formation_cost(p1: Player, p2: Player, state: PairingState) -> float:
    """Calcula el costo/penalización por formar una pareja específica (menor es mejor)."""
    cost = 0.0
    if not p1 or not p2: return float('inf')
    lvl1 = float(p1.get('nivel', 0.0))
    lvl2 = float(p2.get('nivel', 0.0))

    cost += abs(lvl1 - lvl2) * COST_LEVEL_DIFF_INSIDE_PAIR

    p1_gender = p1.get('genero')
    p2_gender = p2.get('genero')
    if state.pool_type == "mixto" and p1_gender and p2_gender and p1_gender == p2_gender:
        cost += COST_GENDER_MISMATCH_MIXTO

    if p1.get('mano_dominante') == 'zurdo' and p2.get('mano_dominante') == 'zurdo':
        cost += COST_ZURDO_CLASH

    pos1 = p1.get('posicion')
    pos2 = p2.get('posicion')
    if pos1 and pos2 and pos1 != 'ambos' and pos1 == pos2:
        cost += COST_POSITION_CLASH

    return cost

def calculate_match_balance_cost(pair1: Optional[Pair], pair2: Optional[Pair]) -> float: # MODIFICADO: Aceptar Optional
    """Calcula el costo del desequilibrio de nivel ENTRE parejas (menor es mejor)."""
    if not pair1 or len(pair1) != 2 or not pair1[0] or not pair1[1] or \
       not pair2 or len(pair2) != 2 or not pair2[0] or not pair2[1]:
        # logging.error(f"Intento de calcular balance de partido con parejas inválidas: {pair1}, {pair2}")
        return float('inf')
    avg1 = get_pair_level(pair1)
    avg2 = get_pair_level(pair2)
    # Evitar error si get_pair_level devuelve negativo
    if avg1 < 0 or avg2 < 0: return float('inf')
    return abs(avg1 - avg2) * COST_LEVEL_DIFF_BETWEEN_PAIRS

def calculate_match_soft_constraints_cost(pair1: Optional[Pair], pair2: Optional[Pair]) -> float: # MODIFICADO: Aceptar Optional
    """Calcula el costo por violar restricciones suaves (mano/posición) en AMBAS parejas."""
    if not pair1 or len(pair1) != 2 or not pair1[0] or not pair1[1] or \
       not pair2 or len(pair2) != 2 or not pair2[0] or not pair2[1]:
        # logging.error(f"Intento de calcular costo suave de partido con parejas inválidas: {pair1}, {pair2}")
        return float('inf')
    cost = 0.0
    p1a, p1b = pair1
    p2a, p2b = pair2

    # Validar jugadores
    if not all(isinstance(p, dict) for p in [p1a, p1b, p2a, p2b]): return float('inf')

    # Zurdo-Zurdo en Pareja 1
    if p1a.get('mano_dominante') == 'zurdo' and p1b.get('mano_dominante') == 'zurdo':
        cost += COST_SOFT_CONSTRAINT_VIOLATION
    # Zurdo-Zurdo en Pareja 2
    if p2a.get('mano_dominante') == 'zurdo' and p2b.get('mano_dominante') == 'zurdo':
        cost += COST_SOFT_CONSTRAINT_VIOLATION

    # Choque de Posición en Pareja 1
    pos1a, pos1b = p1a.get('posicion'), p1b.get('posicion')
    if pos1a and pos1b and pos1a != 'ambos' and pos1a == pos1b:
        cost += COST_SOFT_CONSTRAINT_VIOLATION
    # Choque de Posición en Pareja 2
    pos2a, pos2b = p2a.get('posicion'), p2b.get('posicion')
    if pos2a and pos2b and pos2a != 'ambos' and pos2a == pos2b:
        cost += COST_SOFT_CONSTRAINT_VIOLATION

    return cost


# --- Fases del Algoritmo ---

def phase_1_fixed_assignments(state: PairingState):
    """Procesa pistas fijas y relaciones obligatorias asociadas."""
    logging.info("--- FASE 1: Procesando Asignaciones Fijas ---")

    def sort_key_fixed_court(player_id):
        player = state.get_player(player_id)
        if not player: return float('inf')
        pista_fija = player.get('pista_fija')
        # Convertir a int si es numérico, si no, tratar como None (inf)
        try:
            pista_fija_int = int(pista_fija) if pista_fija is not None else None
        except (ValueError, TypeError):
            pista_fija_int = None
        return pista_fija_int if pista_fija_int is not None else float('inf')

    player_ids_to_process = sorted(state.players.keys(), key=sort_key_fixed_court)
    processed_in_phase1 = set()

    for pid in player_ids_to_process:
        if pid in processed_in_phase1 or state.is_assigned(pid):
            continue

        player = state.get_player(pid)
        if not player:
            state.add_error(f"Error interno: ID de jugador {pid} no encontrado durante Fase 1.")
            continue

        # Obtener pista fija y asegurar que es un entero si existe
        fixed_court = None
        try:
            pf_val = player.get('pista_fija')
            if pf_val is not None:
                fixed_court = int(pf_val)
        except (ValueError, TypeError):
             state.add_warning(f"Jugador {player.get('nombre', f'ID {pid}')} tiene pista fija '{pf_val}' inválida (no es número). Ignorando pista fija.")
             # Continuar procesando al jugador pero sin pista fija
             fixed_court = None # Asegurar que es None

        # Si no tiene pista fija válida, hemos terminado con los fijos
        if fixed_court is None:
            break # Salir del bucle for pid in player_ids_to_process

        # --- Procesamiento si TIENE pista fija válida ---
        must_pair_with_ids = player.get('juega_con', [])
        if not isinstance(must_pair_with_ids, list): must_pair_with_ids = []
        try: must_pair_with_ids = [int(x) for x in must_pair_with_ids] # Asegurar ints
        except (ValueError, TypeError): must_pair_with_ids = []

        must_play_against_ids = player.get('juega_contra', [])
        if not isinstance(must_play_against_ids, list): must_play_against_ids = []
        try: must_play_against_ids = [int(x) for x in must_play_against_ids] # Asegurar ints
        except (ValueError, TypeError): must_play_against_ids = []


        if fixed_court not in state.courts:
            state.add_error(f"Jugador {player.get('nombre', f'ID {pid}')} tiene pista fija {fixed_court} inválida (Máx: {state.num_courts}). No se puede asignar.")
            state.assigned_players.add(pid) # Marcar como erróneo
            processed_in_phase1.add(pid)
            continue

        logging.info(f"  Procesando {player.get('nombre', f'ID {pid}')} (ID: {pid}) con pista fija {fixed_court}")
        court_data = state.courts[fixed_court]

        # --- Lógica para asignar jugador/pareja a la pista fija ---
        # (Se mantiene la lógica anterior, pero con validaciones añadidas)

        # Caso 1: Pista Fija + Juega Con
        if must_pair_with_ids:
            partner_id = must_pair_with_ids[0]
            partner = state.get_player(partner_id)

            # Validaciones robustas para partner y asignaciones previas
            if not partner:
                state.add_error(f"Jugador {player.get('nombre', f'ID {pid}')} 'juega_con' ID {partner_id} inexistente. No se puede asignar.")
                state.assigned_players.add(pid); processed_in_phase1.add(pid)
                continue
            if state.is_assigned(partner_id):
                # Comprobar si ya está asignado COMPLETAMENTE en alguna pista
                partner_location = None
                for c_num, c_data in state.courts.items():
                    # Chequear si está en una pareja ya asignada en CUALQUIER pista
                    if (c_data.get('pair1') and partner_id in [p['id'] for p in c_data['pair1'] if p]) or \
                       (c_data.get('pair2') and partner_id in [p['id'] for p in c_data['pair2'] if p]):
                         partner_location = c_num
                         break
                    # Chequear si está como single fijo en OTRA pista (implica conflicto si intentamos forzar pareja aquí)
                    if c_num != fixed_court and partner_id in c_data.get('fixed_players', set()):
                        partner_location = c_num # Conflicto potencial, está fijo en otra pista
                        break

                if partner_location is not None and partner_location != fixed_court:
                    state.add_error(f"Conflicto: Compañero obligatorio {partner.get('nombre',f'ID {partner_id}')} de {player.get('nombre', f'ID {pid}')} ya está asignado/fijo en Pista {partner_location}, pero {player.get('nombre', f'ID {pid}')} está fijo en Pista {fixed_court}.")
                    state.assigned_players.add(pid); state.assigned_players.add(partner_id) # Marcar ambos
                    processed_in_phase1.add(pid); processed_in_phase1.add(partner_id)
                    continue
                elif partner_location == fixed_court:
                    # Ya está asignado a una pareja en esta pista (quizás por la otra dirección del 'juega_con')
                    # O ya está como 'fixed_player' aquí (podría formar pareja más tarde si hay otro)
                    # No hacer nada aquí, ya está localizado, verificar la validez de la pareja abajo.
                    pass
                # else: partner está en assigned_players pero no en una pista (marcado con error previo),
                # Se intentará formar la pareja igualmente si es válida, pero puede generar más errores.

            partner_fixed_court = None
            try:
                pf_val_p = partner.get('pista_fija')
                if pf_val_p is not None: partner_fixed_court = int(pf_val_p)
            except (ValueError, TypeError): pass # Ignorar si es inválida

            if partner_fixed_court is not None and partner_fixed_court != fixed_court:
                state.add_error(f"Conflicto Pista Fija: {player.get('nombre', f'ID {pid}')} (fija {fixed_court}) 'juega_con' {partner.get('nombre', f'ID {partner_id}')} (fija {partner_fixed_court}). Imposible.")
                state.assigned_players.add(pid); state.assigned_players.add(partner_id)
                processed_in_phase1.add(pid); processed_in_phase1.add(partner_id)
                continue

            # Verificar si pueden ser pareja AHORA (puede haber cambiado el estado)
            if not can_be_pair(player, partner, state):
                state.add_error(f"Conflicto Restricción: {player.get('nombre', f'ID {pid}')} no puede ser pareja de {partner.get('nombre', f'ID {partner_id}')} (p.ej. por 'no_juega_con') pero tienen 'juega_con'. Imposible.")
                state.assigned_players.add(pid); state.assigned_players.add(partner_id)
                processed_in_phase1.add(pid); processed_in_phase1.add(partner_id)
                continue

            # --- Asignar la pareja a la pista fija ---
            pair = tuple(sorted((player, partner), key=lambda p: p['id']))
            assigned_slot = False
            # Verificar si la pareja ya está asignada (quizás desde el otro jugador)
            pair_ids_set = {pid, partner_id}
            is_already_pair1 = court_data.get('pair1') and {p['id'] for p in court_data['pair1']} == pair_ids_set
            is_already_pair2 = court_data.get('pair2') and {p['id'] for p in court_data['pair2']} == pair_ids_set

            if is_already_pair1 or is_already_pair2:
                 logging.info(f"   -> Pareja ({player.get('nombre', f'ID {pid}')}, {partner.get('nombre', f'ID {partner_id}')}) ya estaba asignada a Pista {fixed_court}. Verificación OK.")
                 assigned_slot = True # Considerar como asignada para marcar jugadores
            elif not court_data.get('pair1'):
                court_data['pair1'] = pair
                logging.info(f"   -> Asignada pareja fija ({player.get('nombre', f'ID {pid}')}, {partner.get('nombre', f'ID {partner_id}')}) a Pista {fixed_court} (Slot 1)")
                assigned_slot = True
            elif not court_data.get('pair2'):
                # Comprobar restricciones con la pareja existente ANTES de asignar
                if check_match_hard_constraints(court_data['pair1'], pair, state):
                    court_data['pair2'] = pair
                    logging.info(f"   -> Asignada pareja fija ({player.get('nombre', f'ID {pid}')}, {partner.get('nombre', f'ID {partner_id}')}) a Pista {fixed_court} (Slot 2)")
                    assigned_slot = True
                else:
                    state.add_error(f"Conflicto al añadir pareja fija ({player.get('nombre', f'ID {pid}')}, {partner.get('nombre', f'ID {partner_id}')}) a Pista {fixed_court}. Incompatible con pareja existente ({court_data['pair1'][0].get('nombre', '?')}/{court_data['pair1'][1].get('nombre', '?')}).")
            else: # La pista ya tiene 2 parejas
                 state.add_error(f"Pista fija {fixed_court} ya está llena de parejas, no se puede añadir a ({player.get('nombre', f'ID {pid}')}, {partner.get('nombre', f'ID {partner_id}')}).")

            if assigned_slot:
                # Quitar de singles fijos si estaban y marcar como asignados/procesados
                if pid in court_data['fixed_players']: court_data['fixed_players'].remove(pid)
                if partner_id in court_data['fixed_players']: court_data['fixed_players'].remove(partner_id)
                # Añadir ambos IDs al set 'fixed_players' de la pista indica que forman parte de una pareja fija aquí
                court_data['fixed_players'].update([pid, partner_id])
                # Marcar en el estado global que ya están en un partido (o destinados a él)
                state.assigned_players.update([pid, partner_id])
                processed_in_phase1.add(pid)
                processed_in_phase1.add(partner_id)
            else: # Si no se pudo asignar el slot
                state.assigned_players.add(pid); state.assigned_players.add(partner_id) # Marcar con error
                processed_in_phase1.add(pid); processed_in_phase1.add(partner_id)

        # Caso 2: Pista Fija + Juega Contra (Solo marca como jugador fijo en la pista)
        elif must_play_against_ids:
            current_players_ids = set(court_data['fixed_players'])
            if court_data.get('pair1'): current_players_ids.update(p['id'] for p in court_data['pair1'] if p)
            if court_data.get('pair2'): current_players_ids.update(p['id'] for p in court_data['pair2'] if p)

            if len(current_players_ids) < 4:
                if pid not in current_players_ids:
                    court_data['fixed_players'].add(pid)
                    state.assigned_players.add(pid) # Marcado como asignado (a esta pista, aunque no en pareja)
                    processed_in_phase1.add(pid)
                    logging.info(f"   -> Asignado jugador fijo {player.get('nombre', f'ID {pid}')} a Pista {fixed_court} (tiene 'juega_contra')")
                # else: ya estaba (quizás por otra relación), no hacer nada
            elif pid not in current_players_ids: # Solo error si no estaba ya y la pista está llena
                 state.add_error(f"Pista fija {fixed_court} llena ({len(current_players_ids)} jugadores), no se puede añadir a {player.get('nombre', f'ID {pid}')} (con 'juega_contra').")
                 state.assigned_players.add(pid) # Marcar con error
                 processed_in_phase1.add(pid)

        # Caso 3: Pista Fija (sin relaciones relevantes para esta fase)
        else:
            current_players_ids = set(court_data['fixed_players'])
            if court_data.get('pair1'): current_players_ids.update(p['id'] for p in court_data['pair1'] if p)
            if court_data.get('pair2'): current_players_ids.update(p['id'] for p in court_data['pair2'] if p)

            if len(current_players_ids) < 4:
                if pid not in current_players_ids:
                    court_data['fixed_players'].add(pid)
                    state.assigned_players.add(pid) # Marcado como asignado (a esta pista)
                    processed_in_phase1.add(pid)
                    logging.info(f"   -> Asignado jugador fijo {player.get('nombre', f'ID {pid}')} a Pista {fixed_court}")
                # else: ya estaba, no hacer nada
            elif pid not in current_players_ids: # Solo error si no estaba y llena
                 state.add_error(f"Pista fija {fixed_court} llena ({len(current_players_ids)} jugadores), no se puede añadir a {player.get('nombre', f'ID {pid}')}.")
                 state.assigned_players.add(pid) # Marcar con error
                 processed_in_phase1.add(pid)


    # Validación cruzada final de 'juega_contra' con pistas fijas (después de procesar todos los fijos)
    logging.info("  Validando conflictos finales de 'juega_contra' con asignaciones fijas...")
    players_with_jc = [p for p in state.players.values() if p.get('juega_contra')]

    for p1 in players_with_jc:
        pid1 = p1['id']
        # Localizar dónde está p1 (si está en alguna pista asignada en Fase 1)
        p1_assigned_court = None
        p1_is_partner_with = None # ID del compañero si está en una pareja fija
        for c_num, c_data in state.courts.items():
            pair1 = c_data.get('pair1')
            pair2 = c_data.get('pair2')
            fixed_players = c_data.get('fixed_players', set())
            player_ids_in_court = set()
            if pair1: player_ids_in_court.update(p['id'] for p in pair1 if p)
            if pair2: player_ids_in_court.update(p['id'] for p in pair2 if p)
            player_ids_in_court.update(fixed_players)

            if pid1 in player_ids_in_court:
                p1_assigned_court = c_num
                # Determinar si está en una pareja fija ya
                if pair1 and pid1 in {p['id'] for p in pair1 if p}:
                    p1_is_partner_with = pair1[1]['id'] if pair1[0]['id'] == pid1 else pair1[0]['id']
                elif pair2 and pid1 in {p['id'] for p in pair2 if p}:
                    p1_is_partner_with = pair2[1]['id'] if pair2[0]['id'] == pid1 else pair2[0]['id']
                break # Encontrado

        if p1_assigned_court is None: continue # p1 no fue asignado fijamente, se validará después

        must_play_against_ids = p1.get('juega_contra', [])
        if not isinstance(must_play_against_ids, list): must_play_against_ids = []
        try: must_play_against_ids_int = {int(x) for x in must_play_against_ids} # Asegurar ints
        except(ValueError, TypeError): must_play_against_ids_int = set()

        for rival_id in must_play_against_ids_int:
            rival = state.get_player(rival_id)
            if not rival: continue # Rival no existe

            # Localizar dónde está el rival (si está en alguna pista asignada en Fase 1)
            rival_assigned_court = None
            for c_num, c_data in state.courts.items():
                 pair1 = c_data.get('pair1')
                 pair2 = c_data.get('pair2')
                 fixed_players = c_data.get('fixed_players', set())
                 player_ids_in_court = set()
                 if pair1: player_ids_in_court.update(p['id'] for p in pair1 if p)
                 if pair2: player_ids_in_court.update(p['id'] for p in pair2 if p)
                 player_ids_in_court.update(fixed_players)
                 if rival_id in player_ids_in_court:
                     rival_assigned_court = c_num
                     break

            # Conflicto 1: P1 debe jugar contra Rival, PERO son pareja fija en la misma pista
            if rival_id == p1_is_partner_with and p1_assigned_court == rival_assigned_court:
                 state.add_error(f"Conflicto Irresoluble (Fase 1): {p1.get('nombre', f'ID {pid1}')} y {rival.get('nombre', f'ID {rival_id}')} deben ser rivales ('juega_contra') pero están como pareja fija en Pista {p1_assigned_court}.")
                 # Marcar ambos como error si no lo estaban ya
                 state.assigned_players.add(pid1); state.assigned_players.add(rival_id)

            # Conflicto 2: P1 debe jugar contra Rival, PERO están asignados a pistas fijas DIFERENTES
            if rival_assigned_court is not None and p1_assigned_court != rival_assigned_court:
                 state.add_error(f"Conflicto Irresoluble (Fase 1): {p1.get('nombre', f'ID {pid1}')} (fijo en {p1_assigned_court}) 'juega_contra' {rival.get('nombre', f'ID {rival_id}')} (fijo en {rival_assigned_court}). Imposible juntarlos.")
                 # Marcar ambos como error si no lo estaban ya
                 state.assigned_players.add(pid1); state.assigned_players.add(rival_id)

            # Conflicto 3: P1 tiene pista fija, Rival tiene pista fija, son diferentes (independiente de juega_contra, ya cubierto por validación de 'pista_fija' en can_be_pair y asignación)
            # La validación anterior de 'pista_fija' al intentar formar pareja ya debería haber capturado esto si tienen 'juega_con'.
            # Si solo tienen 'juega_contra', este Conflicto 2 lo captura.

# ---------------------------------------------------------------------------
# FASE 2: (Sin cambios significativos necesarios para priorizar nivel)
# ---------------------------------------------------------------------------
def phase_2_generate_potential_pairs(state: PairingState) -> List[Tuple[float, Pair]]:
    """Genera todas las parejas posibles con jugadores restantes, calculando su costo."""
    logging.info("--- FASE 2: Generando Parejas Potenciales ---")
    potential_pairs: List[Tuple[float, Pair]] = []
    unassigned_players = state.get_unassigned_players()
    processed_mandatory = set()

    # Prioridad 1: Parejas obligatorias ('juega_con')
    for p1 in unassigned_players:
        if p1['id'] in processed_mandatory: continue
        must_pair_with_ids = p1.get('juega_con', [])
        if not isinstance(must_pair_with_ids, list): must_pair_with_ids = []
        try: must_pair_with_ids = [int(x) for x in must_pair_with_ids] # Asegurar ints
        except (ValueError, TypeError): must_pair_with_ids = []


        if must_pair_with_ids:
            partner_id = must_pair_with_ids[0]
            partner = state.get_player(partner_id)

            # Solo procesar si el compañero existe y NO está ya asignado/marcado con error
            # Y si este jugador (p1) tampoco está asignado/marcado con error
            if partner and partner_id not in state.assigned_players and p1['id'] not in state.assigned_players:
                # Verificar si pueden ser pareja AHORA (importante si 'no_juega_con' existe)
                if not can_be_pair(p1, partner, state):
                    #state.add_error(f"Conflicto Restricción en Fase 2: {p1.get('nombre', f'ID {p1['id']}')} no puede ser pareja de {partner.get('nombre', f'ID {partner_id}')} pero tienen 'juega_con'. Imposible.")
                    state.assigned_players.add(p1['id']); state.assigned_players.add(partner_id)
                    processed_mandatory.add(p1['id']); processed_mandatory.add(partner_id)
                    continue # Saltar a siguiente jugador

                # Si pueden ser pareja, añadirla a la lista potencial con alta prioridad
                pair = tuple(sorted((p1, partner), key=lambda p: p['id']))
                cost = calculate_pair_formation_cost(p1, partner, state)
                # La prioridad negativa asegura que se consideren primero
                potential_pairs.append((PRIORITY_MANDATORY_RELATION + cost, pair))
                processed_mandatory.add(p1['id']); processed_mandatory.add(partner_id)
                logging.info(f"  -> Añadida pareja obligatoria: ({p1.get('nombre')}, {partner.get('nombre')}) con prioridad {PRIORITY_MANDATORY_RELATION + cost:.2f}")

            # Casos donde la pareja obligatoria no se puede formar
            elif partner and (partner_id in state.assigned_players or p1['id'] in state.assigned_players):
                 # No añadir error aquí si ya estaban asignados (puede ser de Fase 1), pero sí marcar como procesados
                 if p1['id'] not in processed_mandatory:
                     state.add_warning(f"Jugador {p1.get('nombre', 'ID ' + str(p1.get('id', '?')))} o su compañero obligatorio {partner.get('nombre', 'ID ' + str(partner.get('id', '?')))} ya estaba asignado/marcado. No se formará pareja obligatoria.")
                     # Marcar a p1 como procesado para no considerarlo en combinaciones normales
                     processed_mandatory.add(p1['id'])
                     # Asegurar que p1 quede marcado como 'asignado' si no puede cumplir obligación
                     state.assigned_players.add(p1['id'])
                 # Marcar también al partner como procesado si existe y no lo estaba
                 if partner and partner_id not in processed_mandatory:
                      processed_mandatory.add(partner_id)
                      state.assigned_players.add(partner_id)


            elif not partner:
                 state.add_error(f"Compañero obligatorio ID {partner_id} para {p1.get('nombre', 'ID ' + str(p1.get('id', '?')))} no existe en la lista de jugadores. {p1.get('nombre', 'ID ' + str(p1.get('id', '?')))} no podrá ser emparejado.")
                 state.assigned_players.add(p1['id']); processed_mandatory.add(p1['id'])

    # Prioridad 2: Resto de combinaciones (solo con jugadores no procesados y no asignados)
    players_for_combinations = [p for p in unassigned_players if p['id'] not in processed_mandatory and p['id'] not in state.assigned_players]
    logging.info(f"  Generando combinaciones para {len(players_for_combinations)} jugadores restantes...")
    for p1, p2 in itertools.combinations(players_for_combinations, 2):
        # Doble check por si acaso fueron asignados mientras se generaban obligatorias
        if p1['id'] in state.assigned_players or p2['id'] in state.assigned_players:
            continue
        if can_be_pair(p1, p2, state):
            pair = tuple(sorted((p1, p2), key=lambda p: p['id']))
            cost = calculate_pair_formation_cost(p1, p2, state)
            potential_pairs.append((cost, pair))

    # Ordenar TODAS las parejas potenciales: Obligatorias primero, luego por costo ascendente
    potential_pairs.sort(key=lambda x: (x[0], -get_pair_level(x[1])))
    logging.info(f"  Generadas {len(potential_pairs)} parejas potenciales totales (obligatorias y combinaciones), ordenadas por costo y nivel.")    # Opcional: Loggear las primeras N parejas para depuración
    # for i in range(min(10, len(potential_pairs))):
    #     cost, pair = potential_pairs[i]
    #     logging.debug(f"    Top Pair {i+1}: Cost={cost:.2f}, Pair=({pair[0].get('nombre')}, {pair[1].get('nombre')}), Level={get_pair_level(pair):.2f}")

    return potential_pairs


# --- NUEVA CONSTANTE ---
# Penalización ENORME para desalentar parejas no mixtas EN FASE 3 si hay opción mixta
# Se usará para ordenar candidatos, no como un costo real sumado.
PENALTY_NON_MIXED_SELECTION = 1_000_000.0

# --- NUEVA Función Auxiliar para Selección ---
def select_best_candidate(
    candidates: List[Tuple[Any, float, float, int]], # (item, cost, level, index) o similar
    cost_tolerance: float,
    level_epsilon: float,
    higher_level_better: bool = True # True para nivel de partido, False para costo
) -> Optional[Tuple[Any, float, int]]: # (chosen_item, chosen_cost, chosen_index)
    """
    Selecciona el mejor candidato de una lista basada en costo, tolerancia, nivel y aleatoriedad.

    Args:
        candidates: Lista de tuplas. Se espera (item, cost, level, index).
                    'cost' es el criterio primario (menor es mejor).
                    'level' es el criterio secundario para desempatar dentro de la tolerancia.
        cost_tolerance: Tolerancia sobre el costo mínimo para considerar candidatos.
        level_epsilon: Tolerancia para comparar niveles flotantes.
        higher_level_better: Si True, prioriza nivel más alto; si False, prioriza nivel más bajo.

    Returns:
        Tupla (item, cost, index) del candidato elegido, o None si no hay candidatos.
    """
    if not candidates:
        return None

    # 1. Encontrar el costo mínimo
    min_cost = min(c[1] for c in candidates)

    # 2. Filtrar candidatos dentro de la tolerancia de costo
    eligible_candidates = [c for c in candidates if c[1] <= min_cost + cost_tolerance]

    if not eligible_candidates: # Por si acaso, aunque no debería pasar si candidates no estaba vacío
        return None

    # 3. Encontrar el mejor nivel entre los elegibles
    best_level = -float('inf') if higher_level_better else float('inf')
    for _, _, level, _ in eligible_candidates:
        if higher_level_better:
            best_level = max(best_level, level)
        else:
            best_level = min(best_level, level)

    # 4. Filtrar candidatos con el mejor nivel (dentro de epsilon)
    if higher_level_better:
        top_level_candidates = [
            (item, cost, idx) for item, cost, level, idx in eligible_candidates
            if level >= best_level - level_epsilon
        ]
    else:
         top_level_candidates = [
            (item, cost, idx) for item, cost, level, idx in eligible_candidates
            if level <= best_level + level_epsilon
        ]

    # 5. Elegir aleatoriamente entre los mejores
    if not top_level_candidates: # Seguridad
         # Si no hay candidatos top level (raro), elegir de los elegibles por costo
         top_level_candidates = [(item, cost, idx) for item, cost, level, idx in eligible_candidates]
         if not top_level_candidates: return None # Aún sin candidatos

    chosen_item, chosen_cost, chosen_idx = random.choice(top_level_candidates)
    return chosen_item, chosen_cost, chosen_idx


# ---------------------------------------------------------------------------
# FASE 3: REESTRUCTURADA con Prioridad 0, Mixto y Penalización Nivel/Pista
# ---------------------------------------------------------------------------
def phase_3_greedy_match_assignment(state: PairingState, potential_pairs: List[Tuple[float, Pair]]):
    """
    Intenta llenar las pistas usando un enfoque greedy, priorizando:
    0. Completar pistas con 1 par + 1 single fijo.
    1. Completar pistas con 1 par (buscando pareja completa).
    2. Llenar pistas vacías (buscando 2 parejas).
    En todos los casos, prioriza parejas/combinaciones mixtas en pozos mixtos,
    luego penaliza la desviación del nivel objetivo de la pista,
    luego usa el nivel del partido/pareja y aleatoriedad controlada.
    """
    logging.info("--- FASE 3: Asignación Greedy de Partidos (Prioridad 0, Mixto, Penalización Nivel/Pista, Nivel) ---")

    # --- Inicialización ---
    remaining_potential_pairs: List[Optional[Tuple[float, Pair]]] = [p for p in potential_pairs]
    # players_in_assigned_pairs: Jugadores asignados a un partido COMPLETO en ESTA fase
    # Usaremos state.assigned_players para la comprobación global, pero actualizaremos este set localmente
    # para evitar reasignar a alguien en la misma pasada del bucle while.
    players_in_assigned_pairs_this_phase: Set[PlayerId] = set()


    num_matches_needed = state.num_courts
    made_progress_this_iteration = True

    # --- Bucle Principal de Asignación ---
    while made_progress_this_iteration:
        made_progress_this_iteration = False
        num_matches_made = sum(1 for cd in state.courts.values() if cd.get('pair1') and cd.get('pair2'))
        logging.info(f"  Iniciando pasada de asignación greedy. Partidos completos: {num_matches_made}/{num_matches_needed}")
        if num_matches_made >= num_matches_needed: break

        # --- Identificar estado actual de las pistas incompletas ---
        fixed_singles_map: Dict[CourtNum, List[PlayerId]] = defaultdict(list)
        courts_needing_partner_for_single: List[CourtNum] = [] # Pistas con pair1 y exactamente 1 fixed_single_id
        courts_needing_full_pair: List[CourtNum] = [] # Pistas con pair1 y ningún fixed_single_id relevante
        courts_needing_two_pairs: List[CourtNum] = [] # Pistas sin pair1 ni pair2

        for court_num in range(1, state.num_courts + 1):
            court_data = state.courts[court_num]
            has_pair1 = court_data.get('pair1') is not None
            has_pair2 = court_data.get('pair2') is not None

            if has_pair1 and has_pair2: continue # Pista completa

            # Encontrar singles fijos para esta pista incompleta (jugadores en fixed_players que no están en pair1)
            current_fixed_singles_ids: List[PlayerId] = []
            ids_in_pair1 = set()
            if has_pair1:
                ids_in_pair1.update(p['id'] for p in court_data['pair1'] if p)

            for pid in court_data.get('fixed_players', set()):
                # Un 'single fijo' aquí es alguien fijo a la pista pero no en la pair1 ya existente
                if pid not in ids_in_pair1:
                    # Importante: Solo considerar si NO está ya asignado en *esta fase* a otro partido
                    # El estado global state.assigned_players puede incluirlo por Fase 1
                    if pid not in players_in_assigned_pairs_this_phase:
                         current_fixed_singles_ids.append(pid)

            if current_fixed_singles_ids:
                fixed_singles_map[court_num] = current_fixed_singles_ids

            # Clasificar la pista
            if has_pair1 and not has_pair2:
                if len(current_fixed_singles_ids) == 1:
                    courts_needing_partner_for_single.append(court_num)
                elif len(current_fixed_singles_ids) == 0:
                    courts_needing_full_pair.append(court_num)
                else: # > 1 single fijo y solo 1 pareja? Caso raro/error?
                    logging.warning(f"Pista {court_num} tiene pair1 y {len(current_fixed_singles_ids)} singles fijos sin pareja asignada. Se tratará como si necesitara pareja completa (Prioridad 1).")
                    courts_needing_full_pair.append(court_num)
            elif not has_pair1 and not has_pair2:
                 # Lógica inicial de Fase 3 (fuera del while) ya debería haber emparejado singles fijos si eran >= 2
                 # Si queda 1 single fijo en pista vacía, se tratará en Prioridad 2 (llenar vacías)
                 # Si quedan 0 singles fijos, también va a Prioridad 2.
                 # Si quedan >=2, la lógica inicial debería haber actuado o fallado.
                 courts_needing_two_pairs.append(court_num)

        # Ordenar listas para procesamiento determinista (pistas más bajas primero)
        courts_needing_partner_for_single.sort()
        courts_needing_full_pair.sort()
        courts_needing_two_pairs.sort()

        # --- PRIORIDAD 0: Completar pistas con 1 par + 1 single fijo ---
        logging.debug(f"Pistas necesitando compañero para single: {courts_needing_partner_for_single}")
        for court_num in courts_needing_partner_for_single:
            court_data = state.courts[court_num]
            # Doble check por si se completó en una iteración anterior del while
            if court_data.get('pair1') and court_data.get('pair2'): continue

            fixed_pair = court_data.get('pair1')
            single_fixed_id = fixed_singles_map.get(court_num, [None])[0] # Tomar el primero
            single_fixed_player = state.get_player(single_fixed_id) if single_fixed_id else None

            if not fixed_pair or not single_fixed_player:
                logging.error(f"Error interno (Prio 0) al procesar Pista {court_num}. Datos: fixed_pair={fixed_pair}, single_fixed_player={single_fixed_player}")
                continue

            logging.info(f"    Intentando completar Pista {court_num} [Prioridad 0] buscando compañero para {single_fixed_player.get('nombre', f'ID {single_fixed_id}')}...")

            candidate_partners_mixed: List[Tuple[Player, float, float, int]] = [] # (Partner, TotalSelectionCost, PartnerLevel, partner_id)
            candidate_partners_non_mixed: List[Tuple[Player, float, float, int]] = []
            target_level = _calculate_target_level_for_court(state, court_num) # Nivel objetivo para esta pista

            # Buscar entre jugadores NO asignados en esta fase ni globalmente (excepto el propio single)
            available_partners = [p for p in state.players.values() if p['id'] != single_fixed_id and p['id'] not in state.assigned_players and p['id'] not in players_in_assigned_pairs_this_phase]

            for potential_partner in available_partners:
                partner_id = potential_partner['id']
                # Asegurarse de que el partner no está ya en la pareja fija (doble check)
                if partner_id in {p['id'] for p in fixed_pair if p}: continue

                # 1. ¿Pueden ser pareja el single y el partner?
                if not can_be_pair(single_fixed_player, potential_partner, state): continue

                # 2. ¿La pareja formada es mixta (si aplica)?
                hypothetical_pair = tuple(sorted((single_fixed_player, potential_partner), key=lambda p: p['id']))
                is_mixed = is_pair_mixed(hypothetical_pair)
                # target_type es True si (es pozo mixto y la pareja es mixta) O (no es pozo mixto)
                is_target_type = not (state.pool_type == "mixto" and not is_mixed)

                # 3. ¿El partido completo es válido?
                if not check_match_hard_constraints(fixed_pair, hypothetical_pair, state): continue

                # 4. Calcular costo de formación + penalización por nivel/pista
                formation_cost = calculate_pair_formation_cost(single_fixed_player, potential_partner, state)
                partner_level = float(potential_partner.get('nivel', -1.0))
                match_avg_level = get_match_avg_level(fixed_pair, hypothetical_pair)
                level_penalty = 0.0
                if match_avg_level >= 0:
                    level_penalty = abs(match_avg_level - target_level) * COST_LEVEL_COURT_MISMATCH_FACTOR

                # Costo total para selección = costo formación + penalización nivel/pista
                # Usamos formation_cost como base porque buscamos el 'mejor compañero individual'
                total_selection_cost = formation_cost + level_penalty

                candidate_data = (potential_partner, total_selection_cost, partner_level, partner_id)

                if is_target_type:
                    candidate_partners_mixed.append(candidate_data)
                else: # Solo puede ser el caso de pozo mixto y pareja no mixta
                    candidate_partners_non_mixed.append(candidate_data)


            # --- Selección: Priorizar mixtas si aplica, luego menor costo selección, luego nivel partner ---
            chosen_candidate_info = None
            candidate_list_used = "Ninguna"
            if state.pool_type == "mixto" and candidate_partners_mixed:
                logging.debug(f"      Priorizando {len(candidate_partners_mixed)} compañeros MIXTOS para single fijo en Pista {court_num}")
                chosen_candidate_info = select_best_candidate(
                    candidate_partners_mixed, RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True # Priorizar mayor nivel del partner como tie-breaker
                )
                candidate_list_used = "Mixtas"
            # Fallback: usar no mixtas si no hubo mixtas o si el pool no es mixto
            elif candidate_partners_non_mixed:
                logging.debug(f"      Usando {len(candidate_partners_non_mixed)} compañeros NO MIXTOS/GENERALES para single fijo en Pista {court_num}")
                chosen_candidate_info = select_best_candidate(
                    candidate_partners_non_mixed, RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True
                )
                candidate_list_used = "No Mixtas/Generales"

            # --- Asignación si se eligió un candidato ---
            if chosen_candidate_info:
                chosen_partner, _, chosen_partner_id = chosen_candidate_info # Costo y ID
                # Recalcular costo de formación real sin penalización de nivel/pista para loggear
                chosen_formation_cost = calculate_pair_formation_cost(single_fixed_player, chosen_partner, state)
                new_pair = tuple(sorted((single_fixed_player, chosen_partner), key=lambda p: p['id']))
                new_pair_level = get_pair_level(new_pair)
                match_level = get_match_avg_level(fixed_pair, new_pair)

                logging.info(f"      -> (Completar Pista con Single) Compañero encontrado (de {candidate_list_used}): {chosen_partner.get('nombre', '?')} para {single_fixed_player.get('nombre', '?')}. "
                             f"Nueva Pareja: Nivel={new_pair_level:.2f}, CostoForm={chosen_formation_cost:.2f}, Mixta:{is_pair_mixed(new_pair) if state.pool_type=='mixto' else 'N/A'}. "
                             f"Partido Final: Nivel={match_level:.2f}")

                court_data['pair2'] = new_pair
                # Marcar jugadores como asignados EN ESTA FASE y globalmente
                players_in_assigned_pairs_this_phase.add(chosen_partner_id)
                players_in_assigned_pairs_this_phase.add(single_fixed_id)
                state.assigned_players.add(chosen_partner_id)
                state.assigned_players.add(single_fixed_id) # Asegurarse de que está
                made_progress_this_iteration = True
                # Eliminar de la lista de singles pendientes para que no se procese de nuevo
                if court_num in fixed_singles_map: del fixed_singles_map[court_num]
                break # Salir del bucle for y reiniciar el while

            else:
                logging.warning(f"    No se encontró compañero válido para {single_fixed_player.get('nombre', '?')} en Pista {court_num}.")
                # No hacer break, intentar completar otras pistas en este nivel de prioridad si las hubiera

        if made_progress_this_iteration: continue # Reiniciar el while si se hizo progreso en Prioridad 0

        # --- PRIORIDAD 1: Completar pistas con 1 pareja (y sin single fijo relevante) ---
        logging.debug(f"Pistas necesitando pareja completa: {courts_needing_full_pair}")
        for court_num in courts_needing_full_pair:
            court_data = state.courts[court_num]
            if court_data.get('pair1') and court_data.get('pair2'): continue
            fixed_pair = court_data.get('pair1')
            if not fixed_pair: continue

            logging.info(f"    Intentando completar Pista {court_num} [Prioridad 1] buscando pareja completa (fija: {fixed_pair[0].get('nombre', '?')}/{fixed_pair[1].get('nombre', '?')})...")

            candidate_pairs_mixed: List[Tuple[Pair, float, float, int]] = [] # (PairToAdd, TotalSelectionCost, MatchAvgLevel, PairIndex)
            candidate_pairs_non_mixed: List[Tuple[Pair, float, float, int]] = []
            fixed_pair_ids = {p['id'] for p in fixed_pair if p}
            target_level = _calculate_target_level_for_court(state, court_num)

            available_indices = [i for i, p_data in enumerate(remaining_potential_pairs) if p_data is not None]

            for idx in available_indices:
                cost_formation, current_pair = remaining_potential_pairs[idx] # type: ignore
                p_curr1_id, p_curr2_id = current_pair[0]['id'], current_pair[1]['id']

                # Verificar si los jugadores ya están asignados (global o en esta fase)
                if p_curr1_id in state.assigned_players or p_curr1_id in players_in_assigned_pairs_this_phase or \
                   p_curr2_id in state.assigned_players or p_curr2_id in players_in_assigned_pairs_this_phase: continue
                   
                if fixed_pair_ids.intersection({p_curr1_id, p_curr2_id}): continue
                if not check_match_hard_constraints(fixed_pair, current_pair, state): continue

                match_balance_cost = calculate_match_balance_cost(fixed_pair, current_pair)
                soft_constraints_cost = 0.0
                level_diff = abs(get_pair_level(fixed_pair) - get_pair_level(current_pair))
                if level_diff <= MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:
                    soft_constraints_cost = calculate_match_soft_constraints_cost(fixed_pair, current_pair)

                base_match_cost = match_balance_cost + soft_constraints_cost
                match_avg_level = get_match_avg_level(fixed_pair, current_pair)

                if match_avg_level >= 0:
                    level_penalty = abs(match_avg_level - target_level) * COST_LEVEL_COURT_MISMATCH_FACTOR
                    total_selection_cost = base_match_cost + level_penalty # Costo para seleccionar

                    # Clasificar
                    is_mixed = is_pair_mixed(current_pair)
                    is_target_type = not (state.pool_type == "mixto" and not is_mixed)
                    if is_target_type:
                        candidate_pairs_mixed.append((current_pair, total_selection_cost, match_avg_level, idx))
                    else:
                        candidate_pairs_non_mixed.append((current_pair, total_selection_cost, match_avg_level, idx))

            chosen_candidate_info = None
            candidate_list_used = "Ninguna"
            if state.pool_type == "mixto" and candidate_pairs_mixed:
                logging.debug(f"      Priorizando {len(candidate_pairs_mixed)} parejas MIXTAS para completar Pista {court_num}")
                chosen_candidate_info = select_best_candidate(
                    candidate_pairs_mixed, RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True # Priorizar nivel alto de PARTIDO
                )
                candidate_list_used = "Mixtas"
            elif candidate_pairs_non_mixed:
                logging.debug(f"      Usando {len(candidate_pairs_non_mixed)} parejas NO MIXTAS/GENERALES para completar Pista {court_num}")
                chosen_candidate_info = select_best_candidate(
                    candidate_pairs_non_mixed, RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True
                )
                candidate_list_used = "No Mixtas/Generales"

            if chosen_candidate_info:
                chosen_pair, _, chosen_idx = chosen_candidate_info # Costo ya incluye penalización
                chosen_match_level = get_match_avg_level(fixed_pair, chosen_pair)
                logging.info(f"      -> (Completar Pista con Par) Mejor Pareja 2 encontrada (de {candidate_list_used}): ({chosen_pair[0].get('nombre', '?')}, {chosen_pair[1].get('nombre', '?')}) "
                             # f"CostoSel: {chosen_sel_cost:.2f}, " # Log opcional
                             f"Nivel Partido: {chosen_match_level:.2f}, Mixta: {is_pair_mixed(chosen_pair) if state.pool_type == 'mixto' else 'N/A'}")
                court_data['pair2'] = chosen_pair
                pair_ids = {p['id'] for p in chosen_pair if p}
                players_in_assigned_pairs_this_phase.update(pair_ids)
                state.assigned_players.update(pair_ids)
                remaining_potential_pairs[chosen_idx] = None
                made_progress_this_iteration = True
                break
            else:
                logging.warning(f"    No se encontró segunda pareja válida (completa) para Pista {court_num}.")

        if made_progress_this_iteration: continue

        # --- PRIORIDAD 2: Llenar pistas vacías ---
        logging.debug(f"Pistas necesitando dos parejas: {courts_needing_two_pairs}")
        processed_empty_court_in_pass = False
        for court_num in courts_needing_two_pairs:
            court_data = state.courts[court_num]
            if court_data.get('pair1') or court_data.get('pair2'): continue

            logging.info(f"    Intentando llenar Pista vacía {court_num} [Prioridad 2]...")

            candidates_mm: List[Tuple[Pair, Pair, float, int, int, float]] = [] # (P1, P2, TotalSelectionCost, Idx1, Idx2, MatchAvgLevel)
            candidates_mn: List[Tuple[Pair, Pair, float, int, int, float]] = []
            candidates_nn: List[Tuple[Pair, Pair, float, int, int, float]] = []
            target_level = _calculate_target_level_for_court(state, court_num)

            available_indices = [i for i, p_data in enumerate(remaining_potential_pairs) if p_data is not None]

            for i in range(len(available_indices)):
                idx1 = available_indices[i]; pair1_data = remaining_potential_pairs[idx1]
                if not pair1_data: continue
                cost1, pair1 = pair1_data; p1a_id, p1b_id = pair1[0]['id'], pair1[1]['id']
                # Verificar si jugadores ya están asignados (global o fase)
                if p1a_id in state.assigned_players or p1a_id in players_in_assigned_pairs_this_phase or \
                   p1b_id in state.assigned_players or p1b_id in players_in_assigned_pairs_this_phase: continue

                for j in range(i + 1, len(available_indices)):
                    idx2 = available_indices[j]; pair2_data = remaining_potential_pairs[idx2]
                    if not pair2_data: continue
                    cost2, pair2 = pair2_data; p2a_id, p2b_id = pair2[0]['id'], pair2[1]['id']
                    # Verificar si jugadores ya están asignados (global o fase)
                    if p2a_id in state.assigned_players or p2a_id in players_in_assigned_pairs_this_phase or \
                       p2b_id in state.assigned_players or p2b_id in players_in_assigned_pairs_this_phase: continue

                    player_ids_match = {p1a_id, p1b_id, p2a_id, p2b_id}
                    if len(player_ids_match) < 4: continue
                    if not check_match_hard_constraints(pair1, pair2, state): continue

                    match_balance_cost = calculate_match_balance_cost(pair1, pair2)
                    soft_constraints_cost = 0.0
                    level_diff = abs(get_pair_level(pair1) - get_pair_level(pair2))
                    if level_diff <= MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:
                        soft_constraints_cost = calculate_match_soft_constraints_cost(pair1, pair2)
                    formation_cost_sum = (cost1 if cost1 is not None else 0) + (cost2 if cost2 is not None else 0)
                    
                    base_total_cost = match_balance_cost + soft_constraints_cost + formation_cost_sum
                    match_avg_level = get_match_avg_level(pair1, pair2)

                    if match_avg_level >= 0:
                         level_penalty = abs(match_avg_level - target_level) * COST_LEVEL_COURT_MISMATCH_FACTOR
                         total_selection_cost = base_total_cost + level_penalty # Costo para seleccionar

                         # Clasificar
                         is_p1_mixed = is_pair_mixed(pair1)
                         is_p2_mixed = is_pair_mixed(pair2)
                         candidate_data = (pair1, pair2, total_selection_cost, idx1, idx2, match_avg_level)
                         if state.pool_type == "mixto":
                             if is_p1_mixed and is_p2_mixed: candidates_mm.append(candidate_data)
                             elif is_p1_mixed or is_p2_mixed: candidates_mn.append(candidate_data)
                             else: candidates_nn.append(candidate_data)
                         else: candidates_nn.append(candidate_data)

            chosen_match_info = None
            candidate_list_used = "Ninguna"
            # Selección priorizada (MM -> MN -> NN)
            if state.pool_type == "mixto" and candidates_mm:
                logging.debug(f"      Priorizando {len(candidates_mm)} combinaciones Mixta-Mixta para Pista {court_num}")
                chosen_match_info = select_best_candidate(
                    [( (p1, p2), cost, level, (id1, id2) ) for p1, p2, cost, id1, id2, level in candidates_mm],
                    RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True )
                candidate_list_used = "Mixta-Mixta"
            elif state.pool_type == "mixto" and candidates_mn:
                logging.debug(f"      Usando {len(candidates_mn)} combinaciones Mixta-NoMixta para Pista {court_num}")
                chosen_match_info = select_best_candidate(
                    [( (p1, p2), cost, level, (id1, id2) ) for p1, p2, cost, id1, id2, level in candidates_mn],
                    RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True )
                candidate_list_used = "Mixta-NoMixta"
            elif candidates_nn:
                logging.debug(f"      Usando {len(candidates_nn)} combinaciones NoMixta-NoMixta/Generales para Pista {court_num}")
                chosen_match_info = select_best_candidate(
                    [( (p1, p2), cost, level, (id1, id2) ) for p1, p2, cost, id1, id2, level in candidates_nn],
                    RANDOMNESS_TOLERANCE, LEVEL_EPSILON, higher_level_better=True )
                candidate_list_used = "NoMixta-NoMixta/Generales"

            if chosen_match_info:
                (chosen_p1, chosen_p2), _, (chosen_idx1, chosen_idx2) = chosen_match_info
                chosen_match_level = get_match_avg_level(chosen_p1, chosen_p2)
                p1_mixed_str = f"Mixta:{is_pair_mixed(chosen_p1)}" if state.pool_type == 'mixto' else ""
                p2_mixed_str = f"Mixta:{is_pair_mixed(chosen_p2)}" if state.pool_type == 'mixto' else ""
                # base_chosen_cost = ... # Calcular si se quiere loggear
                logging.info(f"      -> (Pista Vacía) Mejor Combinación encontrada (de {candidate_list_used}): "
                             f"({chosen_p1[0].get('nombre', '?')},{chosen_p1[1].get('nombre', '?')}) {p1_mixed_str} vs "
                             f"({chosen_p2[0].get('nombre', '?')},{chosen_p2[1].get('nombre', '?')}) {p2_mixed_str}. "
                             # f"Costo Base Aprox: {base_chosen_cost:.2f}, " # Log opcional
                             f"Nivel Partido: {chosen_match_level:.2f}")
                court_data['pair1'] = chosen_p1
                court_data['pair2'] = chosen_p2
                pair1_ids = {p['id'] for p in chosen_p1 if p}
                pair2_ids = {p['id'] for p in chosen_p2 if p}
                players_in_assigned_pairs_this_phase.update(pair1_ids)
                players_in_assigned_pairs_this_phase.update(pair2_ids)
                state.assigned_players.update(pair1_ids)
                state.assigned_players.update(pair2_ids)
                remaining_potential_pairs[chosen_idx1] = None
                remaining_potential_pairs[chosen_idx2] = None
                made_progress_this_iteration = True
                processed_empty_court_in_pass = True
            else:
                 logging.warning(f"    No se encontró combinación válida de parejas para llenar Pista {court_num}.")

        # Fin del bucle for court_num in courts_needing_two_pairs

        # Si NO se hizo progreso en NINGUNA de las prioridades (0, 1, o 2) en esta pasada, el bucle terminará
        if not made_progress_this_iteration:
             logging.info("  No se pudo hacer más progreso en esta pasada de asignación greedy.")


    # --- Fin del Bucle While ---
    final_matches_made = sum(1 for cd in state.courts.values() if cd.get('pair1') and cd.get('pair2'))
    if final_matches_made < num_matches_needed:
         state.add_warning(f"Fase 3 finalizada. No se pudieron completar todas las pistas. ({final_matches_made}/{num_matches_needed})")
    else:
         logging.info(f"Fase 3 finalizada. Todas las pistas ({final_matches_made}/{num_matches_needed}) tienen parejas asignadas.")

    # El estado global state.assigned_players se fue actualizando durante la fase
    # No es necesario el update final que había antes.


# ---------------------------------------------------------------------------
# FASE 4: AJUSTE CASO ESPECIAL (Revisado para usar la copia local correctamente)
# ---------------------------------------------------------------------------
def phase_4_special_case_adjustment(state: PairingState):
    """Verifica y intenta ajustar el caso especial 'No Con Y No Contra'."""
    logging.info("--- FASE 4: Ajuste Caso Especial (No Con Y No Contra) ---")
    made_adjustment_in_iteration = True # Para controlar si se necesita otra pasada

    # Variable para el estado local de las asignaciones de pista
    # Se actualiza al inicio y DESPUÉS de cada swap exitoso
    current_court_assignments: Dict[CourtNum, Optional[Match]] = {}

    # Función anidada para actualizar el estado local desde state.courts
    def update_local_assignments():
        current_court_assignments.clear() # Limpiar antes de rellenar
        for court_num, data in state.courts.items():
            # Solo añadir si la pista está completa en state.courts
            pair1 = data.get('pair1')
            pair2 = data.get('pair2')
            # Validar estructura completa antes de añadir
            if pair1 and pair2 and len(pair1)==2 and len(pair2)==2 and \
               pair1[0] and pair1[1] and pair2[0] and pair2[1]:
                current_court_assignments[court_num] = (pair1, pair2)
            else:
                current_court_assignments[court_num] = None # Marcar como incompleta localmente

    update_local_assignments() # Carga inicial

    iteration_count = 0
    max_iterations = state.num_courts * 2 # Limitar las iteraciones para evitar bucles infinitos

    while made_adjustment_in_iteration and iteration_count < max_iterations:
        made_adjustment_in_iteration = False
        iteration_count += 1
        logging.info(f"  Iniciando pasada {iteration_count} de ajustes 'No Con y No Contra'...")

        # Comprobar pistas completas en orden aleatorio
        courts_to_check = [cn for cn, match in current_court_assignments.items() if match is not None]
        random.shuffle(courts_to_check)

        for court_num in courts_to_check:
            match = current_court_assignments.get(court_num)
            # Volver a verificar por si cambió durante la iteración
            if not match: continue

            pair1, pair2 = match
            players_on_court = list(pair1) + list(pair2)
            # Verificar que tenemos 4 jugadores válidos
            if len(players_on_court) != 4 or not all(isinstance(p, dict) for p in players_on_court):
                 logging.warning(f"  Pista {court_num} con estructura inválida en Fase 4. Saltando.")
                 continue

            conflict_resolved_on_this_court = False

            # Buscar conflictos en esta pista
            players_in_conflict : List[Tuple[Player, Player]] = []
            for i in range(4):
                for j in range(i + 1, 4):
                    p1 = players_on_court[i]
                    p2 = players_on_court[j]
                    no_con = check_relation(p1, p2, 'no_juega_con')
                    no_contra = check_relation(p1, p2, 'no_juega_contra')
                    if no_con and no_contra:
                        # Guardar tupla ordenada por ID para consistencia al reportar
                        players_in_conflict.append(tuple(sorted((p1,p2), key=lambda p:p['id'])))

            if players_in_conflict:
                # Procesar un conflicto al azar de los encontrados en esta pista
                p1_conflict, p2_conflict = random.choice(players_in_conflict)
                p1_name = p1_conflict.get('nombre', f"ID {p1_conflict.get('id', '?')}")
                p2_name = p2_conflict.get('nombre', f"ID {p2_conflict.get('id', '?')}")
                state.add_warning(f"    Detectado Caso Especial en Pista {court_num} (Pasada {iteration_count}): {p1_name} y {p2_name}")

                # Intentar mover al de menor nivel primero
                p_low, p_high = (p1_conflict, p2_conflict) if float(p1_conflict.get('nivel',0.0)) <= float(p2_conflict.get('nivel',0.0)) else (p2_conflict, p1_conflict)
                p_low_name = p_low.get('nombre', f"ID {p_low.get('id', '?')}")
                p_high_name = p_high.get('nombre', f"ID {p_high.get('id', '?')}")

                moved = False

                # Intentar mover p_low a una pista inferior (mayor número)
                target_courts_down = [
                    c for c in range(court_num + 1, state.num_courts + 1)
                    if current_court_assignments.get(c) # Solo a pistas completas
                ]
                random.shuffle(target_courts_down) # Probar en orden aleatorio

                for target_court_num in target_courts_down:
                    logging.info(f"      Intentando mover {p_low_name} de Pista {court_num} a Pista {target_court_num}...")
                    # Pasar la copia local 'current_court_assignments' a try_swap_player
                    if try_swap_player(state, court_num, target_court_num, p_low['id'], current_court_assignments):
                        moved = True
                        logging.info(f"        -> ¡Éxito! {p_low_name} movido a Pista {target_court_num}.")
                        # Actualizar la copia local DESPUÉS del swap exitoso para la siguiente iteración
                        update_local_assignments()
                        made_adjustment_in_iteration = True # Marcar que hubo cambio
                        conflict_resolved_on_this_court = True
                        break # Salir del bucle de pistas destino

                # Si no se pudo mover p_low hacia abajo, intentar mover p_high hacia arriba
                if not moved:
                    target_courts_up = [
                        c for c in range(1, court_num)
                        if current_court_assignments.get(c) # Solo a pistas completas
                    ]
                    random.shuffle(target_courts_up)

                    for target_court_num in target_courts_up:
                        logging.info(f"      Intentando mover {p_high_name} de Pista {court_num} a Pista {target_court_num}...")
                        # Pasar la copia local 'current_court_assignments'
                        if try_swap_player(state, court_num, target_court_num, p_high['id'], current_court_assignments):
                            moved = True
                            logging.info(f"        -> ¡Éxito! {p_high_name} movido a Pista {target_court_num}.")
                            # Actualizar la copia local DESPUÉS del swap exitoso
                            update_local_assignments()
                            made_adjustment_in_iteration = True
                            conflict_resolved_on_this_court = True
                            break # Salir del bucle de pistas destino

                if not moved:
                    # Añadir error solo si no se pudo resolver, el aviso ya se dio antes
                    state.add_error(f"    No se pudo resolver Caso Especial entre {p1_name} y {p2_name} en Pista {court_num} mediante swap. Permanecen juntos.")
                # else: # Si se movió, no añadir más logs, ya se hizo en try_swap_player

                # Si se resolvió un conflicto en esta pista, salir del bucle de pistas
                # y pasar a la siguiente pista en la pasada actual para evitar
                # intentar resolver múltiples conflictos en la misma pista en una sola pasada.
                if conflict_resolved_on_this_court:
                    break # Salir del bucle for court_num in courts_to_check


    if iteration_count >= max_iterations and made_adjustment_in_iteration:
        state.add_warning("Se alcanzó el límite de iteraciones para resolver Casos Especiales. Puede que queden conflictos residuales.")
    elif not made_adjustment_in_iteration and iteration_count > 1:
         logging.info(f"  Ajuste de Casos Especiales ('No Con y No Contra') estabilizado en pasada {iteration_count-1}.")
    elif not made_adjustment_in_iteration and iteration_count == 1:
        logging.info("  No se encontraron Casos Especiales ('No Con y No Contra') o no se pudieron realizar ajustes.")


# ---------------------------------------------------------------------------
# try_swap_player (CORREGIDO Y REVISADO para usar copia local)
# ---------------------------------------------------------------------------
def try_swap_player(state: PairingState, court_from: CourtNum, court_to: CourtNum, player_to_move_id: PlayerId, court_assignments_copy: Dict[CourtNum, Optional[Match]]) -> bool:
    """
    Intenta intercambiar un jugador entre dos pistas (usando la copia local),
    verificando restricciones. Si hay múltiples jugadores válidos para intercambiar
    en la pista destino, elige uno al azar.
    Si tiene éxito, MODIFICA TANTO state.courts COMO court_assignments_copy.
    Devuelve True si el intercambio fue exitoso, False en caso contrario.
    """
    match_from = court_assignments_copy.get(court_from)
    match_to = court_assignments_copy.get(court_to)

    # Verificar que ambas pistas existen y están completas en la copia local
    if not match_from or not match_to:
        # logging.debug(f" Intento de swap fallido: Pista {court_from} o {court_to} no está completa en court_assignments_copy.")
        return False
     # Verificar estructura básica de los matches
    if len(match_from) != 2 or len(match_to) != 2 or \
       not all(isinstance(p, tuple) and len(p)==2 for p in match_from) or \
       not all(isinstance(p, tuple) and len(p)==2 for p in match_to):
        # logging.debug(f" Intento de swap fallido: Estructura de match inválida en {court_from} o {court_to} en copia local.")
        return False

    player_to_move = state.get_player(player_to_move_id)
    if not player_to_move:
         # logging.debug(f" Intento de swap fallido: Jugador a mover ID {player_to_move_id} no encontrado.")
         return False

    # --- Encontrar pareja original del jugador a mover (en match_from) ---
    original_partner = None
    is_in_pair1_from = False
    pair1_from, pair2_from = match_from

    # Verificar estructura interna de las parejas
    if not (pair1_from and len(pair1_from)==2 and pair1_from[0] and pair1_from[1] and
            pair2_from and len(pair2_from)==2 and pair2_from[0] and pair2_from[1]):
        # logging.debug(f" Intento de swap fallido: Estructura de pareja inválida en match_from ({court_from}).")
        return False


    if player_to_move_id in {p['id'] for p in pair1_from if p}:
        original_partner = pair1_from[1] if pair1_from[0]['id'] == player_to_move_id else pair1_from[0]
        is_in_pair1_from = True
    elif player_to_move_id in {p['id'] for p in pair2_from if p}:
        original_partner = pair2_from[1] if pair2_from[0]['id'] == player_to_move_id else pair2_from[0]
        is_in_pair1_from = False
    else:
        logging.error(f"Error interno try_swap: No se encontró al jugador {player_to_move.get('nombre','N/A')} (ID: {player_to_move_id}) en Pista {court_from} ({match_from}) dentro de la copia local.")
        return False

    if not original_partner or not isinstance(original_partner, dict):
        logging.error(f"Error interno try_swap: No se encontró pareja válida para {player_to_move.get('nombre','N/A')} en Pista {court_from}.")
        return False

    # --- Encontrar TODOS los jugadores de la pista destino con los que se puede hacer swap ---
    valid_swaps_out_candidates: List[Player] = []
    pair1_to, pair2_to = match_to

    # Verificar estructura interna de las parejas destino
    if not (pair1_to and len(pair1_to)==2 and pair1_to[0] and pair1_to[1] and
            pair2_to and len(pair2_to)==2 and pair2_to[0] and pair2_to[1]):
        # logging.debug(f" Intento de swap fallido: Estructura de pareja inválida en match_to ({court_to}).")
        return False

    target_players = list(pair1_to) + list(pair2_to)

    for player_to_swap_out in target_players:
        if not player_to_swap_out or not isinstance(player_to_swap_out, dict): continue # Seguridad
        swap_out_id = player_to_swap_out.get('id')
        if swap_out_id is None: continue # Jugador inválido

        # No intercambiar consigo mismo (no debería pasar, pero por si acaso)
        if swap_out_id == player_to_move_id: continue

        # Encontrar pareja original del jugador a sacar (en match_to)
        swap_out_original_partner = None
        is_in_pair1_to = False
        if swap_out_id in {p['id'] for p in pair1_to if p}:
            swap_out_original_partner = pair1_to[1] if pair1_to[0]['id'] == swap_out_id else pair1_to[0]
            is_in_pair1_to = True
        elif swap_out_id in {p['id'] for p in pair2_to if p}:
            swap_out_original_partner = pair2_to[1] if pair2_to[0]['id'] == swap_out_id else pair2_to[0]
            is_in_pair1_to = False
        else: continue # No encontrado (no debería pasar si viene de target_players)

        if not swap_out_original_partner or not isinstance(swap_out_original_partner, dict): continue # No se encontró pareja válida

        # ---- Verificar validez del SWAP ----
        # 1. Crear nuevas parejas hipotéticas
        #    (player_to_move con swap_out_original_partner)
        #    (player_to_swap_out con original_partner)
        new_pair_target = tuple(sorted((swap_out_original_partner, player_to_move), key=lambda p:p['id']))
        new_pair_origin = tuple(sorted((original_partner, player_to_swap_out), key=lambda p:p['id']))

        # 2. Verificar si las NUEVAS parejas son válidas individualmente (can_be_pair)
        if not can_be_pair(swap_out_original_partner, player_to_move, state):
             # logging.debug(f"  Swap Inválido ({player_to_swap_out.get('nombre')}<->{player_to_move.get('nombre')}): new_pair_target ({new_pair_target[0].get('nombre')},{new_pair_target[1].get('nombre')}) no válida.")
             continue
        if not can_be_pair(original_partner, player_to_swap_out, state):
             # logging.debug(f"  Swap Inválido ({player_to_swap_out.get('nombre')}<->{player_to_move.get('nombre')}): new_pair_origin ({new_pair_origin[0].get('nombre')},{new_pair_origin[1].get('nombre')}) no válida.")
             continue

        # 3. Reconstruir partidos hipotéticos COMPLETOS
        other_pair_origin = pair2_from if is_in_pair1_from else pair1_from
        # Ordenar parejas dentro del partido por nivel medio (o como se haga consistentemente)
        hypothetical_match_origin = tuple(sorted((other_pair_origin, new_pair_origin), key=get_pair_level))

        other_pair_target = pair2_to if is_in_pair1_to else pair1_to
        hypothetical_match_target = tuple(sorted((other_pair_target, new_pair_target), key=get_pair_level))

        # 4. Verificar restricciones de los NUEVOS partidos COMPLETOS (check_match_hard_constraints)
        if not check_match_hard_constraints(hypothetical_match_origin[0], hypothetical_match_origin[1], state):
            # logging.debug(f"  Swap Inválido ({player_to_swap_out.get('nombre')}<->{player_to_move.get('nombre')}): Partido hipotético origen no válido.")
            continue
        if not check_match_hard_constraints(hypothetical_match_target[0], hypothetical_match_target[1], state):
            # logging.debug(f"  Swap Inválido ({player_to_swap_out.get('nombre')}<->{player_to_move.get('nombre')}): Partido hipotético destino no válido.")
            continue

        # 5. Verificar Pistas Fijas: Un jugador con pista fija NO puede ser movido a otra pista
        if player_to_move.get('pista_fija') is not None and int(player_to_move['pista_fija']) != court_to:
             # logging.debug(f"  Swap Inválido: {player_to_move.get('nombre')} tiene pista fija {player_to_move['pista_fija']} != {court_to}.")
             continue
        if player_to_swap_out.get('pista_fija') is not None and int(player_to_swap_out['pista_fija']) != court_from:
             # logging.debug(f"  Swap Inválido: {player_to_swap_out.get('nombre')} tiene pista fija {player_to_swap_out['pista_fija']} != {court_from}.")
             continue

        # Si pasa todo, este jugador es un candidato válido para el swap
        valid_swaps_out_candidates.append(player_to_swap_out)

    # --- Elegir un jugador para el swap al azar entre los válidos ---
    if not valid_swaps_out_candidates:
        # logging.debug(f"  No se encontraron jugadores válidos en Pista {court_to} para intercambiar con {player_to_move.get('nombre','N/A')}.")
        return False

    chosen_player_to_swap_out = random.choice(valid_swaps_out_candidates)
    swap_out_id = chosen_player_to_swap_out['id']
    logging.info(f"      Swap válido encontrado ({len(valid_swaps_out_candidates)} opciones). Realizando elegido al azar: {player_to_move.get('nombre','N/A')}(Pista {court_from}) <-> {chosen_player_to_swap_out.get('nombre','N/A')}(Pista {court_to})")

    # --- Realizar el swap elegido ---
    # Re-encontrar la pareja del jugador elegido para sacar (igual que antes)
    swap_out_original_partner = None
    is_in_pair1_to = False
    pair1_to, pair2_to = match_to # Usar las parejas originales de la pista destino
    if swap_out_id in {p['id'] for p in pair1_to if p}:
        swap_out_original_partner = pair1_to[1] if pair1_to[0]['id'] == swap_out_id else pair1_to[0]
        is_in_pair1_to = True
    elif swap_out_id in {p['id'] for p in pair2_to if p}:
        swap_out_original_partner = pair2_to[1] if pair2_to[0]['id'] == swap_out_id else pair2_to[0]
        is_in_pair1_to = False

    if not swap_out_original_partner or not isinstance(swap_out_original_partner, dict):
        logging.error(f"Error crítico al re-encontrar pareja para swap elegido {swap_out_id}. Abortando swap.")
        return False

    # Reconstruir parejas y partidos finales
    final_new_pair_origin = tuple(sorted((original_partner, chosen_player_to_swap_out), key=lambda p:p['id']))
    final_new_pair_target = tuple(sorted((swap_out_original_partner, player_to_move), key=lambda p:p['id']))

    other_pair_origin = pair2_from if is_in_pair1_from else pair1_from
    final_match_origin = tuple(sorted((other_pair_origin, final_new_pair_origin), key=get_pair_level))

    other_pair_target = pair2_to if is_in_pair1_to else pair1_to
    final_match_target = tuple(sorted((other_pair_target, final_new_pair_target), key=get_pair_level))

    # --- Aplicar el cambio AL ESTADO PRINCIPAL (state.courts) ---
    state.courts[court_from]['pair1'] = final_match_origin[0]
    state.courts[court_from]['pair2'] = final_match_origin[1]
    state.courts[court_to]['pair1'] = final_match_target[0]
    state.courts[court_to]['pair2'] = final_match_target[1]

    # --- Aplicar el cambio A LA COPIA LOCAL (court_assignments_copy) ---
    # Esto es crucial para que las siguientes iteraciones de la Fase 4 vean el estado actualizado
    court_assignments_copy[court_from] = (final_match_origin[0], final_match_origin[1])
    court_assignments_copy[court_to] = (final_match_target[0], final_match_target[1])

    # Actualizar los jugadores fijos ('fixed_players') en state.courts si se movieron entre pistas
    # Solo afecta si los jugadores movidos estaban marcados como fijos originalmente
    fixed_players_from = state.courts[court_from].get('fixed_players', set()).copy()
    fixed_players_to = state.courts[court_to].get('fixed_players', set()).copy()

    player_was_fixed_from = player_to_move_id in fixed_players_from
    swap_out_was_fixed_to = swap_out_id in fixed_players_to

    if player_was_fixed_from:
        fixed_players_from.remove(player_to_move_id)
        fixed_players_to.add(player_to_move_id)
        # logging.debug(f"      -> Jugador fijo {player_to_move.get('nombre')} movido de fixed_players {court_from} a {court_to}")
    if swap_out_was_fixed_to:
        fixed_players_to.remove(swap_out_id)
        fixed_players_from.add(swap_out_id)
        # logging.debug(f"      -> Jugador fijo {chosen_player_to_swap_out.get('nombre')} movido de fixed_players {court_to} a {court_from}")

    # Reasignar los sets actualizados al estado principal
    state.courts[court_from]['fixed_players'] = fixed_players_from
    state.courts[court_to]['fixed_players'] = fixed_players_to

    # logging.debug(f"      Swap realizado. Pista {court_from} ahora: {final_match_origin}, Pista {court_to} ahora: {final_match_target}")

    return True # Se hizo el swap


# ---------------------------------------------------------------------------
# FASE 5: RANKING Y FINALIZACIÓN (CON FORMATO DE SALIDA DETALLADO Y ALEATORIEDAD)
# ---------------------------------------------------------------------------
def phase_5_rank_courts_and_finalize(state: PairingState):
    """
    Reordena partidos por nivel medio (fijos respetados), formatea salida detallada,
    con aleatoriedad para partidos de nivel medio similar.
    """
    logging.info("--- FASE 5: Rankeando Pistas y Finalizando (Formato Detallado) ---")
    fixed_court_matches: Dict[CourtNum, Tuple[Match, float]] = {} # court_num -> (match, avg_level)
    movable_matches: List[Tuple[Match, float, CourtNum]] = [] # List of (match, avg_level, original_court_num)

    # 1. Separar partidos fijos y movibles, calcular nivel medio de cada partido COMPLETO
    logging.info("  Clasificando partidos fijos y movibles...")
    for court_num, court_data in state.courts.items():
        pair1, pair2 = court_data.get('pair1'), court_data.get('pair2')
        # Solo procesar pistas completas y válidas estructuralmente
        if pair1 and pair2 and len(pair1)==2 and len(pair2)==2 and \
           pair1[0] and pair1[1] and pair2[0] and pair2[1]:
            match = (pair1, pair2)
            match_avg_level = get_match_avg_level(pair1, pair2)

            if match_avg_level < 0: # Error en cálculo de nivel (pareja inválida?)
                logging.warning(f"Nivel de partido inválido calculado para pista {court_num} ({match_avg_level:.2f}). Saltando esta pista.")
                state.add_warning(f"Se ignoró la pista {court_num} en el ranking final debido a un nivel inválido.")
                continue

            # Determinar si el partido está FIJO a esta pista
            # Un partido se considera fijo si CUALQUIER jugador en él tiene 'pista_fija' == court_num
            is_fixed = False
            player_ids = {p.get('id') for pair in match for p in pair if p and p.get('id') is not None}
            if len(player_ids) < 4: # Algo raro pasó, jugadores duplicados o faltantes
                 logging.warning(f"Partido en Pista {court_num} tiene jugadores inválidos/faltantes: {player_ids}. Tratando como movible.")
                 is_fixed = False # No se puede considerar fijo si es inválido
            else:
                for pid in player_ids:
                    player = state.get_player(pid)
                    if not player: continue # Jugador no encontrado?
                    try:
                        pf_val = player.get('pista_fija')
                        if pf_val is not None and int(pf_val) == court_num:
                            is_fixed = True
                            # logging.debug(f"  Pista {court_num} es fija debido a {player.get('nombre')}")
                            break # Suficiente con uno
                    except (ValueError, TypeError): pass # Ignorar pista fija inválida

            if is_fixed:
                fixed_court_matches[court_num] = (match, match_avg_level)
                logging.info(f"    -> Partido Pista {court_num} FIJO (AvgN: {match_avg_level:.2f})")
            else:
                movable_matches.append((match, match_avg_level, court_num)) # Guardar num original por si acaso
                logging.info(f"    -> Partido Pista {court_num} MOVIBLE (AvgN: {match_avg_level:.2f})")

        # Si una pista no está completa pero debería (suficientes jugadores), avisar
        elif court_num <= state.num_courts and len(state.players) >= state.required_players:
             # Solo añadir aviso si no es una pista "sobrante" por falta de jugadores
             if not court_data.get('pair1') and not court_data.get('pair2'):
                 logging.warning(f"Pista {court_num} quedó vacía.")
                 # No añadir error aquí, puede ser intencional si hay jugadores con errores
             else:
                 logging.warning(f"Pista {court_num} quedó incompleta o inválida, no incluida en ranking final.")
                 state.add_warning(f"La pista {court_num} quedó incompleta y no se incluyó en el resultado final.")


    # 2. Ordenar y aleatorizar partidos movibles por nivel medio
    if movable_matches:
        # Ordenar DESCENDENTE por Nivel Medio del Partido
        movable_matches.sort(key=lambda x: x[1], reverse=True)
        logging.info(f"  {len(movable_matches)} partidos movibles ordenados por Nivel Medio (desc).")
        logging.info(f"  Aleatorizando orden entre partidos con Nivel Medio similar (Tolerancia: {LEVEL_TOLERANCE_FOR_RANKING})...")

        # Agrupar partidos con nivel similar y barajar dentro de cada grupo
        grouped_shuffled = []
        current_group : List[Tuple[Match, float, CourtNum]] = []
        if movable_matches: # Asegurarse de que la lista no está vacía
            # Iniciar primer grupo
            current_group.append(movable_matches[0])
            anchor_level = movable_matches[0][1] # Nivel del primer partido del grupo

            for i in range(1, len(movable_matches)):
                match_data = movable_matches[i]
                avg_level = match_data[1]
                # Si el nivel actual está dentro de la tolerancia del nivel ancla del grupo
                if anchor_level - avg_level <= LEVEL_TOLERANCE_FOR_RANKING:
                    current_group.append(match_data)
                else:
                    # El nivel ya es demasiado bajo, cerrar grupo anterior, barajarlo y empezar uno nuevo
                    random.shuffle(current_group) # Barajar el grupo
                    grouped_shuffled.extend(current_group) # Añadir al resultado
                    # Empezar nuevo grupo
                    current_group=[match_data]
                    anchor_level=avg_level # Nuevo nivel ancla

            # Asegurarse de añadir el último grupo
            if current_group:
                random.shuffle(current_group)
                grouped_shuffled.extend(current_group)

            movable_matches = grouped_shuffled # Reemplazar la lista ordenada por la agrupada y barajada

            logging.info("    Orden final partidos movibles (tras aleatorización por Nivel Medio):")
            for i, (match, avg_lvl, orig_court) in enumerate(movable_matches):
                 # Log simplificado para mostrar el orden resultante
                 p1_names = f"{match[0][0].get('nombre','?')}/{match[0][1].get('nombre','?')}"
                 p2_names = f"{match[1][0].get('nombre','?')}/{match[1][1].get('nombre','?')}"
                 logging.info(f"      {i+1}. AvgLvl: {avg_lvl:.2f} ({p1_names} vs {p2_names}) [Orig: Pista {orig_court}]")

    # 3. Asignar partidos a las pistas finales
    final_assignment: Dict[CourtNum, Match] = {}
    assigned_movable_matches = 0

    # Pistas disponibles (las que NO tienen un partido fijo)
    available_courts = sorted([cn for cn in range(1, state.num_courts + 1) if cn not in fixed_court_matches])
    logging.info(f"  Pistas Fijas: {sorted(fixed_court_matches.keys())}")
    logging.info(f"  Pistas Disponibles para movibles: {available_courts}")


    # a) Colocar los partidos fijos en sus pistas correspondientes
    for court_num, (match, avg_level) in fixed_court_matches.items():
        final_assignment[court_num] = match
        logging.info(f"    -> Pista {court_num} (FIJA): Partido con AvgLvl {avg_level:.2f} asignado.")

    # b) Colocar los partidos movibles (ya ordenados y aleatorizados por nivel) en las pistas disponibles
    #    Iterar por las pistas disponibles DE MENOR A MAYOR NÚMERO (1, 2, 3...)
    for court_num in available_courts:
         if assigned_movable_matches < len(movable_matches):
             # Tomar el siguiente mejor partido movible
             match, level, orig_court = movable_matches[assigned_movable_matches]
             final_assignment[court_num] = match
             logging.info(f"    -> Pista {court_num} (Disponible): Asignando partido movible #{assigned_movable_matches+1} (AvgLvl {level:.2f}, Originalmente en {orig_court})")
             assigned_movable_matches += 1
         else:
             # Nos quedamos sin partidos movibles pero aún hay pistas disponibles?
             # Esto podría pasar si hubo errores y se generaron menos partidos que pistas.
             logging.warning(f"    -> Pista {court_num} (Disponible): No quedan más partidos movibles para asignar.")


    # 4. Formatear salida detallada (ordenada por número de pista final)
    output_list = []
    assigned_ids_final = set() # IDs de jugadores que SÍ están en la salida final
    sorted_final_courts = sorted(final_assignment.keys()) # Ordenar por número de pista

    logging.info("  Formateando resultado final...")
    for court_num in sorted_final_courts:
        match = final_assignment[court_num]
        # Validación robusta de la estructura del partido ANTES de acceder a datos
        if not match or len(match)!=2 or not match[0] or not match[1] or \
           len(match[0])!=2 or len(match[1])!=2 or \
           not match[0][0] or not match[0][1] or not match[1][0] or not match[1][1] or \
           not all(isinstance(p, dict) for p in match[0]+match[1]):
             logging.error(f"Error Crítico: Partido inválido en Pista {court_num} al formatear: {match}");
             state.add_error(f"Error interno al formatear salida para Pista {court_num}. Partido descartado.")
             continue # Saltar este partido

        pA1, pA2 = match[0]; pB1, pB2 = match[1]
        pA1_id, pA2_id = pA1.get('id'), pA2.get('id'); pB1_id, pB2_id = pB1.get('id'), pB2.get('id')
        # Verificar que todos los IDs existen
        current_match_ids = {pA1_id, pA2_id, pB1_id, pB2_id}
        if None in current_match_ids or len(current_match_ids) < 4:
             logging.error(f"Error Crítico: Jugador sin ID o duplicado en Pista {court_num}: {match}. Partido descartado.")
             state.add_error(f"Error interno al formatear salida para Pista {court_num} (ID faltante o duplicado). Partido descartado.")
             continue

        avgA = get_pair_level(match[0]); avgB = get_pair_level(match[1])
        diffAvg = abs(avgA - avgB) if avgA >= 0 and avgB >= 0 else -1.0

        # ---- Crear diccionarios detallados para jugadores ----
        def get_player_details(p: Optional[Player]) -> Dict: # Aceptar Optional
            """Extrae la información relevante de un jugador para la salida."""
            if not p or not isinstance(p, dict): # Manejo por si llega un jugador None o inválido
                return {"id": None, "nombre": "ErrorJugador", "nivel": 0.0, "genero": "N/A", "mano": "N/A", "posicion": "N/A"}
            return {
                "id": p.get('id'),
                "nombre": p.get('nombre', '?'),
                "nivel": p.get('nivel', 0.0),
                "genero": p.get('genero', 'N/A'),
                "mano": p.get('mano_dominante', 'N/A'),
                "posicion": p.get('posicion', 'N/A')
            }

        equipo_A_details = [get_player_details(pA1), get_player_details(pA2)]
        equipo_B_details = [get_player_details(pB1), get_player_details(pB2)]
        # Verificar que no haya errores en los detalles
        if any(d["id"] is None for d in equipo_A_details + equipo_B_details):
             logging.error(f"Error Crítico: Error al obtener detalles de jugador en Pista {court_num}. Partido descartado.")
             state.add_error(f"Error interno al formatear detalles de jugador en Pista {court_num}. Partido descartado.")
             continue

        # ---- Calcular avisos específicos del partido ----
        match_warnings = []
        # Aviso: No mixto (solo si es pozo mixto)
        if state.pool_type == "mixto":
            gA1, gA2 = pA1.get('genero'), pA2.get('genero')
            gB1, gB2 = pB1.get('genero'), pB2.get('genero')
            if gA1 and gA2 and gA1 == gA2: match_warnings.append("P.A no mixta")
            if gB1 and gB2 and gB1 == gB2: match_warnings.append("P.B no mixta")
        # Aviso: Zurdos juntos
        if pA1.get('mano_dominante')=='zurdo' and pA2.get('mano_dominante')=='zurdo': match_warnings.append("P.A: Z-Z")
        if pB1.get('mano_dominante')=='zurdo' and pB2.get('mano_dominante')=='zurdo': match_warnings.append("P.B: Z-Z")
        # Aviso: Choque de posición
        posA1, posA2 = pA1.get('posicion'), pA2.get('posicion')
        posB1, posB2 = pB1.get('posicion'), pB2.get('posicion')
        # Usar abreviaturas (D/R/A)
        posA1_short = posA1[0].upper() if posA1 and posA1 != 'ambos' else 'A'
        posA2_short = posA2[0].upper() if posA2 and posA2 != 'ambos' else 'A'
        posB1_short = posB1[0].upper() if posB1 and posB1 != 'ambos' else 'A'
        posB2_short = posB2[0].upper() if posB2 and posB2 != 'ambos' else 'A'
        if posA1 and posA2 and posA1 != 'ambos' and posA1 == posA2: match_warnings.append(f"P.A: {posA1_short}-{posA2_short}")
        if posB1 and posB2 and posB1 != 'ambos' and posB1 == posB2: match_warnings.append(f"P.B: {posB1_short}-{posB2_short}")
        # Aviso de desequilibrio si supera umbral
        if diffAvg >= 0 and diffAvg > MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS : match_warnings.append(f"Deseq>{MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:.1f}")

        # Construir el diccionario de salida final para este partido
        match_data = {
            "pista": court_num,
            "equipo_A": equipo_A_details,
            "equipo_B": equipo_B_details,
            "avg_A": round(avgA, 2) if avgA >= 0 else -1.0,
            "avg_B": round(avgB, 2) if avgB >= 0 else -1.0,
            "diffAvg": round(diffAvg, 2) if diffAvg >= 0 else -1.0,
            "avisos": sorted(list(set(match_warnings))) # Avisos específicos del partido
        }
        output_list.append(match_data)
        # Añadir IDs de este partido a los asignados finales
        assigned_ids_final.update(current_match_ids)

    state.final_matches = output_list # Guardar la lista final en el estado

    # 5. Verificar jugadores no asignados (comparar iniciales vs finales)
    initial_valid_ids = set(state.players.keys())
    unassigned_ids = initial_valid_ids - assigned_ids_final

    if unassigned_ids:
         # Filtrar los que realmente no fueron asignados vs los que se marcaron con error antes
         truly_unassigned_names = []
         error_marked_unassigned_names = []
         for pid in unassigned_ids:
             player_name = state.players[pid].get('nombre', f'ID {pid}')
             if pid in state.assigned_players: # Estaba en el set de asignados/error del estado
                 error_marked_unassigned_names.append(player_name)
             else: # No estaba en assigned_players Y no está en la salida final
                 truly_unassigned_names.append(player_name)

         if truly_unassigned_names:
              state.add_warning(f"Jugadores válidos que quedaron sin asignar al final: {', '.join(sorted(truly_unassigned_names))}")
         if error_marked_unassigned_names:
              # Estos son jugadores que tuvieron algún problema (error, conflicto irresoluble) y no entraron en partidos
              logging.info(f"Jugadores marcados con error o conflicto irresoluble que no participaron en partidos finales: {', '.join(sorted(error_marked_unassigned_names))}")

    logging.info(f"  Formateo finalizado. {len(state.final_matches)} partidos generados.")


# --- Función Principal ---

def generar_emparejamientos(
    jugadores: List[Player],
    num_pistas: int,
    tipo_pozo: str
) -> Dict[str, Any]:
    """
    Genera los emparejamientos para un pozo siguiendo las reglas y prioridades especificadas,
    priorizando partidos de mayor nivel en pistas superiores durante la asignación
    y usando aleatoriedad controlada.
    """
    logging.info(f"--- Iniciando Emparejamiento ---")
    logging.info(f"Jugadores Recibidos: {len(jugadores)}, Pistas: {num_pistas}, Tipo: {tipo_pozo}")
    logging.info(f"Tolerancia Aleatoriedad Costo: {RANDOMNESS_TOLERANCE}, Tolerancia Aleatoriedad Nivel Ranking: {LEVEL_TOLERANCE_FOR_RANKING}")

    # Validación y preparación inicial (más robusta)
    if not isinstance(jugadores, list):
        logging.error("La entrada 'jugadores' no es una lista.")
        return {"partidos": [], "avisos": [], "errores": ["La entrada 'jugadores' no es una lista."]}
    if not isinstance(num_pistas, int) or num_pistas <= 0:
        logging.error("El número de pistas debe ser un entero positivo.")
        return {"partidos": [], "avisos": [], "errores": ["El número de pistas debe ser un entero positivo."]}

    valid_players = []
    player_ids = set()
    temp_warnings = []
    temp_errors = [] # Errores durante la validación de entrada

    logging.info("Validando datos de jugadores...")
    for i, j in enumerate(jugadores):
        if not isinstance(j, dict):
            msg = f"Elemento {i} en la lista de jugadores no es un diccionario, será ignorado."
            logging.warning(msg); temp_warnings.append(msg)
            continue
        player_id = j.get('id')
        player_name = j.get('nombre')
        if player_id is None or player_name is None:
            msg = f"Jugador {i} sin 'id' o 'nombre' válidos ({j}), será ignorado."
            logging.warning(msg); temp_warnings.append(msg)
            continue
        # Intentar convertir ID a int
        try:
            player_id = int(player_id)
        except (ValueError, TypeError):
            msg = f"ID de jugador '{player_id}' ({player_name}) no es un entero válido. Ignorando jugador."
            logging.error(msg); temp_errors.append(msg)
            continue # Error fatal para este jugador

        if player_id in player_ids:
            msg = f"ID de jugador duplicado: {player_id} ({player_name}). Se ignorará esta instancia duplicada."
            logging.warning(msg); temp_warnings.append(msg)
            continue # Ignorar duplicado

        # Limpiar y validar datos del jugador
        clean_player = {'id': player_id, 'nombre': str(player_name)}
        try:
            clean_player['nivel'] = float(j.get('nivel', 0.0))
            if not (0 <= clean_player['nivel'] <= 7): # Asumiendo un rango razonable
                 msg = f"Nivel {clean_player['nivel']} fuera de rango (0-7) para jugador {player_id} ({player_name}). Revisar."
                 logging.warning(msg); temp_warnings.append(msg)
        except (ValueError, TypeError):
            msg = f"Nivel inválido para jugador {player_id} ({player_name}). Usando 0.0. Valor original: '{j.get('nivel')}'"
            logging.warning(msg); temp_warnings.append(msg)
            clean_player['nivel'] = 0.0

        clean_player['genero'] = str(j.get('genero', 'N/A')).lower() # Estandarizar a minúsculas o N/A
        clean_player['mano_dominante'] = str(j.get('mano_dominante', 'diestro')).lower() # Estandarizar
        clean_player['posicion'] = str(j.get('posicion', 'ambos')).lower() # Estandarizar

        # Validar pista_fija como entero si existe
        pf_val = j.get('pista_fija')
        if pf_val is not None and pf_val != '':
            try:
                pf_int = int(pf_val)
                if 1 <= pf_int <= num_pistas:
                    clean_player['pista_fija'] = pf_int
                else:
                     msg = f"Pista fija {pf_int} fuera de rango (1-{num_pistas}) para jugador {player_id} ({player_name}). Ignorando pista fija."
                     logging.warning(msg); temp_warnings.append(msg)
                     clean_player['pista_fija'] = None
            except (ValueError, TypeError):
                msg = f"Pista fija inválida '{pf_val}' para jugador {player_id} ({player_name}). Ignorando pista fija."
                logging.warning(msg); temp_warnings.append(msg)
                clean_player['pista_fija'] = None
        else:
            clean_player['pista_fija'] = None

        # Validar relaciones como listas de IDs (enteros)
        for rel_type in ['juega_con', 'no_juega_con', 'juega_contra', 'no_juega_contra']:
            rel_list = j.get(rel_type, [])
            valid_rel_ids = []
            if isinstance(rel_list, list):
                for rel_id in rel_list:
                    if rel_id is None or rel_id == '': continue # Ignorar nulos o vacíos
                    try:
                        valid_rel_ids.append(int(rel_id))
                    except (ValueError, TypeError):
                        msg = f"ID inválido '{rel_id}' en relación '{rel_type}' para jugador {player_id} ({player_name}). Ignorando este ID de la relación."
                        logging.warning(msg); temp_warnings.append(msg)
                clean_player[rel_type] = valid_rel_ids
            elif rel_list is not None: # Si no es lista pero tampoco es None, es un error de formato
                 msg = f"Relación '{rel_type}' para jugador {player_id} ({player_name}) no es una lista (valor: {rel_list}). Ignorando relación completa."
                 logging.warning(msg); temp_warnings.append(msg)
                 clean_player[rel_type] = []
            else: # Si es None, simplemente es una lista vacía
                clean_player[rel_type] = []


        player_ids.add(player_id)
        valid_players.append(clean_player)
        # logging.debug(f" Jugador validado: {clean_player}")

    # Si hubo errores fatales en la validación de entrada, retornar
    if temp_errors:
         logging.error("Errores fatales durante la validación inicial de jugadores.")
         return {"partidos": [], "avisos": sorted(list(set(temp_warnings))), "errores": sorted(list(set(temp_errors)))}

    state = PairingState(valid_players, num_pistas, tipo_pozo)
    # Añadir avisos de la validación inicial al estado
    for w in temp_warnings: state.add_warning(w) # add_warning ya evita duplicados

    # Validación de número de jugadores vs pistas
    required = state.required_players
    available = len(valid_players)
    if available == 0:
         state.add_error("No hay jugadores válidos para crear partidos.")
         return {"partidos": [], "avisos": sorted(list(set(state.warnings))), "errores": sorted(list(set(state.errors)))}

    logging.info(f"Jugadores válidos: {available}. Jugadores necesarios: {required} ({num_pistas} pistas x 4).")
    if available < required:
        state.add_error(f"Número insuficiente de jugadores válidos ({available}). Se necesitan {required} para {num_pistas} pistas.")
        # Podríamos intentar continuar con menos pistas, pero por ahora es error.
        # num_pistas = available // 4
        # state.num_courts = num_pistas
        # state.required_players = num_pistas * 4
        # if num_pistas == 0: ... return error ...
        # state.add_warning(f"Continuando con {num_pistas} pistas debido a falta de jugadores.")
        return {"partidos": [], "avisos": sorted(list(set(state.warnings))), "errores": sorted(list(set(state.errors)))}
    elif available > required:
        state.add_warning(f"Hay más jugadores válidos ({available}) que plazas ({required}). {available - required} quedarán sin asignar (los de menor nivel o afectados por restricciones).")
        # No es error, el algoritmo debería manejarlo dejando fuera a los "sobrantes"


    # --- Ejecución de Fases ---
    try:
        phase_1_fixed_assignments(state)
        # Comprobar errores irresolubles de Fase 1 ANTES de continuar
        if any("Irresoluble" in e for e in state.errors):
             logging.error("Errores críticos irresolubles encontrados en Fase 1. Abortando fases posteriores.")
             # No continuar si hay errores irresolubles
        else:
            potential_pairs = phase_2_generate_potential_pairs(state)
             # Comprobar errores irresolubles de Fase 2 ANTES de continuar
            if any("Imposible" in e for e in state.errors) or any("no puede ser pareja" in e for e in state.errors):
                  logging.error("Errores críticos por parejas obligatorias/restricciones imposibles (Fase 1 o 2). Abortando fases posteriores.")
            else:
                phase_3_greedy_match_assignment(state, potential_pairs)
                # La Fase 4 intenta arreglar, no debería abortar, solo añadir errores si no puede.
                phase_4_special_case_adjustment(state)
                # La Fase 5 formatea el resultado.
                phase_5_rank_courts_and_finalize(state)

    except Exception as e:
        logging.exception("Error inesperado durante la generación de emparejamientos.")
        state.add_error(f"Error inesperado durante la ejecución: {e}")

    logging.info("--- Emparejamiento Finalizado ---")
    final_result = {
        "partidos": state.final_matches,
        "avisos": sorted(list(set(state.warnings))),
        "errores": sorted(list(set(state.errors)))
    }
    # Log detallado del resultado final para depuración si es necesario
    # logging.debug(f"Resultado final: {json.dumps(final_result, indent=2)}")
    return final_result


# --- Ejemplo de Uso (si se ejecuta como script) ---
if __name__ == '__main__':
    # (El bloque __main__ se mantiene igual que en la versión anterior)
    sample_players = [
        # Pista 1 (Nivel Alto)
        {'id': 101, 'nombre': 'Aura (N5.5)', 'nivel': 5.5, 'genero': 'mujer', 'posicion': 'reves'},
        {'id': 102, 'nombre': 'Berto (N5.0)', 'nivel': 5.0, 'genero': 'hombre', 'posicion': 'drive'},
        {'id': 103, 'nombre': 'Clara (N5.2)', 'nivel': 5.2, 'genero': 'mujer', 'posicion': 'drive'},
        {'id': 104, 'nombre': 'Dante (N4.8)', 'nivel': 4.8, 'genero': 'hombre', 'posicion': 'reves'},
        # Pista 2 (Nivel Medio-Alto)
        {'id': 105, 'nombre': 'Elena (N4.5)', 'nivel': 4.5, 'genero': 'mujer', 'posicion': 'drive'},
        {'id': 106, 'nombre': 'Félix (N4.6, Zurdo)', 'nivel': 4.6, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'reves'},
        {'id': 107, 'nombre': 'Gina (N4.3)', 'nivel': 4.3, 'genero': 'mujer', 'posicion': 'reves'},
        {'id': 108, 'nombre': 'Hugo (N4.4)', 'nivel': 4.4, 'genero': 'hombre', 'posicion': 'drive'},
         # Pista 3 (Nivel Medio, con restricciones)
        {'id': 109, 'nombre': 'Inés (N4.0, Fija 3)', 'nivel': 4.0, 'genero': 'mujer', 'posicion': 'ambos', 'pista_fija': 3},
        {'id': 110, 'nombre': 'Javier (N3.8, JuegaCon Ines)', 'nivel': 3.8, 'genero': 'hombre', 'posicion': 'ambos', 'juega_con': [109]}, # Obligados Pista 3
        {'id': 111, 'nombre': 'Karla (N3.9)', 'nivel': 3.9, 'genero': 'mujer', 'posicion': 'drive'},
        {'id': 112, 'nombre': 'Leo (N3.7, NoContra Karla)', 'nivel': 3.7, 'genero': 'hombre', 'posicion': 'reves', 'no_juega_contra': [111]},
        # Pista 4 (Nivel Medio-Bajo)
        {'id': 113, 'nombre': 'Marta (N3.2)', 'nivel': 3.2, 'genero': 'mujer', 'posicion': 'reves'},
        {'id': 114, 'nombre': 'Nico (N3.4)', 'nivel': 3.4, 'genero': 'hombre', 'posicion': 'drive'},
        {'id': 115, 'nombre': 'Olga (N3.0)', 'nivel': 3.0, 'genero': 'mujer', 'posicion': 'drive'},
        {'id': 116, 'nombre': 'Pedro (N3.1, Zurdo)', 'nivel': 3.1, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'reves'},
         # Pista 5 (Nivel Bajo, Caso Especial)
        {'id': 117, 'nombre': 'Quique (N2.5, NoCon/Contra Rita)', 'nivel': 2.5, 'genero': 'hombre', 'no_juega_con': [118], 'no_juega_contra': [118], 'posicion': 'drive'},
        {'id': 118, 'nombre': 'Rita (N2.6)', 'nivel': 2.6, 'genero': 'mujer', 'posicion': 'reves'},
        {'id': 119, 'nombre': 'Saul (N2.4)', 'nivel': 2.4, 'genero': 'hombre', 'posicion': 'reves'},
        {'id': 120, 'nombre': 'Tina (N2.3)', 'nivel': 2.3, 'genero': 'mujer', 'posicion': 'drive'},
         # Pista 6 (Nivel Muy Bajo)
        {'id': 121, 'nombre': 'Uli (N1.8)', 'nivel': 1.8, 'genero': 'hombre', 'posicion': 'ambos'},
        {'id': 122, 'nombre': 'Vera (N1.9)', 'nivel': 1.9, 'genero': 'mujer', 'posicion': 'ambos'},
        {'id': 123, 'nombre': 'Willy (N1.5)', 'nivel': 1.5, 'genero': 'hombre', 'posicion': 'ambos'},
        {'id': 124, 'nombre': 'Xena (N1.6)', 'nivel': 1.6, 'genero': 'mujer', 'posicion': 'ambos'},
        # Jugadores extra para descarte
        {'id': 125, 'nombre': 'Yago (N1.0)', 'nivel': 1.0, 'genero': 'hombre'},
        {'id': 126, 'nombre': 'Zoe (N1.2)', 'nivel': 1.2, 'genero': 'mujer'},
        # Jugador con error
        {'id': 127, 'nombre': 'ErrorPlayer (N0, Fija 99)', 'nivel': 0.0, 'genero': 'hombre', 'pista_fija': 99},
    ]

    num_courts_example = 6 # Ajustado al número de grupos de 4 definidos
    pool_type_example = "mixto"
    players_needed = num_courts_example * 4

    # Usar solo los jugadores necesarios si hay más, o todos si hay menos o igual
    if len(sample_players) > players_needed:
        print(f"INFO: Se usarán los primeros {players_needed} jugadores de la lista de ejemplo.")
        # Ordenar por nivel descendente antes de cortar podría ser mejor para el ejemplo
        sample_players.sort(key=lambda p: p.get('nivel', 0.0), reverse=True)
        sample_players_for_run = sample_players[:players_needed]
    else:
        sample_players_for_run = sample_players

    print(f"\nEjecutando con {len(sample_players_for_run)} jugadores para {num_courts_example} pistas ({pool_type_example}).")
    results = generar_emparejamientos(sample_players_for_run, num_courts_example, pool_type_example)

    print("\n--- Resultados del Emparejamiento ---")
    # Usar json.dumps para una salida más legible del diccionario completo
    print(json.dumps(results, indent=2, ensure_ascii=False))

    # Verificación adicional: ¿quiénes quedaron fuera?
    if results and isinstance(results.get('partidos'), list):
        final_ids_in_matches = set()
        for match in results["partidos"]:
            if isinstance(match.get('equipo_A'), list) and isinstance(match.get('equipo_B'), list):
                for player_detail in match['equipo_A'] + match['equipo_B']:
                    if isinstance(player_detail, dict) and player_detail.get('id') is not None:
                        final_ids_in_matches.add(player_detail['id'])

        initial_valid_ids = {p['id'] for p in sample_players_for_run if isinstance(p, dict) and p.get('id') is not None}
        missing_ids = initial_valid_ids - final_ids_in_matches

        if missing_ids:
            print("\nJugadores iniciales válidos que NO aparecen en partidos finales:")
            missing_players_details = []
            for pid in missing_ids:
                player = next((p for p in sample_players_for_run if isinstance(p, dict) and p.get('id') == pid), None)
                if player:
                    missing_players_details.append(f" - {player.get('nombre', 'N/A')} (ID: {pid}, Nivel: {player.get('nivel', 'N/A')})")
            # Ordenar por ID para consistencia
            missing_players_details.sort()
            for detail in missing_players_details:
                print(detail)
            print("(Esto puede deberse a errores, conflictos irresolubles, o ser los jugadores 'sobrantes' si había más de los necesarios)")
    else:
        print("\nNo se generaron partidos o el resultado es inválido.")