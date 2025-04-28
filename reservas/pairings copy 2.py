# pairings.py
# -*- coding: utf-8 -*-

from typing import List, Dict, Any, Tuple, Optional, Set, DefaultDict
import itertools
import random
import math
from collections import defaultdict
import logging

# --- Configuración de Logging ---
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
COST_GENDER_MISMATCH_MIXTO = 100.0   # Costo alto si una pareja no es mixta en pozo mixto (si es posible)
COST_POSITION_CLASH = 5.0       # Costo por drive-drive o reves-reves
COST_ZURDO_CLASH = 5.0          # Costo por zurdo-zurdo
COST_LEVEL_DIFF_INSIDE_PAIR = 20.0  # Costo base por cada punto de diferencia *dentro* de una pareja
COST_LEVEL_DIFF_BETWEEN_PAIRS = 1.0 # Costo base por cada punto de diferencia *entre* parejas en un partido (multiplicador)
COST_SOFT_CONSTRAINT_VIOLATION = 0.1 # Pequeño costo por violar preferencias (mano/posición) si el nivel lo permite

# Umbrales
MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS = 1.0 # Diferencia máxima de nivel medio entre parejas para ignorar choques de mano/posición

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
        self.available_players = set(self.players.keys())
        self.assigned_players: Set[PlayerId] = set()
        # Estructura: {court_num: {'pair1': Pair | None, 'pair2': Pair | None, 'fixed_players': set()}}
        self.courts: Dict[CourtNum, Dict[str, Any]] = {
            i + 1: {'pair1': None, 'pair2': None, 'fixed_players': set()} for i in range(num_courts)
        }
        self.final_matches: List[Dict] = []
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def get_player(self, player_id: PlayerId) -> Optional[Player]:
        return self.players.get(player_id)

    def is_assigned(self, player_id: PlayerId) -> bool:
        return player_id in self.assigned_players

    def get_unassigned_players(self) -> List[Player]:
        return [p for pid, p in self.players.items() if pid not in self.assigned_players]

    def add_warning(self, message: str):
        logging.warning(message)
        self.warnings.append(message)

    def add_error(self, message: str):
        logging.error(message)
        self.errors.append(message)


# --- Funciones de Validación y Cálculo ---

def calculate_pair_avg_level(p1: Player, p2: Player) -> float:
    """Calcula el nivel medio de una pareja."""
    lvl1 = float(p1.get('nivel', 0.0))
    lvl2 = float(p2.get('nivel', 0.0))
    return (lvl1 + lvl2) / 2.0

def get_pair_level(pair: Pair) -> float:
    """Obtiene el nivel medio de una pareja ya formada."""
    return calculate_pair_avg_level(pair[0], pair[1])

def check_relation(p1: Player, p2: Player, relation_type: str) -> bool:
    """Verifica si existe una relación específica (en cualquier dirección)."""
    p1_relations = p1.get(relation_type, [])
    p2_relations = p2.get(relation_type, [])
    return p2['id'] in p1_relations or p1['id'] in p2_relations

# --- Funciones de Validación de Restricciones ---

def can_be_pair(p1: Player, p2: Player, state: PairingState) -> bool:
    """Verifica si dos jugadores pueden formar pareja según las reglas duras."""
    if p1['id'] == p2['id']: return False
    # No jugar con
    if check_relation(p1, p2, 'no_juega_con'):
        return False
    # Pista fija incompatible
    p1_fixed = p1.get('pista_fija')
    p2_fixed = p2.get('pista_fija')
    # CORRECCIÓN: Permitir si uno es None y el otro tiene pista fija
    if p1_fixed is not None and p2_fixed is not None and p1_fixed != p2_fixed:
        return False
    # Género (para pozos no mixtos/parejas)
    if state.pool_type == "hombres" and (p1.get('genero') != 'hombre' or p2.get('genero') != 'hombre'):
        return False
    if state.pool_type == "mujeres" and (p1.get('genero') != 'mujer' or p2.get('genero') != 'mujer'):
        return False
    return True

def check_match_hard_constraints(pair1: Pair, pair2: Pair, state: PairingState) -> bool:
    """Verifica si un partido propuesto viola restricciones duras."""
    p1a, p1b = pair1
    p2a, p2b = pair2
    players_in_match = [p1a, p1b, p2a, p2b]
    player_ids_in_match = {p['id'] for p in players_in_match}

    # Verificar 'no_juega_contra' entre rivales
    rival_pairs = [(p1a, p2a), (p1a, p2b), (p1b, p2a), (p1b, p2b)]
    for r1, r2 in rival_pairs:
        if check_relation(r1, r2, 'no_juega_contra'):
            # logging.debug(f"Conflicto 'no_juega_contra': {r1['nombre']} vs {r2['nombre']}")
            return False

    # Verificar 'juega_contra' obligatorio no cumplido
    all_players_involved = list(state.players.values())
    for p in players_in_match:
        must_play_against_ids = p.get('juega_contra', [])
        for rival_id in must_play_against_ids:
            # Si el rival obligatorio está en el pool pero NO en este partido -> Conflicto
            if rival_id in state.players and rival_id not in player_ids_in_match:
                # logging.debug(f"Conflicto 'juega_contra' no cumplido: {p['nombre']} debe jugar contra {state.players[rival_id]['nombre']} pero no está en el partido")
                return False
             # Si el rival obligatorio está en este partido, ¿está como rival?
            elif rival_id in player_ids_in_match:
                is_partner = (rival_id == p1b['id'] if p['id'] == p1a['id'] else
                              rival_id == p1a['id'] if p['id'] == p1b['id'] else
                              rival_id == p2b['id'] if p['id'] == p2a['id'] else
                              rival_id == p2a['id'] if p['id'] == p2b['id'] else False)
                if is_partner:
                     # logging.debug(f"Conflicto 'juega_contra': {p['nombre']} debe jugar contra {state.players[rival_id]['nombre']} pero son pareja en este partido")
                     return False


    # Verificar Caso Especial: 'no_juega_con' Y 'no_juega_contra' (no pueden estar en la misma pista)
    for i in range(4):
        for j in range(i + 1, 4):
            p_i = players_in_match[i]
            p_j = players_in_match[j]
            no_con = check_relation(p_i, p_j, 'no_juega_con')
            no_contra = check_relation(p_i, p_j, 'no_juega_contra')
            if no_con and no_contra:
                # logging.debug(f"Conflicto 'Caso Especial': {p_i['nombre']} y {p_j['nombre']} no pueden compartir pista")
                return False

    return True


# --- Funciones de Cálculo de Costos/Penalizaciones ---

