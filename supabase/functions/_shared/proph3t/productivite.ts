// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : PRODUCTIVITE / Project mgmt
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. prioritize_tasks            : tri Eisenhower (urgent/important)
//   2. compute_meeting_efficiency  : score reunion (cout × valeur)
//   3. schedule_optimization       : optimise calendrier (focus blocks)
//   4. estimate_project_duration   : 3-points estimate (PERT)
//   5. compute_team_capacity       : capacite reelle d'une equipe
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Prioritization Eisenhower ──────────────────────────────────────────
/**
 * Matrice d'Eisenhower : urgent × important.
 *   Q1 : Urgent + Important = FAIRE MAINTENANT
 *   Q2 : Pas urgent + Important = PLANIFIER
 *   Q3 : Urgent + Pas important = DELEGUER
 *   Q4 : Pas urgent + Pas important = ELIMINER
 */
export function prioritizeTasks(args: {
  tasks: { id: string; title: string; urgent: boolean; important: boolean; estimated_hours?: number; deadline?: string }[];
}): {
  ok: boolean;
  matrice: {
    Q1_faire_maintenant: { id: string; title: string; estimated_hours?: number; deadline?: string }[];
    Q2_planifier: { id: string; title: string; estimated_hours?: number; deadline?: string }[];
    Q3_deleguer: { id: string; title: string; estimated_hours?: number; deadline?: string }[];
    Q4_eliminer: { id: string; title: string; estimated_hours?: number; deadline?: string }[];
  };
  recommandation_principale: string;
  charge_q1_heures: number;
  alerte_surcharge: boolean;
} {
  const Q1: any[] = [], Q2: any[] = [], Q3: any[] = [], Q4: any[] = [];
  for (const t of args.tasks) {
    const target = t.urgent
      ? (t.important ? Q1 : Q3)
      : (t.important ? Q2 : Q4);
    target.push({ id: t.id, title: t.title, estimated_hours: t.estimated_hours, deadline: t.deadline });
  }
  const chargeQ1 = Q1.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const alerte = chargeQ1 > 8;

  let reco = "";
  if (Q1.length > 5) reco = `${Q1.length} taches urgentes+importantes : risque burnout, deleguer ou negocier deadlines`;
  else if (Q4.length > Q2.length) reco = "Trop de taches en Q4 (eliminer). Recentrer sur Q2 (planifier l'important non-urgent)";
  else if (Q2.length === 0) reco = "Pas de Q2 : reactif uniquement. Bloquer du temps pour les sujets strategiques";
  else reco = "Equilibre correct. Maintenir focus Q1+Q2.";

  return {
    ok: true,
    matrice: { Q1_faire_maintenant: Q1, Q2_planifier: Q2, Q3_deleguer: Q3, Q4_eliminer: Q4 },
    recommandation_principale: reco,
    charge_q1_heures: chargeQ1,
    alerte_surcharge: alerte,
  };
}

// ─── 2. Meeting efficiency ──────────────────────────────────────────────────
/**
 * Score d'efficacite d'une reunion = (valeur_decisions / cout_reunion).
 *
 *   cout = duree × nb_participants × taux_horaire_moyen
 *   valeur = decisions_prises × 10 + actions_definies × 5 + alignement × 3
 *
 * Verdict :
 *   Ratio < 0.5 : reunion-mort — annuler ou raccourcir drastiquement
 *   0.5-1 : limite — restructurer
 *   1-3 : utile
 *   > 3 : reunion ROI eleve
 */
export function computeMeetingEfficiency(args: {
  duree_minutes: number;
  nb_participants: number;
  taux_horaire_moyen_centimes: string | bigint;
  decisions_prises: number;
  actions_definies: number;
  alignement_atteint?: 0 | 1 | 2 | 3;       // 0=aucun, 3=fort
}): {
  ok: boolean;
  cout_reunion_centimes: string;
  valeur_score: number;
  ratio_valeur_cout: number;
  verdict: "destruction" | "limite" | "utile" | "tres_utile";
  recommendations: string[];
} {
  const cout = (BigInt(args.taux_horaire_moyen_centimes)
    * BigInt(args.nb_participants)
    * BigInt(args.duree_minutes)) / 60n;

  const align = args.alignement_atteint ?? 1;
  const valeur = args.decisions_prises * 10 + args.actions_definies * 5 + align * 3;
  const coutCfa = Number(cout) / 100;
  const ratio = coutCfa > 0 ? valeur / (coutCfa / 10000) : 0;

  const verdict: "destruction" | "limite" | "utile" | "tres_utile" =
    ratio < 0.5 ? "destruction" : ratio < 1 ? "limite" : ratio < 3 ? "utile" : "tres_utile";

  const recs: string[] = [];
  if (verdict === "destruction") {
    recs.push("Reunion a haut cout sans valeur ajoutee — annuler ou reduire fortement");
    recs.push("Considerer un email asynchrone pour partager l'info");
  } else if (verdict === "limite") {
    recs.push("Reduire la duree de moitie ou le nombre de participants");
    if (args.decisions_prises === 0) recs.push("Aucune decision prise : ajouter une slide 'decisions a valider'");
  } else if (args.nb_participants > 8) {
    recs.push("8+ participants : risque de loi de Brooks. Restreindre aux decideurs");
  }

  return {
    ok: true,
    cout_reunion_centimes: cout.toString(),
    valeur_score: valeur,
    ratio_valeur_cout: Math.round(ratio * 100) / 100,
    verdict,
    recommendations: recs.length > 0 ? recs : ["Reunion productive, maintenir le format"],
  };
}

