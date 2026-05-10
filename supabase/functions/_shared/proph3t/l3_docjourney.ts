// L3 : DOCJOURNEY (Document workflow / GED avancee)
export function defineDocumentWorkflow(args: {
  type_document: string;
  etapes: { id: string; libelle: string; role_responsable: string; sla_heures?: number; obligatoire: boolean; depend_de?: string[] }[];
}): { ok: boolean; workflow_id: string; etapes_total: number; sla_total_heures: number; warnings: string[] } {
  const id = `WF-${args.type_document.toUpperCase()}-${Date.now()}`;
  const warnings: string[] = [];
  const sla = args.etapes.reduce((s, e) => s + (e.sla_heures ?? 24), 0);
  if (args.etapes.length > 7) warnings.push("Workflow > 7 etapes : risque de blocage");
  if (args.etapes.some(e => !e.role_responsable)) warnings.push("Certaines etapes sans responsable");
  return { ok: true, workflow_id: id, etapes_total: args.etapes.length, sla_total_heures: sla, warnings };
}

export function trackDocumentProgress(args: {
  document_id: string;
  workflow: { etape_id: string; statut: "en_attente" | "en_cours" | "valide" | "rejete"; assignee?: string; deadline?: string; commentaire?: string }[];
  current_time?: string;
}): { ok: boolean; document_id: string; statut_global: "en_cours" | "valide_complet" | "rejete" | "bloque"; etape_courante: string | null; jours_de_retard: number; alertes: string[] } {
  const now = args.current_time ? new Date(args.current_time) : new Date();
  const rejet = args.workflow.find(e => e.statut === "rejete");
  const valides = args.workflow.filter(e => e.statut === "valide").length;
  const enCours = args.workflow.find(e => e.statut === "en_cours");
  const enAttente = args.workflow.filter(e => e.statut === "en_attente");
  const alertes: string[] = [];
  let retard = 0;
  if (enCours?.deadline) {
    const d = new Date(enCours.deadline);
    if (now > d) {
      retard = Math.ceil((now.getTime() - d.getTime()) / 86400000);
      alertes.push(`Etape '${enCours.etape_id}' en retard de ${retard} jours`);
    }
  }
  let statut: "en_cours" | "valide_complet" | "rejete" | "bloque" = "en_cours";
  if (rejet) statut = "rejete";
  else if (valides === args.workflow.length) statut = "valide_complet";
  else if (enAttente.length === args.workflow.length) statut = "bloque";
  return { ok: true, document_id: args.document_id, statut_global: statut, etape_courante: enCours?.etape_id ?? null, jours_de_retard: retard, alertes };
}

export function detectGoulotsDocumentaires(args: {
  documents: { id: string; type: string; created_at: string; resolved_at?: string; etape_blocage?: string }[];
  periode_jours?: number;
}): { ok: boolean; goulots: { etape: string; nb_documents_bloques: number; duree_moyenne_h: number }[]; recommendations: string[] } {
  const byEtape = new Map<string, { nb: number; durees: number[] }>();
  for (const d of args.documents) {
    if (d.etape_blocage) {
      const cur = byEtape.get(d.etape_blocage) ?? { nb: 0, durees: [] };
      cur.nb++;
      const created = new Date(d.created_at);
      const end = d.resolved_at ? new Date(d.resolved_at) : new Date();
      cur.durees.push((end.getTime() - created.getTime()) / 3600000);
      byEtape.set(d.etape_blocage, cur);
    }
  }
  const goulots = Array.from(byEtape.entries()).map(([etape, v]) => ({
    etape, nb_documents_bloques: v.nb,
    duree_moyenne_h: Math.round(v.durees.reduce((s, d) => s + d, 0) / Math.max(1, v.durees.length)),
  })).sort((a, b) => b.nb_documents_bloques - a.nb_documents_bloques);
  const recos: string[] = [];
  for (const g of goulots.slice(0, 3)) {
    if (g.nb_documents_bloques > 5) recos.push(`Goulot critique a '${g.etape}' (${g.nb_documents_bloques} docs, ${g.duree_moyenne_h}h moyenne)`);
  }
  return { ok: true, goulots, recommendations: recos };
}

export function searchDocumentSemantic(args: {
  query: string;
  documents_indexes: { id: string; titre: string; tags: string[]; full_text_excerpt?: string }[];
  filters?: { type?: string; date_min?: string; date_max?: string };
}): { ok: boolean; results: { id: string; titre: string; relevance_score: number }[]; total_matches: number } {
  const queryLower = args.query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
  const results = args.documents_indexes.map(d => {
    let score = 0;
    if (d.titre.toLowerCase().includes(queryLower)) score += 50;
    for (const tag of d.tags) {
      if (tag.toLowerCase().includes(queryLower)) score += 20;
      for (const t of queryTerms) if (tag.toLowerCase().includes(t)) score += 5;
    }
    if (d.full_text_excerpt) {
      const excLow = d.full_text_excerpt.toLowerCase();
      for (const t of queryTerms) {
        const matches = (excLow.match(new RegExp(t, "g")) ?? []).length;
        score += matches * 3;
      }
    }
    return { id: d.id, titre: d.titre, relevance_score: score };
  })
  .filter(r => r.relevance_score > 0)
  .sort((a, b) => b.relevance_score - a.relevance_score)
  .slice(0, 10);
  return { ok: true, results, total_matches: results.length };
}

export function generateDocumentTemplate(args: {
  type_document: "facture" | "contrat" | "lettre_relance" | "ordre_virement" | "rapport";
  variables: Record<string, string>;
  langue?: "fr" | "en";
}): { ok: boolean; document_markdown: string; variables_manquantes: string[] } {
  const requis: Record<string, string[]> = {
    facture: ["numero", "date", "client_nom", "montant_ht", "tva", "echeance"],
    contrat: ["partie_a", "partie_b", "objet", "duree", "prix"],
    lettre_relance: ["client_nom", "facture_numero", "montant_du", "jours_retard"],
    ordre_virement: ["beneficiaire", "iban", "montant", "motif"],
    rapport: ["titre", "auteur", "date", "synthese"],
  };
  const r = requis[args.type_document];
  const manquants = r.filter(v => !args.variables[v]);
  const md = `# ${args.type_document.toUpperCase()}\n\n${Object.entries(args.variables).map(([k, v]) => `**${k}** : ${v}`).join("\n\n")}\n\n${manquants.length > 0 ? `_Variables manquantes : ${manquants.join(", ")}_` : ""}`;
  return { ok: true, document_markdown: md, variables_manquantes: manquants };
}