def calculate_pair_formation_cost(p1: Player, p2: Player, state: PairingState) -> float:
    """Calcula el costo/penalización por formar una pareja específica (menor es mejor)."""
    cost = 0.0
    lvl1 = float(p1.get('nivel', 0.0))
    lvl2 = float(p2.get('nivel', 0.0))

    # Penalización por diferencia de nivel DENTRO de la pareja
    cost += abs(lvl1 - lvl2) * COST_LEVEL_DIFF_INSIDE_PAIR

    # Penalización por género en pozo mixto (si ambos son iguales)
    if state.pool_type == "mixto" and p1.get('genero') == p2.get('genero'):
        cost += COST_GENDER_MISMATCH_MIXTO

    # Penalización por choque de zurdos
    if p1.get('mano_dominante') == 'zurdo' and p2.get('mano_dominante') == 'zurdo':
        cost += COST_ZURDO_CLASH

    # Penalización por choque de posición (drive-drive o reves-reves)
    pos1 = p1.get('posicion')
    pos2 = p2.get('posicion')
    if pos1 != 'ambos' and pos1 == pos2:
        cost += COST_POSITION_CLASH

    return cost

def calculate_match_balance_cost(pair1: Pair, pair2: Pair) -> float:
    """Calcula el costo del desequilibrio de nivel ENTRE parejas (menor es mejor)."""
    avg1 = get_pair_level(pair1)
    avg2 = get_pair_level(pair2)
    return abs(avg1 - avg2) * COST_LEVEL_DIFF_BETWEEN_PAIRS

def calculate_match_soft_constraints_cost(pair1: Pair, pair2: Pair) -> float:
    """Calcula el costo por violar restricciones suaves (mano/posición)"""
    cost = 0.0
    # Zurdo-Zurdo
    if pair1[0]['mano_dominante'] == 'zurdo' and pair1[1]['mano_dominante'] == 'zurdo':
        cost += COST_SOFT_CONSTRAINT_VIOLATION
    if pair2[0]['mano_dominante'] == 'zurdo' and pair2[1]['mano_dominante'] == 'zurdo':
        cost += COST_SOFT_CONSTRAINT_VIOLATION
    # Posición
    pos1a, pos1b = pair1[0]['posicion'], pair1[1]['posicion']
    pos2a, pos2b = pair2[0]['posicion'], pair2[1]['posicion']
    if pos1a != 'ambos' and pos1a == pos1b: cost += COST_SOFT_CONSTRAINT_VIOLATION
    if pos2a != 'ambos' and pos2a == pos2b: cost += COST_SOFT_CONSTRAINT_VIOLATION
    return cost


# --- Fases del Algoritmo ---

def phase_1_fixed_assignments(state: PairingState):
    """Procesa pistas fijas y relaciones obligatorias asociadas."""
    logging.info("--- FASE 1: Procesando Asignaciones Fijas ---")

    # --- CORRECCIÓN DEL ERROR TypeError ---
    # Función clave para ordenar: trata None como infinito para que vayan al final
    def sort_key_fixed_court(player_id):
        player = state.get_player(player_id)
        if not player:
            return float('inf') # Jugador no encontrado, al final
        pista_fija = player.get('pista_fija')
        # Trata pista_fija=None como si no tuviera pista fija (infinito)
        return pista_fija if pista_fija is not None else float('inf')

    player_ids_to_process = sorted(state.players.keys(), key=sort_key_fixed_court)
    # --- FIN CORRECCIÓN ---


    processed_in_phase1 = set()

    for pid in player_ids_to_process:
        # Si ya fue procesado (ej. como compañero de alguien con pista fija) o asignado por error previo
        if pid in processed_in_phase1 or state.is_assigned(pid):
            continue

        player = state.get_player(pid)
        # Si el jugador no tiene pista fija (valor es inf según la key), terminamos esta fase
        if sort_key_fixed_court(pid) == float('inf'):
            break

        fixed_court = player.get('pista_fija') # Ahora sabemos que no es None
        must_pair_with_ids = player.get('juega_con', [])
        must_play_against_ids = player.get('juega_contra', [])


        if fixed_court not in state.courts:
             state.add_error(f"Jugador {player['nombre']} tiene pista fija {fixed_court} inválida (Máx: {state.num_courts}).")
             continue # Saltar a procesar el siguiente jugador

        logging.info(f"  Procesando {player['nombre']} (ID: {pid}) con pista fija {fixed_court}")

        # Caso 1: Pista Fija + Juega Con
        if must_pair_with_ids:
            partner_id = must_pair_with_ids[0] # Asume solo uno
            partner = state.get_player(partner_id)

            if not partner:
                state.add_warning(f"Jugador {player['nombre']} tiene 'juega_con' ID {partner_id} que no existe.")
                continue
            if state.is_assigned(partner_id):
                 # Verificar si el partner ya asignado está en la MISMA pista fija (podría ser un single)
                 partner_is_fixed_here_single = False
                 for c_num, c_data in state.courts.items():
                     if partner_id in c_data.get('fixed_players', set()) and not c_data['pair1'] and not c_data['pair2']:
                         if c_num == fixed_court:
                             partner_is_fixed_here_single = True
                             break
                         else:
                              state.add_error(f"Conflicto: Compañero {partner['nombre']} de {player['nombre']} ya está asignado como single en pista fija {c_num} (distinta de {fixed_court}).")
                              # Marcar ambos como error?
                              state.assigned_players.add(pid)
                              state.assigned_players.add(partner_id)
                              processed_in_phase1.add(pid)
                              processed_in_phase1.add(partner_id)
                              continue # Pasar al siguiente jugador
                 # Si no es un single fijo aquí, o ya está en una pareja, advertir
                 if not partner_is_fixed_here_single:
                      state.add_warning(f"Compañero {partner['nombre']} de {player['nombre']} ya está asignado en otro lugar.")
                      continue # No formar la pareja aquí

            partner_fixed_court = partner.get('pista_fija')
            # Si el partner tiene fija explícita y es diferente -> Error
            if partner_fixed_court is not None and partner_fixed_court != fixed_court:
                state.add_error(f"Conflicto Pista Fija: {player['nombre']} (fija {fixed_court}) 'juega_con' {partner['nombre']} (fija {partner_fixed_court}). Imposible asignar.")
                state.assigned_players.add(pid)
                state.assigned_players.add(partner_id)
                processed_in_phase1.add(pid)
                processed_in_phase1.add(partner_id)
                continue

            if not can_be_pair(player, partner, state):
                 state.add_error(f"Conflicto Restricción: {player['nombre']} no puede ser pareja de {partner['nombre']} (no_juega_con, etc.) pero tienen 'juega_con'. Imposible asignar.")
                 state.assigned_players.add(pid)
                 state.assigned_players.add(partner_id)
                 processed_in_phase1.add(pid)
                 processed_in_phase1.add(partner_id)
                 continue

            # --- Asignar la pareja a la pista fija ---
            pair = tuple(sorted((player, partner), key=lambda p: p['id']))
            court_data = state.courts[fixed_court]

            # Si el partner era un single fijo en esta pista, quitarlo de fixed_players individuales
            if partner_id in court_data['fixed_players']:
                court_data['fixed_players'].remove(partner_id)


            if not court_data['pair1']:
                court_data['pair1'] = pair
                court_data['fixed_players'].update([pid, partner_id]) # Añadir ambos ahora
                state.assigned_players.update([pid, partner_id])
                processed_in_phase1.add(pid)
                processed_in_phase1.add(partner_id)
                logging.info(f"    -> Asignada pareja fija ({player['nombre']}, {partner['nombre']}) a Pista {fixed_court} (Slot 1)")
            elif not court_data['pair2']:
                 # Verificar si la nueva pareja es compatible con la existente
                 if check_match_hard_constraints(court_data['pair1'], pair, state):
                      court_data['pair2'] = pair
                      court_data['fixed_players'].update([pid, partner_id])
                      state.assigned_players.update([pid, partner_id])
                      processed_in_phase1.add(pid)
                      processed_in_phase1.add(partner_id)
                      logging.info(f"    -> Asignada pareja fija ({player['nombre']}, {partner['nombre']}) a Pista {fixed_court} (Slot 2)")
                 else:
                      state.add_error(f"Conflicto al añadir pareja fija ({player['nombre']}, {partner['nombre']}) a Pista {fixed_court}. Incompatible con pareja existente ({court_data['pair1'][0]['nombre']}, {court_data['pair1'][1]['nombre']}).")
            else:
                state.add_error(f"Pista fija {fixed_court} ya está llena de parejas, no se puede añadir a ({player['nombre']}, {partner['nombre']}).")

        # Caso 2: Pista Fija + Juega Contra (coloca al jugador, el rival se buscará después)
        elif must_play_against_ids:
             court_data = state.courts[fixed_court]
             if len(court_data['fixed_players']) + (len(court_data['pair1'] or []) * 2) + (len(court_data['pair2'] or []) * 2) < 4:
                 court_data['fixed_players'].add(pid) # Añadir como single fijo por ahora
                 state.assigned_players.add(pid)
                 processed_in_phase1.add(pid)
                 logging.info(f"    -> Asignado jugador fijo {player['nombre']} a Pista {fixed_court} (tiene 'juega_contra')")
             else:
                  state.add_error(f"Pista fija {fixed_court} llena, no se puede añadir a {player['nombre']} (con 'juega_contra').")


        # Caso 3: Pista Fija (sin relaciones obligatorias procesadas aquí)
        else:
            court_data = state.courts[fixed_court]
            # Comprobar si ya hay 4 jugadores (2 parejas o 1 pareja + 2 singles, etc.)
            current_players_count = len(court_data['fixed_players'])
            if court_data['pair1']: current_players_count += 2
            if court_data['pair2']: current_players_count += 2

            if current_players_count < 4:
                court_data['fixed_players'].add(pid) # Añadir como single fijo
                state.assigned_players.add(pid)
                processed_in_phase1.add(pid)
                logging.info(f"    -> Asignado jugador fijo {player['nombre']} a Pista {fixed_court}")
            else:
                 state.add_error(f"Pista fija {fixed_court} llena, no se puede añadir a {player['nombre']}.")


    # Validación cruzada de 'juega_contra' y pistas fijas (ahora más completa)
    logging.info("  Validando 'juega_contra' con pistas fijas...")
    players_with_fixed_court = [p for p in state.players.values() if p.get('pista_fija') is not None]

    for p1 in players_with_fixed_court:
        pid1 = p1['id']
        fixed_court_p1 = p1['pista_fija']
        must_play_against_ids = p1.get('juega_contra', [])

        for rival_id in must_play_against_ids:
            rival = state.get_player(rival_id)
            if not rival: continue # Ya se advirtió antes

            rival_fixed_court = rival.get('pista_fija')

            # Si el rival tiene pista fija DISTINTA -> Error irresoluble
            if rival_fixed_court is not None and rival_fixed_court != fixed_court_p1:
                state.add_error(f"Conflicto Pista Fija: {p1['nombre']} (fija {fixed_court_p1}) 'juega_contra' {rival['nombre']} (fija {rival_fixed_court}). Imposible.")

            # Si el rival está FIJO en la MISMA pista, verificar si son pareja
            court_data = state.courts.get(fixed_court_p1)
            if court_data and rival_id in court_data['fixed_players']:
                 pair1 = court_data['pair1']
                 pair2 = court_data['pair2']
                 is_partner = False
                 if pair1 and (pid1 == pair1[0]['id'] and rival_id == pair1[1]['id'] or pid1 == pair1[1]['id'] and rival_id == pair1[0]['id']):
                      is_partner = True
                 if pair2 and (pid1 == pair2[0]['id'] and rival_id == pair2[1]['id'] or pid1 == pair2[1]['id'] and rival_id == pair2[0]['id']):
                      is_partner = True
                 if is_partner:
                       state.add_error(f"Conflicto 'juega_contra': {p1['nombre']} y {rival['nombre']} deben ser rivales pero están como pareja fija en Pista {fixed_court_p1}.")