// ─── 3. Schedule optimization ──────────────────────────────────────────────
/**
 * Optimise un calendrier en bloquant des focus blocks.
 *   - Identifie les creneaux libres > 2h consecutives
 *   - Recommande de bloquer ces creneaux pour deep work
 *   - Detecte les jours surcharges (>6h reunion)
 */
export function scheduleOptimization(args: {
  events: { date: string; debut_heure: string; fin_heure: string; titre: string; type?: "reunion" | "focus" | "perso" }[];
  jour_debut_heure?: string;          // defaut "09:00"
  jour_fin_heure?: string;             // defaut "18:00"
}): {
  ok: boolean;
  jours_analyses: string[];
  jours_surcharges: { date: string; heures_reunion: number; nb_reunions: number }[];
  focus_blocks_disponibles: { date: string; debut: string; fin: string; duree_heures: number }[];
  taux_focus_pct: number;
  recommendations: string[];
} {
  const jourDeb = args.jour_debut_heure ?? "09:00";
  const jourFin = args.jour_fin_heure ?? "18:00";

  // Group by date
  const byDate = new Map<string, typeof args.events>();
  for (const e of args.events) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  const jours = Array.from(byDate.keys()).sort();

  const surcharges: any[] = [];
  const focusBlocks: any[] = [];
  let totalFocus = 0;
  let totalAvailable = 0;

  for (const date of jours) {
    const dayEvents = byDate.get(date)!.sort((a, b) => a.debut_heure.localeCompare(b.debut_heure));
    const meetings = dayEvents.filter(e => (e.type ?? "reunion") === "reunion");

    let heuresReunion = 0;
    for (const m of meetings) {
      heuresReunion += hoursBetween(m.debut_heure, m.fin_heure);
    }
    if (heuresReunion > 6) {
      surcharges.push({ date, heures_reunion: Math.round(heuresReunion * 10) / 10, nb_reunions: meetings.length });
    }

    // Trouver les gaps libres > 2h
    let cursor = jourDeb;
    for (const e of dayEvents) {
      if (cursor < e.debut_heure) {
        const dur = hoursBetween(cursor, e.debut_heure);
        if (dur >= 2) {
          focusBlocks.push({ date, debut: cursor, fin: e.debut_heure, duree_heures: Math.round(dur * 10) / 10 });
          totalFocus += dur;
        }
      }
      if (e.fin_heure > cursor) cursor = e.fin_heure;
    }
    // Gap final
    if (cursor < jourFin) {
      const dur = hoursBetween(cursor, jourFin);
      if (dur >= 2) {
        focusBlocks.push({ date, debut: cursor, fin: jourFin, duree_heures: Math.round(dur * 10) / 10 });
        totalFocus += dur;
      }
    }
    totalAvailable += hoursBetween(jourDeb, jourFin);
  }

  const tauxFocus = totalAvailable > 0 ? Math.round((totalFocus / totalAvailable) * 100) : 0;

  const recs: string[] = [];
  if (surcharges.length > 0) recs.push(`${surcharges.length} jour(s) surcharges (>6h reunion). Bloquer 'no meeting day' obligatoire.`);
  if (tauxFocus < 30) recs.push(`Taux focus ${tauxFocus}% trop faible. Bloquer matinees ou apres-midis pour deep work.`);
  if (focusBlocks.length > 0) recs.push(`${focusBlocks.length} creneaux focus disponibles : les bloquer en 'occupe' dans le calendrier`);
  if (recs.length === 0) recs.push("Calendrier equilibre. Maintenir.");

  return {
    ok: true,
    jours_analyses: jours,
    jours_surcharges: surcharges,
    focus_blocks_disponibles: focusBlocks,
    taux_focus_pct: tauxFocus,
    recommendations: recs,
  };
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

// ─── 4. PERT estimation ────────────────────────────────────────────────────
/**
 * 3-points estimate (PERT - Program Evaluation Review Technique) :
 *   E = (O + 4M + P) / 6      Esperance
 *   StdDev = (P - O) / 6
 *   E + 1.65*sigma ~ 95% confiance
 *
 * Permet de donner une estimation realiste avec intervalle de confiance.
 */
export function estimateProjectDuration(args: {
  taches: { id: string; libelle: string; optimiste_jours: number; vraisemblable_jours: number; pessimiste_jours: number; depend_de?: string[] }[];
  niveau_confiance?: 0.50 | 0.85 | 0.95 | 0.99;
}): {
  ok: boolean;
  total_esperance_jours: number;
  total_pessimiste_jours: number;
  total_optimiste_jours: number;
  total_avec_confiance_jours: number;
  niveau_confiance: number;
  detail_par_tache: { id: string; esperance: number; ecart_type: number; intervalle_85: [number, number] }[];
  chemin_critique?: string[];
} {
  const conf = args.niveau_confiance ?? 0.85;
  const z = conf === 0.99 ? 2.33 : conf === 0.95 ? 1.65 : conf === 0.85 ? 1.04 : 0;

  const detail = args.taches.map(t => {
    const E = (t.optimiste_jours + 4 * t.vraisemblable_jours + t.pessimiste_jours) / 6;
    const sigma = (t.pessimiste_jours - t.optimiste_jours) / 6;
    return {
      id: t.id, esperance: Math.round(E * 100) / 100,
      ecart_type: Math.round(sigma * 100) / 100,
      intervalle_85: [
        Math.round((E - 1.04 * sigma) * 100) / 100,
        Math.round((E + 1.04 * sigma) * 100) / 100,
      ] as [number, number],
    };
  });

  const totalE = detail.reduce((s, t) => s + t.esperance, 0);
  const totalSigmaCarre = detail.reduce((s, t) => s + Math.pow(t.ecart_type, 2), 0);
  const totalSigma = Math.sqrt(totalSigmaCarre);
  const totalConf = totalE + z * totalSigma;
  const totalP = args.taches.reduce((s, t) => s + t.pessimiste_jours, 0);
  const totalO = args.taches.reduce((s, t) => s + t.optimiste_jours, 0);

  return {
    ok: true,
    total_esperance_jours: Math.round(totalE * 100) / 100,
    total_pessimiste_jours: totalP,
    total_optimiste_jours: totalO,
    total_avec_confiance_jours: Math.round(totalConf * 100) / 100,
    niveau_confiance: conf,
    detail_par_tache: detail,
  };
}

// ─── 5. Team capacity ──────────────────────────────────────────────────────
/**
 * Calcule la capacite reelle d'une equipe en jours-homme :
 *   capacite_brute = nb_membres × jours_ouvrables
 *   capacite_nette = capacite_brute × (1 - meeting_overhead) × (1 - leave_pct) × (1 - context_switch)
 *
 * Norme : context switch coute ~20-30% pour devs / consultants.
 */
export function computeTeamCapacity(args: {
  nb_membres: number;
  jours_ouvrables_periode: number;
  meeting_overhead_pct?: number;       // % temps en reunion (defaut 15)
  conges_pct?: number;                  // % temps absent (defaut 8)
  context_switch_pct?: number;          // % perdu en multitasking (defaut 20)
  taux_journalier_moyen_centimes?: string | bigint;
}): {
  ok: boolean;
  capacite_brute_jh: number;
  capacite_nette_jh: number;
  taux_utilisation_pct: number;
  decomposition_jh: { perte_meetings: number; perte_conges: number; perte_context_switch: number };
  cout_capacite_centimes?: string;
  cout_perte_overhead_centimes?: string;
} {
  const meetingPct = args.meeting_overhead_pct ?? 15;
  const congesPct = args.conges_pct ?? 8;
  const ctxPct = args.context_switch_pct ?? 20;

  const brute = args.nb_membres * args.jours_ouvrables_periode;
  const perteMeetings = brute * (meetingPct / 100);
  const perteConges = brute * (congesPct / 100);
  const perteCtx = brute * (ctxPct / 100);
  const nette = brute - perteMeetings - perteConges - perteCtx;
  const utilisation = brute > 0 ? (nette / brute) * 100 : 0;

  let cout: bigint | undefined;
  let coutPerte: bigint | undefined;
  if (args.taux_journalier_moyen_centimes) {
    const taux = BigInt(args.taux_journalier_moyen_centimes);
    cout = taux * BigInt(Math.round(brute));
    coutPerte = taux * BigInt(Math.round(perteMeetings + perteCtx));
  }

  return {
    ok: true,
    capacite_brute_jh: Math.round(brute * 100) / 100,
    capacite_nette_jh: Math.round(nette * 100) / 100,
    taux_utilisation_pct: Math.round(utilisation * 100) / 100,
    decomposition_jh: {
      perte_meetings: Math.round(perteMeetings * 100) / 100,
      perte_conges: Math.round(perteConges * 100) / 100,
      perte_context_switch: Math.round(perteCtx * 100) / 100,
    },
    cout_capacite_centimes: cout?.toString(),
    cout_perte_overhead_centimes: coutPerte?.toString(),
  };
}