def phase_2_generate_potential_pairs(state: PairingState) -> List[Tuple[float, Pair]]:
    """Genera todas las parejas posibles con jugadores restantes, calculando su costo."""
    logging.info("--- FASE 2: Generando Parejas Potenciales ---")
    potential_pairs: List[Tuple[float, Pair]] = []
    unassigned_players = state.get_unassigned_players()
    processed_mandatory = set() # Para no duplicar

    # Prioridad 1: Parejas obligatorias ('juega_con')
    for p1 in unassigned_players:
        if p1['id'] in processed_mandatory: continue
        must_pair_with_ids = p1.get('juega_con', [])
        if must_pair_with_ids:
            partner_id = must_pair_with_ids[0]
            partner = state.get_player(partner_id)
            # Asegurarse de que el partner también está disponible
            if partner and partner_id not in state.assigned_players and partner_id not in processed_mandatory:
                 if not can_be_pair(p1, partner, state):
                      state.add_error(f"Conflicto en pareja obligatoria restante: {p1['nombre']} y {partner['nombre']}. No se puede formar.")
                      state.assigned_players.add(p1['id'])
                      state.assigned_players.add(partner_id)
                      processed_mandatory.add(p1['id'])
                      processed_mandatory.add(partner_id)
                      continue

                 pair = tuple(sorted((p1, partner), key=lambda p: p['id']))
                 cost = calculate_pair_formation_cost(p1, partner, state)
                 potential_pairs.append((PRIORITY_MANDATORY_RELATION + cost, pair))
                 processed_mandatory.add(p1['id'])
                 processed_mandatory.add(partner_id)
                 logging.info(f"  -> Encontrada pareja obligatoria: ({p1['nombre']}, {partner['nombre']}), Costo Base: {cost:.2f}")
            elif partner and partner_id in processed_mandatory:
                pass # Ya procesada desde el otro lado
            elif partner and partner_id in state.assigned_players:
                 state.add_warning(f"El compañero obligatorio {partner['nombre']} de {p1['nombre']} ya fue asignado en Fase 1.")
                 state.assigned_players.add(p1['id']) # Marcar como no asignable si su pareja obligatoria no está
                 processed_mandatory.add(p1['id'])


    # Prioridad 2: Resto de combinaciones
    players_for_combinations = [p for p in unassigned_players if p['id'] not in processed_mandatory]
    for p1, p2 in itertools.combinations(players_for_combinations, 2):
        if can_be_pair(p1, p2, state):
            pair = tuple(sorted((p1, p2), key=lambda p: p['id']))
            cost = calculate_pair_formation_cost(p1, p2, state)
            potential_pairs.append((cost, pair))

    # Ordenar: primero obligatorias, luego por costo ascendente
    potential_pairs.sort(key=lambda x: x[0])
    logging.info(f"  Generadas {len(potential_pairs)} parejas potenciales.")
    # for cost, pair in potential_pairs[:5]: # Log de las mejores parejas
    #     logging.debug(f"    Costo: {cost:.2f}, Pareja: ({pair[0]['nombre']}, {pair[1]['nombre']})")

    return potential_pairs


def phase_3_greedy_match_assignment(state: PairingState, potential_pairs: List[Tuple[float, Pair]]):
    """Intenta llenar las pistas usando un enfoque greedy basado en costos."""
    logging.info("--- FASE 3: Asignación Greedy de Partidos ---")

    # Convertir a lista mutable para poder eliminar elementos
    remaining_potential_pairs = list(potential_pairs)
    # Diccionario para rastrear IDs de jugadores en parejas disponibles
    available_pair_players: DefaultDict[PlayerId, List[int]] = defaultdict(list)
    for i, (cost, pair) in enumerate(remaining_potential_pairs):
         available_pair_players[pair[0]['id']].append(i)
         available_pair_players[pair[1]['id']].append(i)

    num_matches_needed = state.num_courts
    num_matches_made = sum(1 for cd in state.courts.values() if cd['pair1'] and cd['pair2']) # Contar los ya hechos en Fase 1

    assigned_pair_indices = set()

    # --- Integrar Jugadores Fijos Individuales ---
    # Intentar formar parejas con los jugadores fijos que quedaron solos
    singles_fixed_players: Dict[CourtNum, List[Player]] = defaultdict(list)
    for court_num, court_data in state.courts.items():
         # Si la pista NO tiene parejas completas AÚN
         if not court_data['pair1'] or not court_data['pair2']:
              for pid in court_data['fixed_players']:
                   # Asegurarse de que no forma parte de una pareja ya asignada en esta pista
                   part_of_pair1 = court_data['pair1'] and pid in [p['id'] for p in court_data['pair1']]
                   part_of_pair2 = court_data['pair2'] and pid in [p['id'] for p in court_data['pair2']]
                   if not part_of_pair1 and not part_of_pair2:
                        player = state.get_player(pid)
                        if player: # Asegurarse que el jugador existe
                             singles_fixed_players[court_num].append(player)

    logging.info(f"  Jugadores fijos individuales encontrados: { {c: [p['nombre'] for p in pl] for c, pl in singles_fixed_players.items()} }")

    # Intentar emparejar los singles fijos PRIMERO
    processed_singles = set()
    for court_num, singles in singles_fixed_players.items():
        if len(singles) == 2 and not state.courts[court_num]['pair1']: # Dos singles fijos pueden formar pareja
            p1, p2 = singles[0], singles[1]
            if can_be_pair(p1, p2, state):
                 pair = tuple(sorted((p1, p2), key=lambda p: p['id']))
                 state.courts[court_num]['pair1'] = pair
                 # No los añadimos a assigned_players aquí porque ya estaban por ser fijos
                 processed_singles.add(p1['id'])
                 processed_singles.add(p2['id'])
                 logging.info(f"    -> Formada pareja con singles fijos en Pista {court_num}: ({p1['nombre']}, {p2['nombre']})")
            else:
                 state.add_warning(f"Singles fijos {p1['nombre']} y {p2['nombre']} en Pista {court_num} no pueden ser pareja.")

        elif len(singles) == 1: # Un single fijo, buscarle pareja entre los restantes
             fixed_single = singles[0]
             if fixed_single['id'] in processed_singles: continue

             best_partner_for_single = None
             best_partner_cost = float('inf')
             best_potential_pair_idx_to_remove = -1 # Índice en remaining_potential_pairs

             # Buscar en las parejas potenciales restantes
             # (Esto es menos eficiente que buscar jugadores individuales)
             # Alternativa: buscar pareja individualmente
             best_individual_partner = None
             logging.info(f"    Buscando pareja para single fijo {fixed_single['nombre']} en Pista {court_num}...")

             unassigned_players = state.get_unassigned_players() # Obtener solo los no asignados
             eligible_partners = [p for p in unassigned_players if p['id'] != fixed_single['id']] # Excluirse a sí mismo

             for potential_partner in eligible_partners:
                 if can_be_pair(fixed_single, potential_partner, state):
                     cost = calculate_pair_formation_cost(fixed_single, potential_partner, state)
                     if cost < best_partner_cost:
                         # Verificar si este partner ya está en una pareja obligatoria
                         is_in_mandatory = False
                         for pc, p_pair in remaining_potential_pairs:
                              if pc <= PRIORITY_MANDATORY_RELATION: # Es obligatoria
                                   if potential_partner['id'] in [p_pair[0]['id'], p_pair[1]['id']]:
                                        is_in_mandatory = True
                                        break
                         if not is_in_mandatory:
                              best_partner_cost = cost
                              best_individual_partner = potential_partner


             if best_individual_partner:
                  pair = tuple(sorted((fixed_single, best_individual_partner), key=lambda p: p['id']))
                  logging.info(f"      -> Mejor pareja individual encontrada: {best_individual_partner['nombre']} (Costo: {best_partner_cost:.2f})")
                  # Asignar a la pista
                  court_data = state.courts[court_num]
                  if not court_data['pair1']:
                       court_data['pair1'] = pair
                       state.assigned_players.add(best_individual_partner['id']) # Marcar al nuevo como asignado
                       processed_singles.add(fixed_single['id'])
                       logging.info(f"    -> Formada pareja con single fijo en Pista {court_num}: ({fixed_single['nombre']}, {best_individual_partner['nombre']}) en Slot 1")
                  elif not court_data['pair2']:
                       # Verificar compatibilidad con pair1
                       if check_match_hard_constraints(court_data['pair1'], pair, state):
                           court_data['pair2'] = pair
                           state.assigned_players.add(best_individual_partner['id'])
                           processed_singles.add(fixed_single['id'])
                           logging.info(f"    -> Formada pareja con single fijo en Pista {court_num}: ({fixed_single['nombre']}, {best_individual_partner['nombre']}) en Slot 2")
                       else:
                            state.add_warning(f"La pareja encontrada ({fixed_single['nombre']}, {best_individual_partner['nombre']}) es incompatible con la pareja existente en Pista {court_num}.")
                  else:
                       # Esto no debería pasar si empezamos con singles
                        state.add_warning(f"Pista {court_num} ya estaba llena al intentar añadir pareja para single fijo {fixed_single['nombre']}.")

             else:
                  state.add_warning(f"No se encontró pareja adecuada para el single fijo {fixed_single['nombre']} en Pista {court_num}.")


    # --- Fin de la integración de singles fijos ---


    # Continuar llenando el resto de las pistas
    for court_num in range(1, state.num_courts + 1):
        court_data = state.courts[court_num]
        logging.info(f"  Revisando Pista {court_num} para completar...")

        # Si ya está completa (por fijos o por singles + pareja)
        if court_data['pair1'] and court_data['pair2']:
            logging.info(f"    Pista {court_num} ya completa.")
            continue

        # Si le falta la segunda pareja
        elif court_data['pair1'] and not court_data['pair2']:
            fixed_pair = court_data['pair1']
            logging.info(f"    Pista {court_num} necesita pareja 2 (tiene: ({fixed_pair[0]['nombre']}, {fixed_pair[1]['nombre']}))")
            best_match_for_court = None
            best_match_cost = float('inf')
            best_pair_idx = -1
            pair1_ids = {fixed_pair[0]['id'], fixed_pair[1]['id']}

            # Iterar sobre índices de parejas potenciales NO asignadas AÚN
            candidate_indices = set(range(len(remaining_potential_pairs))) - assigned_pair_indices

            for idx in candidate_indices:
                # Asegurarse de que la pareja en sí existe en la lista (no fue eliminada)
                 if idx >= len(remaining_potential_pairs): continue # Índice fuera de rango
                 pair_data = remaining_potential_pairs[idx]
                 if pair_data is None: continue # Pareja ya usada/eliminada
                 cost, current_pair = pair_data

                 p_curr1_id, p_curr2_id = current_pair[0]['id'], current_pair[1]['id']
                 pair2_ids = {p_curr1_id, p_curr2_id}

                 # Verificar si los jugadores de esta pareja ya están asignados en OTRA pista/parcialmente
                 # O si son los mismos que la pareja 1
                 if p_curr1_id in state.assigned_players or p_curr2_id in state.assigned_players or pair1_ids == pair2_ids:
                    continue

                 # Verificar restricciones duras del PARTIDO (fija vs actual)
                 if not check_match_hard_constraints(fixed_pair, current_pair, state):
                    continue

                 # Calcular costo total del partido
                 match_balance_cost = calculate_match_balance_cost(fixed_pair, current_pair)
                 soft_constraints_cost = 0.0
                 if match_balance_cost / COST_LEVEL_DIFF_BETWEEN_PAIRS > MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:
                      soft_constraints_cost = calculate_match_soft_constraints_cost(fixed_pair, current_pair)
                 total_match_cost = match_balance_cost + soft_constraints_cost

                 if total_match_cost < best_match_cost:
                    best_match_cost = total_match_cost
                    best_match_for_court = current_pair
                    best_pair_idx = idx # Guardar el índice original

            if best_match_for_court:
                logging.info(f"    -> Mejor pareja 2 encontrada: ({best_match_for_court[0]['nombre']}, {best_match_for_court[1]['nombre']}) Costo Partido: {best_match_cost:.2f}")
                court_data['pair2'] = best_match_for_court
                assigned_pair_indices.add(best_pair_idx) # Marcar el índice como usado
                remaining_potential_pairs[best_pair_idx] = None # Marcar como Nulo para evitar reuso
                state.assigned_players.update([p['id'] for p in best_match_for_court])
                num_matches_made += 1
            else:
                 state.add_warning(f"No se encontró pareja 2 compatible para Pista {court_num}.")


        # Si la pista está vacía (no tenía fijos ni singles)
        elif not court_data['pair1']:
            logging.info(f"    Pista {court_num} está vacía. Buscando dos parejas.")
            best_court_match: Optional[Match] = None
            best_court_match_cost = float('inf')
            best_pair1_idx = -1
            best_pair2_idx = -1

            # Obtener índices válidos y no asignados
            candidate_indices = [i for i, p_data in enumerate(remaining_potential_pairs) if p_data is not None and i not in assigned_pair_indices]

            # Iterar sobre todas las combinaciones de dos parejas restantes
            for i in range(len(candidate_indices)):
                 idx1 = candidate_indices[i]
                 cost1, pair1 = remaining_potential_pairs[idx1] # type: ignore
                 p1a_id, p1b_id = pair1[0]['id'], pair1[1]['id']

                 # Skip si ya están asignados (por si acaso en iteraciones previas)
                 if p1a_id in state.assigned_players or p1b_id in state.assigned_players: continue

                 for j in range(i + 1, len(candidate_indices)):
                      idx2 = candidate_indices[j]
                      cost2, pair2 = remaining_potential_pairs[idx2] # type: ignore
                      p2a_id, p2b_id = pair2[0]['id'], pair2[1]['id']

                      # Skip si ya están asignados
                      if p2a_id in state.assigned_players or p2b_id in state.assigned_players: continue

                      # Skip si hay jugadores comunes entre las parejas (ya comprobado por assigned_players?) No necesariamente.
                      if p1a_id == p2a_id or p1a_id == p2b_id or p1b_id == p2a_id or p1b_id == p2b_id:
                           continue

                      # Verificar restricciones duras del PARTIDO
                      if not check_match_hard_constraints(pair1, pair2, state):
                          continue

                      # Calcular costo total del partido
                      match_balance_cost = calculate_match_balance_cost(pair1, pair2)
                      soft_constraints_cost = 0.0
                      if match_balance_cost / COST_LEVEL_DIFF_BETWEEN_PAIRS > MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:
                           soft_constraints_cost = calculate_match_soft_constraints_cost(pair1, pair2)

                      formation_cost_sum = cost1 + cost2
                      total_match_cost = (match_balance_cost * 5) + soft_constraints_cost + formation_cost_sum

                      if total_match_cost < best_court_match_cost:
                           best_court_match_cost = total_match_cost
                           best_court_match = (pair1, pair2)
                           best_pair1_idx = idx1
                           best_pair2_idx = idx2

            if best_court_match:
                 p1, p2 = best_court_match
                 logging.info(f"    -> Mejor combinación encontrada: ({p1[0]['nombre']},{p1[1]['nombre']}) vs ({p2[0]['nombre']},{p2[1]['nombre']}) Costo Total: {best_court_match_cost:.2f}")
                 court_data['pair1'] = p1
                 court_data['pair2'] = p2
                 assigned_pair_indices.add(best_pair1_idx)
                 assigned_pair_indices.add(best_pair2_idx)
                 remaining_potential_pairs[best_pair1_idx] = None # Marcar como usadas
                 remaining_potential_pairs[best_pair2_idx] = None
                 state.assigned_players.update([p['id'] for p in p1] + [p['id'] for p in p2])
                 num_matches_made += 1
            else:
                 state.add_warning(f"No se encontró combinación de dos parejas válidas para Pista {court_num}.")


    if num_matches_made < num_matches_needed:
         state.add_warning(f"No se pudieron completar todas las pistas. ({num_matches_made}/{num_matches_needed})")


def phase_4_special_case_adjustment(state: PairingState):
    """Verifica y intenta ajustar el caso especial 'No Con Y No Contra'."""
    logging.info("--- FASE 4: Ajuste Caso Especial (No Con Y No Contra) ---")
    made_adjustment_in_iteration = True # Para controlar si se necesita otra pasada

    # Usaremos una copia del estado de las pistas para evitar problemas al modificar durante la iteración
    current_court_assignments: Dict[CourtNum, Optional[Match]] = {}
    def update_local_assignments():
         for court_num, data in state.courts.items():
              if data['pair1'] and data['pair2']:
                   current_court_assignments[court_num] = (data['pair1'], data['pair2'])
              else:
                   current_court_assignments[court_num] = None # Pista incompleta

    update_local_assignments()

    iteration_count = 0
    max_iterations = state.num_courts * 2 # Limitar las iteraciones para evitar bucles infinitos

    while made_adjustment_in_iteration and iteration_count < max_iterations:
        made_adjustment_in_iteration = False
        iteration_count += 1
        logging.info(f"  Iniciando pasada {iteration_count} de ajustes...")

        courts_to_check = sorted(current_court_assignments.keys())

        for court_num in courts_to_check:
            match = current_court_assignments.get(court_num)
            if not match: continue

            pair1, pair2 = match
            players_on_court = list(pair1) + list(pair2)
            conflict_resolved_on_this_court = False

            for i in range(4):
                if conflict_resolved_on_this_court: break # Si ya movimos a alguien de esta pista, re-evaluar en la siguiente pasada
                for j in range(i + 1, 4):
                    p1 = players_on_court[i]
                    p2 = players_on_court[j]
                    pid1, pid2 = p1['id'], p2['id']

                    no_con = check_relation(p1, p2, 'no_juega_con')
                    no_contra = check_relation(p1, p2, 'no_juega_contra')

                    if no_con and no_contra:
                        state.add_warning(f"  Detectado Caso Especial en Pista {court_num} (Pasada {iteration_count}): {p1['nombre']} y {p2['nombre']}")

                        p_low, p_high = (p1, p2) if p1['nivel'] <= p2['nivel'] else (p2, p1)
                        moved = False

                        # Intentar mover p_low hacia abajo
                        for offset in [1, 3, 5, 7]:
                            target_court_num = court_num + offset
                            if target_court_num > state.num_courts: break
                            logging.info(f"    Intentando mover a {p_low['nombre']} de Pista {court_num} a {target_court_num}...")
                            if try_swap_player(state, court_num, target_court_num, p_low['id'], current_court_assignments):
                                 moved = True
                                 logging.info(f"      -> ¡Éxito! {p_low['nombre']} movido a Pista {target_court_num}.")
                                 update_local_assignments() # Actualizar nuestra copia local del estado
                                 made_adjustment_in_iteration = True
                                 conflict_resolved_on_this_court = True
                                 break # Salir del loop de offset

                        # Si no, intentar mover p_high hacia arriba
                        if not moved:
                             for offset in [-1, -3, -5, -7]:
                                 target_court_num = court_num + offset
                                 if target_court_num < 1: break
                                 logging.info(f"    Intentando mover a {p_high['nombre']} de Pista {court_num} a {target_court_num}...")
                                 if try_swap_player(state, court_num, target_court_num, p_high['id'], current_court_assignments):
                                      moved = True
                                      logging.info(f"      -> ¡Éxito! {p_high['nombre']} movido a Pista {target_court_num}.")
                                      update_local_assignments()
                                      made_adjustment_in_iteration = True
                                      conflict_resolved_on_this_court = True
                                      break

                        if not moved:
                             state.add_error(f"  No se pudo resolver Caso Especial entre {p1['nombre']} y {p2['nombre']} en Pista {court_num}. Permanecen juntos.")
                        else:
                             # Si se hizo un movimiento, salir del bucle interno (j) para re-evaluar la pista en la siguiente iteración si es necesario
                             break
            # Salir del bucle externo (i) si se resolvió conflicto para esta pista
            if conflict_resolved_on_this_court:
                 break

    if iteration_count >= max_iterations:
         state.add_warning("Se alcanzó el límite de iteraciones para resolver Casos Especiales. Puede que queden conflictos.")


def try_swap_player(state: PairingState, court_from: CourtNum, court_to: CourtNum, player_to_move_id: PlayerId, current_assignments: Dict[CourtNum, Optional[Match]]) -> bool:
    """Intenta intercambiar un jugador entre dos pistas, verificando restricciones."""
    match_from = current_assignments.get(court_from)
    match_to = current_assignments.get(court_to)

    if not match_from or not match_to:
        logging.debug(f"      Intento de swap fallido: Pista {court_from} o {court_to} no está completa.")
        return False

    player_to_move = state.get_player(player_to_move_id)
    if not player_to_move: return False # Seguridad

    original_pair = None
    original_partner = None
    is_in_pair1_from = False
    for idx, p in enumerate(match_from[0]): # Buscar en pareja 1 de origen
        if p['id'] == player_to_move_id:
            original_pair = match_from[0]
            original_partner = match_from[0][1-idx] # El otro jugador de la pareja
            is_in_pair1_from = True
            break
    if not original_pair: # Si no estaba en la pareja 1, buscar en la 2
         for idx, p in enumerate(match_from[1]):
             if p['id'] == player_to_move_id:
                  original_pair = match_from[1]
                  original_partner = match_from[1][1-idx]
                  break

    if not original_pair or not original_partner:
        logging.error(f"      Error interno: No se encontró al jugador {player_to_move_id} o su pareja en Pista {court_from}.")
        return False


    target_players = list(match_to[0]) + list(match_to[1])
    for player_to_swap_out in target_players:
        swap_out_id = player_to_swap_out['id']
        logging.debug(f"      Considerando swap: {player_to_move['nombre']}({court_from}) <-> {player_to_swap_out['nombre']}({court_to})")

        # Encontrar pareja del jugador a sacar
        swap_out_original_pair = None
        swap_out_original_partner = None
        is_in_pair1_to = False
        for idx, p in enumerate(match_to[0]):
            if p['id'] == swap_out_id:
                swap_out_original_pair = match_to[0]
                swap_out_original_partner = match_to[0][1-idx]
                is_in_pair1_to = True
                break
        if not swap_out_original_pair:
            for idx, p in enumerate(match_to[1]):
                 if p['id'] == swap_out_id:
                      swap_out_original_pair = match_to[1]
                      swap_out_original_partner = match_to[1][1-idx]
                      break

        if not swap_out_original_pair or not swap_out_original_partner:
             logging.error(f"      Error interno: No se encontró pareja para {swap_out_id} en Pista {court_to}.")
             continue # Error, probar con el siguiente jugador

        # 1. Crear nueva pareja en pista ORIGEN (partner_original + swap_out)
        new_pair_origin = tuple(sorted((original_partner, player_to_swap_out), key=lambda p:p['id']))
        # 2. Crear nueva pareja en pista DESTINO (partner_swap_out + player_to_move)
        new_pair_target = tuple(sorted((swap_out_original_partner, player_to_move), key=lambda p:p['id']))

        # 3. Verificar si las NUEVAS parejas son válidas
        if not can_be_pair(original_partner, player_to_swap_out, state):
             logging.debug(f"        -> Swap inválido (can_be_pair): {original_partner['nombre']} y {player_to_swap_out['nombre']}")
             continue
        if not can_be_pair(swap_out_original_partner, player_to_move, state):
             logging.debug(f"        -> Swap inválido (can_be_pair): {swap_out_original_partner['nombre']} y {player_to_move['nombre']}")
             continue

        # 4. Reconstruir los partidos hipotéticos
        other_pair_origin = match_from[1] if is_in_pair1_from else match_from[0]
        hypothetical_match_origin = tuple(sorted((other_pair_origin, new_pair_origin), key=get_pair_level)) # Ordenar por nivel ayuda consistencia

        other_pair_target = match_to[1] if is_in_pair1_to else match_to[0]
        hypothetical_match_target = tuple(sorted((other_pair_target, new_pair_target), key=get_pair_level))

        # 5. Verificar restricciones duras de los NUEVOS partidos
        if not check_match_hard_constraints(hypothetical_match_origin[0], hypothetical_match_origin[1], state):
             logging.debug(f"        -> Swap inválido: Conflicto en nuevo partido de Pista {court_from}")
             continue
        if not check_match_hard_constraints(hypothetical_match_target[0], hypothetical_match_target[1], state):
             logging.debug(f"        -> Swap inválido: Conflicto en nuevo partido de Pista {court_to}")
             continue

        # ¡Swap Válido! Realizar el cambio en el estado principal
        logging.info(f"      Swap válido encontrado y realizado: {player_to_move['nombre']}({court_from}) con {player_to_swap_out['nombre']}({court_to})")
        state.courts[court_from]['pair1'] = hypothetical_match_origin[0]
        state.courts[court_from]['pair2'] = hypothetical_match_origin[1]
        state.courts[court_to]['pair1'] = hypothetical_match_target[0]
        state.courts[court_to]['pair2'] = hypothetical_match_target[1]

        # Actualizar current_assignments (la copia local) para la siguiente iteración de esta fase
        current_assignments[court_from] = (state.courts[court_from]['pair1'], state.courts[court_from]['pair2'])
        current_assignments[court_to] = (state.courts[court_to]['pair1'], state.courts[court_to]['pair2'])

        # Actualizar los jugadores fijos si se movieron
        fixed_players_from = state.courts[court_from].get('fixed_players', set())
        fixed_players_to = state.courts[court_to].get('fixed_players', set())
        if player_to_move_id in fixed_players_from:
             fixed_players_from.remove(player_to_move_id)
             fixed_players_to.add(player_to_move_id)
        if swap_out_id in fixed_players_to:
             fixed_players_to.remove(swap_out_id)
             fixed_players_from.add(swap_out_id)
        # Reasignar los sets actualizados
        state.courts[court_from]['fixed_players'] = fixed_players_from
        state.courts[court_to]['fixed_players'] = fixed_players_to


        return True # Se hizo el swap

    logging.debug(f"      No se encontró swap válido para {player_to_move['nombre']} hacia pista {court_to}.")
    return False


def phase_5_rank_courts_and_finalize(state: PairingState):
    """Reordena los partidos por nivel (respetando fijos) y formatea la salida."""
    logging.info("--- FASE 5: Rankeando Pistas y Finalizando ---")

    completed_matches: List[Tuple[CourtNum, Match, float]] = []
    fixed_court_matches: Dict[CourtNum, Tuple[Match, float]] = {}
    movable_matches: List[Tuple[Match, float]] = []

    for court_num, court_data in state.courts.items():
        if court_data['pair1'] and court_data['pair2']:
            match = (court_data['pair1'], court_data['pair2'])
            level1 = get_pair_level(match[0])
            level2 = get_pair_level(match[1])
            match_avg_level = (level1 + level2) / 2.0

            # Es fijo si ALGÚN jugador de este partido tiene pista_fija == court_num
            is_fixed_to_this_court = False
            players_in_match_ids = {p['id'] for pair in match for p in pair}
            for pid in players_in_match_ids:
                 player = state.get_player(pid)
                 if player and player.get('pista_fija') == court_num:
                      is_fixed_to_this_court = True
                      break
                 # Considerar también si la pista contiene jugadores marcados como fijos en Fase 1
                 if pid in court_data.get('fixed_players', set()):
                     # Asegurarse de que su pista fija coincide (podrían haber sido movidos)
                     player_actual = state.get_player(pid)
                     if player_actual and player_actual.get('pista_fija') == court_num:
                           is_fixed_to_this_court = True
                           break


            if is_fixed_to_this_court:
                 fixed_court_matches[court_num] = (match, match_avg_level)
                 logging.info(f"  Partido en Pista {court_num} es FIJO (Nivel Medio: {match_avg_level:.2f})")
            else:
                 movable_matches.append((match, match_avg_level))
                 logging.info(f"  Partido de Pista {court_num} (Original) es MOVIBLE (Nivel Medio: {match_avg_level:.2f})")
        else:
             state.add_warning(f"Pista {court_num} quedó incompleta, no se incluirá en el ranking ni salida final.")

    # Ordenar los partidos movibles por nivel descendente
    movable_matches.sort(key=lambda x: x[1], reverse=True)

    # Asignar partidos a las pistas finales
    final_assignment: Dict[CourtNum, Match] = {}
    movable_idx = 0
    available_movable_courts = sorted([cn for cn in range(1, state.num_courts + 1) if cn not in fixed_court_matches])

    # 1. Colocar los fijos
    for court_num, (match, _) in fixed_court_matches.items():
        final_assignment[court_num] = match

    # 2. Colocar los movibles en los huecos restantes, ordenados por nivel
    for court_num in available_movable_courts:
         if movable_idx < len(movable_matches):
              match, level = movable_matches[movable_idx]
              final_assignment[court_num] = match
              logging.info(f"  -> Asignando partido movible (Nivel {level:.2f}) a Pista {court_num}")
              movable_idx += 1
         else:
              logging.warning(f"  No quedan partidos movibles para asignar a Pista {court_num}")


    # Formatear salida final
    output_list = []
    assigned_ids_final = set()

    sorted_final_courts = sorted(final_assignment.keys())
    for court_num in sorted_final_courts:
        match = final_assignment[court_num]
        pairA, pairB = match
        pA1, pA2 = pairA
        pB1, pB2 = pairB

        avgA = get_pair_level(pairA)
        avgB = get_pair_level(pairB)
        diffAvg = abs(avgA - avgB)

        # Recalcular avisos específicos del partido final
        match_warnings = []
        if state.pool_type == "mixto":
            if pA1['genero'] == pA2['genero']: match_warnings.append("Pareja A no mixta")
            if pB1['genero'] == pB2['genero']: match_warnings.append("Pareja B no mixta")
        if pA1['mano_dominante'] == 'zurdo' and pA2['mano_dominante'] == 'zurdo': match_warnings.append("Pareja A: Zurdo-Zurdo")
        if pB1['mano_dominante'] == 'zurdo' and pB2['mano_dominante'] == 'zurdo': match_warnings.append("Pareja B: Zurdo-Zurdo")
        posA1, posA2 = pA1['posicion'], pA2['posicion']
        posB1, posB2 = pB1['posicion'], pB2['posicion']
        if posA1 != 'ambos' and posA1 == posA2: match_warnings.append(f"Pareja A: {posA1.capitalize()}-{posA2.capitalize()}")
        if posB1 != 'ambos' and posB1 == posB2: match_warnings.append(f"Pareja B: {posB1.capitalize()}-{posB2.capitalize()}")
        if diffAvg > MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS : match_warnings.append(f"Desequilibrio > {MAX_LEVEL_DIFF_FOR_SOFT_CONSTRAINTS:.1f}")


        match_data = {
            "pista": court_num,
            "teams": [[pA1["nombre"], pA2["nombre"]], [pB1["nombre"], pB2["nombre"]]],
            "ids": [[pA1["id"], pA2["id"]], [pB1["id"], pB2["id"]]],
            "avgs": [round(avgA, 2), round(avgB, 2)],
            "diffAvg": round(diffAvg, 2),
            "totals": [round(pA1['nivel'] + pA2['nivel'], 2), round(pB1['nivel'] + pB2['nivel'], 2)],
            "diffTot": round(abs((pA1['nivel'] + pA2['nivel']) - (pB1['nivel'] + pB2['nivel'])), 2),
            "avisos": match_warnings
        }
        output_list.append(match_data)
        assigned_ids_final.update([pA1["id"], pA2["id"], pB1["id"], pB2["id"]])

    state.final_matches = output_list

    # Verificar jugadores no asignados
    unassigned_players_list = [p['nombre'] for pid, p in state.players.items() if pid not in assigned_ids_final and pid not in state.assigned_players] # Excluir los marcados como error/no asignables
    if unassigned_players_list:
        state.add_warning(f"Jugadores no asignados al final: {', '.join(unassigned_players_list)}")



# --- Función Principal ---

def generar_emparejamientos(
    jugadores: List[Player],
    num_pistas: int,
    tipo_pozo: str
) -> Dict[str, Any]:
    """
    Genera los emparejamientos para un pozo siguiendo las reglas y prioridades especificadas.
    """
    logging.info(f"--- Iniciando Emparejamiento ---")
    logging.info(f"Jugadores: {len(jugadores)}, Pistas: {num_pistas}, Tipo: {tipo_pozo}")

    # Asegurar que nivel es float
    for j in jugadores:
        j['nivel'] = float(j.get('nivel', 0.0))

    state = PairingState(jugadores, num_pistas, tipo_pozo)

    # Validación inicial
    if len(jugadores) < state.required_players:
        state.add_error(f"Número insuficiente de jugadores. Se necesitan {state.required_players}, hay {len(jugadores)}.")
        return {"partidos": [], "avisos": state.warnings, "errores": state.errors}
    if len(jugadores) > state.required_players:
        state.add_warning(f"Hay más jugadores ({len(jugadores)}) que plazas ({state.required_players}). Se ignorarán los sobrantes o no asignados.")
        # El algoritmo ya maneja esto al no poder asignar a todos si no hay hueco

    # --- Ejecución de Fases ---
    try:
        phase_1_fixed_assignments(state)

        if state.errors: # Errores irresolubles en Fase 1
             # Filtrar errores duplicados
             unique_errors = sorted(list(set(state.errors)))
             logging.error("Errores críticos encontrados en Fase 1. Abortando.")
             return {"partidos": [], "avisos": sorted(list(set(state.warnings))), "errores": unique_errors}

        potential_pairs = phase_2_generate_potential_pairs(state)

        phase_3_greedy_match_assignment(state, potential_pairs)

        phase_4_special_case_adjustment(state) # Intentar ajustar el caso especial

        phase_5_rank_courts_and_finalize(state) # Rankear y formatear salida

    except Exception as e:
        logging.exception("Error inesperado durante la generación de emparejamientos.")
        state.add_error(f"Error inesperado: {e}")

    logging.info("--- Emparejamiento Finalizado ---")
    # Devolver resultado con avisos y errores únicos y ordenados
    return {
        "partidos": state.final_matches,
        "avisos": sorted(list(set(state.warnings))),
        "errores": sorted(list(set(state.errors)))
    }


# --- Ejemplo de Uso (si se ejecuta como script) ---
if __name__ == '__main__':
    sample_players = [
        {'id': 1, 'nombre': 'Alice (N5, Fija 1)', 'nivel': 5.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'reves', 'pista_fija': 1},
        {'id': 2, 'nombre': 'Bob (N4, JuegaCon Alice)', 'nivel': 4.0, 'genero': 'hombre', 'mano_dominante': 'diestro', 'posicion': 'drive', 'juega_con': [1]},
        {'id': 3, 'nombre': 'Charlie (N3)', 'nivel': 3.0, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'reves'},
        {'id': 4, 'nombre': 'Diana (N3, NoCon Bob)', 'nivel': 3.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'drive', 'no_juega_con': [2]},
        {'id': 5, 'nombre': 'Eve (N2, Contra Frank)', 'nivel': 2.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'ambos', 'juega_contra': [6]},
        {'id': 6, 'nombre': 'Frank (N2)', 'nivel': 2.0, 'genero': 'hombre', 'mano_dominante': 'diestro', 'posicion': 'ambos'},
        {'id': 7, 'nombre': 'George (N1)', 'nivel': 1.0, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'drive'},
        {'id': 8, 'nombre': 'Heidi (N1, NoCon/Contra George)', 'nivel': 1.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'reves', 'no_juega_con': [7], 'no_juega_contra': [7]},
        {'id': 9, 'nombre': 'Ivan (N4)', 'nivel': 4.0, 'genero': 'hombre', 'mano_dominante': 'diestro', 'posicion': 'reves'},
        {'id': 10, 'nombre': 'Judy (N4)', 'nivel': 4.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'drive'},
        {'id': 11, 'nombre': 'Ken (N3)', 'nivel': 3.0, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'reves'},
        {'id': 12, 'nombre': 'Laura (N3)', 'nivel': 3.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'drive'},
        {'id': 13, 'nombre': 'Mike (N2, Fija None)', 'nivel': 2.0, 'genero': 'hombre', 'mano_dominante': 'diestro', 'posicion': 'ambos', 'pista_fija': None}, # Añadido caso con None
        {'id': 14, 'nombre': 'Nora (N2)', 'nivel': 2.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'ambos'},
        {'id': 15, 'nombre': 'Oscar (N1)', 'nivel': 1.0, 'genero': 'hombre', 'mano_dominante': 'zurdo', 'posicion': 'drive'},
        {'id': 16, 'nombre': 'Pam (N1)', 'nivel': 1.0, 'genero': 'mujer', 'mano_dominante': 'diestro', 'posicion': 'reves'},

    ]

    num_courts_example = 4
    pool_type_example = "mixto"

    if len(sample_players) < num_courts_example * 4:
         print(f"ADVERTENCIA: El ejemplo tiene {len(sample_players)} jugadores, pero se necesitan {num_courts_example * 4} para {num_courts_example} pistas.")

    results = generar_emparejamientos(sample_players, num_courts_example, pool_type_example)

    print("\n--- Resultados del Emparejamiento ---")
    if results.get("errores"):
        print("Errores encontrados:")
        for err in results["errores"]:
            print(f"  - {err}")
    if results.get("avisos"):
        print("\nAvisos generados:")
        for warn in results["avisos"]:
            print(f"  - {warn}")

    print("\nPartidos Generados:")
    if results.get("partidos"):
        import json
        print(json.dumps(results["partidos"], indent=2))
    else:
        print("No se generaron partidos.")