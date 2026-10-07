import type { Locale } from "../lib/locale";
import type { BrainIdentityStrings } from "./BrainIdentityEditor";
import type { PanelStrings } from "./DetailsPanel";
import type { ComposedViewErrorCode } from "./composedView";
import type { MapLegendStrings } from "./MapLegend";
import type { WorkspaceCorrection } from "./workspaceState";

/**
 * Everything `MapApp` itself says, in both languages — `TASK-0046`, `DEC-0044`.
 *
 * One typed contract, {@link MapStrings}, and exactly two implementations behind
 * `Record<Locale, MapStrings>`: a key added to one language and not to the other does
 * not compile. The panels `MapApp` hosts each keep their own `Record<Locale, …>` next
 * to their markup; this file is only what `MapApp` owns.
 *
 * What is **not** here, and never translated: a brain's name, a file's or a folder's
 * name, a relative path, an identifier, a wire value (`map_not_built`, `REAL_ROOT`,
 * `APPROVED`…). A raw backend diagnostic may follow a localized message as a secondary
 * detail (`DEC-0044` §7).
 *
 * Status lines are functions of the strings, not stored sentences: `MapApp` keeps them
 * as `(locale) => string` and resolves them at render time, so one said in French reads
 * in English the moment the person switches — without saying it, or reading anything,
 * again.
 */

export interface MapStrings {
  appTitle: string;
  subtitle: string;
  language: {
    label: string;
    fr: string;
    en: string;
  };
  /** `TASK-0053` — the global workspace preferences and what a restart had to correct. */
  workspace: {
    preferences: string;
    density: string;
    densityOptions: { comfortable: string; compact: string };
    motion: string;
    motionOptions: { system: string; reduce: string };
    motionHint: string;
    correctionsTitle: string;
    correctionsDismiss: string;
    corrections: Record<WorkspaceCorrection, string>;
  };
  composition: string;
  compositionFocused: string;
  compositionFocus: string;
  compositionAdd: string;
  compositionAddEmpty: string;
  compositionRemove: string;
  compositionRemoveRefused: string;
  compositionSource: string;
  compositionBusy: string;
  identity: BrainIdentityStrings;
  addRealRoot: string;
  addRealRootBusy: string;
  addRealRootCancelled: string;
  indexBrain: string;
  notBuilt: string;
  brainsDiagnostic: string;
  fixtures: string;
  open: string;
  refresh: string;
  prepareSynthetic: string;
  rebuild: string;
  building: string;
  map: string;
  legend: MapLegendStrings & { open: string; close: string };
  zoomIn: string;
  zoomOut: string;
  fit: string;
  fitSelection: string;
  reset: string;
  selectRoot: string;
  measure: string;
  measuring: string;
  selfCheck: string;
  relationsCheck: string;
  crossCheck: string;
  territory: string;
  nodesWord: string;
  keyboardTitle: string;
  keyboard: string;
  nodes: string;
  depth: string;
  ceiling: string;
  noArtifacts: string;
  artifactsFound: string;
  engine: string;
  sandbox: string;
  /** The token the backend puts for the repository in a sandbox path it shows (`<dépôt>`). */
  sandboxRepoToken: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchClear: string;
  searchEmpty: string;
  searchTotal: (total: number) => string;
  searchPrevious: string;
  searchNext: string;
  searchStale: string;
  revealAction: string;
  revealBusy: string;
  revealError: Record<string, string>;
  revealErrorGeneric: string;
  copyAction: string;
  copyBusy: string;
  copyError: Record<string, string>;
  copyErrorGeneric: string;
  detailsPanelHide: string;
  detailsPanelShow: string;
  panel: PanelStrings;
  /** The territory's accessible name, and the header the map draws for it. */
  territoryLabel: (name: string, icon: string, nodeCount: number, focused: boolean) => string;
  nodeLabel: (
    brainName: string,
    nodeName: string,
    kind: string,
    depth: number,
    childCount: number,
    diagnostic: string | null,
  ) => string;
  report: {
    label: string;
    revision: (brainId: string, revision: number) => string;
    territories: (count: number, nodeCount: number) => string;
    indexed: (count: number) => string;
    lastRecorded: string;
  };
  checks: {
    h: { label: string; paths: (planned: number, disk: number, index: number) => string; violations: (n: number) => string; mismatches: (n: number, test: "H3" | "H5") => string };
    j: {
      label: string;
      rejected: (rejected: number, total: number) => string;
      pending: (count: number) => string;
      replay: (stable: boolean) => string;
      conform: (matching: number, total: number) => string;
      inverses: (count: number) => string;
      unresolved: (count: number) => string;
    };
    m: {
      label: string;
      rejected: (rejected: number, total: number) => string;
      singleBrain: (count: number) => string;
      deterministic: (count: number, stable: boolean) => string;
      approved: (approved: number, pending: number) => string;
      conform: (matching: number, total: number) => string;
      inverses: (count: number) => string;
      unresolved: (count: number) => string;
    };
  };
  measureReport: {
    label: string;
    title: string;
    brain: string;
    frameMedian: string;
    frameRange: string;
    selectionMedian: string;
  };
  observe: string;
  observing: string;
  projection: {
    label: string;
    summary: (visible: number, total: number, outside: number) => string;
    exploreSelection: string;
    backToRoot: string;
  };
  offscreen: {
    label: string;
    relation: (name: string) => string;
    show: (name: string) => string;
  };
  /** The lines of the status area. Each is a sentence with its facts, and no more. */
  status: {
    matches: (total: number, visible: number, nodeCount: number) => string;
    visible: (visible: number, nodeCount: number) => string;
    normalProjectionUnreadable: (detail: string) => string;
    hostUnavailable: (detail: string) => string;
    indexMissing: string;
    failed: (detail: string) => string;
    endpointAbsent: string;
    compositionRefused: (detail: string) => string;
    addRefused: (detail: string) => string;
    activeBrainNotSaved: (detail: string) => string;
    projectionRefused: (detail: string) => string;
    detailUnavailable: (detail: string) => string;
    contentObserved: (hashed: number, indexed: number, generationId: string) => string;
    contentObservationFailed: (detail: string) => string;
    analysisDone: (engineVersion: string, relations: number, suggestions: number) => string;
    analysisFailed: (detail: string) => string;
    approved: (key: string, brainId: string) => string;
    approvalRefused: (detail: string) => string;
    confirmed: (key: string, brainId: string) => string;
    confirmationRefused: (detail: string) => string;
    rejected: (key: string, brainId: string) => string;
    rejectionRefused: (detail: string) => string;
    later: string;
    crossApproved: (key: string) => string;
    crossApprovalRefused: (detail: string) => string;
    revoked: (key: string, brainId: string) => string;
    revocationRefused: (detail: string) => string;
    crossRevoked: (key: string) => string;
    crossRevocationRefused: (detail: string) => string;
    crossNavigation: (brainId: string) => string;
    resolutionRefused: (detail: string) => string;
    crossCheckFailed: (detail: string) => string;
    relationsCheckFailed: (detail: string) => string;
    checkFailed: (detail: string) => string;
    verificationWritten: (path: string) => string;
    verificationInterrupted: (detail: string) => string;
    measurementWritten: (path: string) => string;
    measurementInterrupted: (detail: string) => string;
    syntheticPrepared: string;
    syntheticRefused: (detail: string) => string;
    childrenUnavailable: (detail: string) => string;
    identitySaved: (icon: string, name: string) => string;
  };
  /** A refusal of the composition model, by its closed code. */
  compositionRefusals: Record<ComposedViewErrorCode, string>;
  /** Internal invariants that can reach the status line as a detail. */
  invariants: {
    brainMissingFromCatalogue: (brainId: string) => string;
    brainMismatch: (asked: string, received: string) => string;
    projectionOfAnotherBrain: string;
    brainNotLoaded: (brainId: string) => string;
  };
}

/** The closed wire codes of a refused reveal, in English. */
const REVEAL_CODES_EN: Record<string, string> = {
  indexed_target_unavailable: "This item cannot be found or is inaccessible.",
  indexed_target_reparse_point: "This item is a link and cannot be opened this way.",
  indexed_target_not_openable: "This item cannot be opened.",
  explorer_launch_failed: "Could not launch Windows Explorer.",
  platform_not_supported: "This action is only available on Windows.",
};

export const strings: Record<Locale, MapStrings> = {
  fr: {
    appTitle: "FileTopo — carte de blocs",
    subtitle: "Tranche verticale TASK-0019 · vue composée, cerveaux synthétiques seulement",
    language: { label: "Langue de l'interface", fr: "Français", en: "English" },
    workspace: {
      preferences: "Préférences de l'espace de travail",
      density: "Densité",
      densityOptions: { comfortable: "Confortable", compact: "Compacte" },
      motion: "Mouvement",
      motionOptions: { system: "Système", reduce: "Réduit" },
      motionHint: "« Système » suit le réglage de votre système ; « Réduit » supprime toute animation.",
      correctionsTitle: "Espace de travail rouvert avec des corrections",
      correctionsDismiss: "Fermer ce résumé",
      corrections: {
        RECORD_UNREADABLE: "L'espace enregistré était illisible : valeurs par défaut utilisées.",
        BRAIN_MISSING: "Un cerveau affiché n'existe plus au catalogue : il a été retiré de la composition.",
        COMPOSITION_FALLBACK: "Aucun cerveau mémorisé n'existe plus : le cerveau actif est affiché seul.",
        FOCUSED_BRAIN_MISSING: "Le cerveau actif mémorisé n'existe plus : un autre cerveau affiché a pris le focus.",
        VIEW_COMPOSITION_CHANGED: "La composition a changé : la caméra mémorisée n'a pas été reprise.",
        SELECTION_BRAIN_NOT_DISPLAYED: "La sélection mémorisée appartient à un cerveau qui n'est plus affiché : elle a été retirée.",
        SELECTION_GENERATION_CHANGED: "L'Index a changé depuis la sélection mémorisée : elle a été retirée.",
        SELECTION_MISSING: "L'élément sélectionné n'existe plus dans l'Index : la sélection a été retirée.",
        BRANCH_BRAIN_NOT_DISPLAYED: "Le cerveau de la branche focalisée n'est plus affiché : le focus de branche a été abandonné.",
        BRANCH_GENERATION_CHANGED: "L'Index a changé depuis le focus de branche : il a été abandonné.",
        BRANCH_ROOT_INVALID: "La racine de la branche focalisée n'existe plus : le focus de branche a été abandonné.",
        BRANCH_COLLAPSED_INVALID: "Des dossiers repliés n'existent plus ou sortent de la branche : ils ont été retirés.",
        BRANCH_SELECTION_OUTSIDE: "La sélection était hors de la branche focalisée : la racine de la branche est sélectionnée.",
        BRANCH_SAVED_SELECTION_INVALID: "La sélection à retrouver en quittant le focus n'est plus valide : elle a été retirée.",
        BRANCH_UNAVAILABLE: "La branche focalisée n'a pas pu être relue : le focus de branche a été abandonné.",
        BRANCH_SELECTION_NOT_IN_VIEW: "La sélection n'est pas dans la vue de branche : la racine de la branche est sélectionnée.",
      },
    },
    composition: "Cerveaux affichés",
    compositionFocused: "actif",
    compositionFocus: "rendre actif",
    compositionAdd: "Ajouter",
    compositionAddEmpty: "Tous les cerveaux du catalogue sont déjà affichés",
    compositionRemove: "Retirer de la vue",
    compositionRemoveRefused: "Impossible de retirer le dernier cerveau affiché",
    compositionSource: "source",
    compositionBusy: "Chargement…",
    identity: {
      open: "Personnaliser le cerveau",
      title: "Personnaliser le cerveau",
      name: "Nom",
      color: "Couleur",
      icon: "Icône",
      iconHint: "1 ou 2 caractères, affichés à côté du nom.",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      nameInvalid: "Le nom doit compter de 1 à 80 caractères.",
      colorInvalid: "La couleur doit avoir la forme #RRGGBB.",
      iconInvalid: "L'icône doit compter 1 ou 2 caractères.",
      unchanged: "Aucun changement : le cerveau reste tel quel.",
      refused: "Enregistrement refusé :",
    },
    addRealRoot: "Ajouter un dossier",
    addRealRootBusy: "Sélection…",
    addRealRootCancelled: "Aucun dossier choisi. Rien n'a été créé.",
    indexBrain: "Indexer",
    notBuilt:
      "Ce cerveau n'est pas encore indexé. Choisissez Indexer pour lire le dossier " +
      "une première fois; FileTopo ne lit jamais la source sans cette action.",
    brainsDiagnostic: "Diagnostic développeur · sources synthétiques",
    fixtures: "Fixtures synthétiques",
    open: "Ouvrir",
    refresh: "Actualiser",
    prepareSynthetic: "Préparer l’exemple synthétique",
    rebuild: "Reconstruire l'index",
    building: "Construction…",
    map: "Graphique composé",
    legend: {
      open: "Légende",
      close: "Fermer la légende",
      title: "Légende de la carte",
      description: "Les formes, traits et mots ci-dessous expliquent les signes porteurs de sens de la carte.",
      items: {
        "node-root": "Racine du cerveau — losange.",
        "node-directory": "Dossier — glyphe de dossier.",
        "node-file": "Fichier — glyphe de document.",
        "node-skipped": "Élément ignoré — croix et contour pointillé.",
        "node-selected": "Élément sélectionné — contour épais.",
        "node-related": "Parent ou enfant direct de la sélection — contour renforcé.",
        "node-linked": "Relié dans le même cerveau — contour pointillé renforcé.",
        "node-cross-linked": "Relié à un autre cerveau — contour plein épaissi.",
        "filter-match": "Correspond au filtre — contour épais et symbole plein.",
        "filter-context": "Contexte nécessaire au résultat — contour pointillé et symbole vide.",
        "node-diagnostic": "Diagnostic d’accès — coin triangulaire.",
        "territory-focused": "Cerveau actif — titre de territoire en caractères gras.",
        "hierarchy-normal": "Hiérarchie parent-enfant — trait simple.",
        "hierarchy-touching": "Hiérarchie touchant la sélection — trait renforcé.",
        "intra-established": "Relation établie dans un cerveau — flèche dirigée.",
        "intra-suggestion": "Suggestion à confirmer — pointillés, anneaux et aucune flèche.",
        "intra-approved": "Relation approuvée — motif de trait long-court.",
        "intra-touching": "Relation dans un cerveau touchant la sélection — trait renforcé.",
        "inter-crossing": "Relation inter-cerveaux — double trait avec chevron central.",
        "inter-established": "Relation inter-cerveaux établie — flèche dirigée.",
        "inter-suggestion": "Suggestion inter-cerveaux — pointillés, anneaux et aucune flèche.",
        "inter-approved": "Relation inter-cerveaux approuvée — motif de trait long-court.",
        "inter-touching": "Relation inter-cerveaux touchant la sélection — trait renforcé.",
        aggregate: "Éléments réels non affichés — capsule pointillée avec leur nombre.",
      },
    },
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    fit: "Ajuster",
    fitSelection: "Cadrer la sélection",
    reset: "Réinitialiser la vue",
    selectRoot: "Sélectionner la racine",
    measure: "Mesurer dans WebView2",
    measuring: "Mesure en cours…",
    selfCheck: "Contrôler H1–H5",
    relationsCheck: "Contrôler J1–J5, J10",
    crossCheck: "Contrôler M1–M5",
    territory: "territoire",
    nodesWord: "nœuds",
    keyboardTitle: "Clavier",
    keyboard:
      "Flèches : parent, enfant, frères · N / P : territoire suivant, précédent · " +
      "Alt+flèches : panoramique · + / − : zoom · F : ajuster · R : réinitialiser · Origine : racine",
    nodes: "nœuds",
    depth: "profondeur",
    ceiling: "plafond",
    noArtifacts: "Aucun fichier de FileTopo dans la racine analysée",
    artifactsFound: "Fichiers de FileTopo trouvés dans la racine analysée",
    engine: "Moteur de rendu",
    sandbox: "Bac à sable",
    sandboxRepoToken: "<dépôt>",
    searchLabel: "Rechercher un dossier ou fichier",
    searchPlaceholder: "Nom ou chemin relatif…",
    searchClear: "Effacer",
    searchEmpty: "Aucun résultat.",
    searchTotal: (total) => `${total} résultat${total > 1 ? "s" : ""}`,
    searchPrevious: "Page précédente",
    searchNext: "Page suivante",
    searchStale: "Résultats périmés après une actualisation — relancez la recherche.",
    revealAction: "Ouvrir dans l'Explorateur",
    revealBusy: "Ouverture…",
    revealError: {
      indexed_target_unavailable: "Cet élément est introuvable ou inaccessible.",
      indexed_target_reparse_point: "Cet élément est un lien et ne peut pas être ouvert ainsi.",
      indexed_target_not_openable: "Cet élément ne peut pas être ouvert.",
      explorer_launch_failed: "Impossible de lancer l'Explorateur Windows.",
      platform_not_supported: "Cette action n'est disponible que sous Windows.",
    },
    revealErrorGeneric: "Impossible d'ouvrir cet élément.",
    // `TASK-0035` C. Same wire codes and the same underlying resolution as
    // `revealError` above (both actions share `map_reveal_refused: <code>`,
    // reusing one confinement walk rather than two) — only the wording
    // differs, since "ouvrir" and "copier" are different verbs for the
    // person reading the message.
    copyAction: "Copier le chemin",
    copyBusy: "Copie…",
    copyError: {
      indexed_target_unavailable: "Cet élément est introuvable ou inaccessible.",
      indexed_target_reparse_point: "Cet élément est un lien et son chemin ne peut pas être copié.",
      indexed_target_not_openable: "Le chemin de cet élément ne peut pas être copié.",
      indexed_target_not_representable: "Le nom de cet élément ne peut pas être copié tel quel.",
      clipboard_write_failed: "Impossible de copier dans le presse-papiers.",
      platform_not_supported: "Cette action n'est disponible que sous Windows.",
    },
    copyErrorGeneric: "Impossible de copier le chemin.",
    // `TASK-0035` A.
    detailsPanelHide: "Masquer les détails",
    detailsPanelShow: "Afficher les détails",
    panel: {
      title: "Détails de la sélection",
      empty: "Sélectionnez un bloc sur la carte, ou appuyez sur Origine.",
      loading: "Lecture de l'index…",
      name: "Nom",
      kind: "Type",
      path: "Chemin relatif",
      size: "Taille",
      modified: "Modifié",
      parent: "Parent",
      children: "Enfants directs",
      diagnostic: "Diagnostic d'accès",
      noDiagnostic: "aucun",
      noParent: "Ce nœud est la racine.",
      noChildren: "Aucun enfant direct.",
      childrenPrevious: "Page précédente",
      childrenNext: "Page suivante",
      rootPath: "(racine)",
      kinds: {
        root: "racine",
        directory: "dossier",
        file: "fichier",
        skipped: "ignoré",
      },
    },
    territoryLabel: (name, icon, nodeCount, focused) =>
      `territoire ${name}, icône ${icon}, ${nodeCount} nœuds` + (focused ? ", actif" : ""),
    nodeLabel: (brainName, nodeName, kind, depth, childCount, diagnostic) =>
      // The brain's name is part of every node's accessible name: in a composed
      // graph, "dossier-b" alone does not say which brain it belongs to, and
      // `L4` asks that origin never rest on colour.
      `${brainName} · ${nodeName}, ${kind}, profondeur ${depth}, ` +
      `${childCount} enfants directs` +
      (diagnostic ? `, Diagnostic d'accès ${diagnostic}` : ""),
    report: {
      label: "Dernier index enregistré",
      revision: (brainId, revision) => `${brainId} · révision ${revision}`,
      territories: (count, nodeCount) => `${count} territoire(s) · ${nodeCount} nœuds`,
      indexed: (count) => `${count} éléments indexés`,
      lastRecorded: "Dernier index enregistré",
    },
    checks: {
      h: {
        label: "Contrôle H1 à H5",
        paths: (planned, disk, index) => `H1 · plan ${planned} / disque ${disk} / index ${index}`,
        violations: (n) => `N3 · ${n} violation(s)`,
        mismatches: (n, test) => `${test} · ${n} écart(s)`,
      },
      j: {
        label: "Contrôle J1 à J5 et J10",
        rejected: (rejected, total) =>
          `J1–J3 · ${rejected}/${total} tentative(s) invalide(s) rejetée(s)`,
        pending: (count) => `J2 · ${count} suggestion(s) en attente, hors des comptes`,
        replay: (stable) => `J3 · rejeu ${stable ? "identique" : "DIVERGENT"}`,
        conform: (matching, total) =>
          `J5 · ${matching}/${total} nœud(s) conformes à l'attendu gelé`,
        inverses: (count) => `J5 · ${count} inverse(s) inventé(s)`,
        unresolved: (count) => `J10 · ${count} extrémité(s) non résolue(s)`,
      },
      m: {
        label: "Contrôle M1 à M5",
        rejected: (rejected, total) =>
          `M1–M3 · ${rejected}/${total} tentative(s) invalide(s) rejetée(s)`,
        singleBrain: (count) => `M1 · ${count} relation(s) à un seul cerveau`,
        deterministic: (count, stable) =>
          `M2 · ${count} déterministe(s), rejeu ${stable ? "identique" : "DIVERGENT"}`,
        approved: (approved, pending) =>
          `M3 · ${approved} approuvée(s), ${pending} suggestion(s) hors des comptes`,
        conform: (matching, total) =>
          `M4 · ${matching}/${total} extrémité(s) conformes à l'attendu gelé`,
        inverses: (count) => `M2 · ${count} inverse(s) inventé(s)`,
        unresolved: (count) => `M5 · ${count} extrémité(s) non résolue(s)`,
      },
    },
    measureReport: {
      label: "Mesures H9 — régression du runtime composé",
      title: "H9 · WebView2 · régression du runtime composé",
      brain: "Cerveau",
      frameMedian: "Image méd.",
      frameRange: "Image min–max",
      selectionMedian: "Sélection méd.",
    },
    observe: "Observer le contenu",
    observing: "Observation…",
    projection: {
      label: "Navigation progressive",
      summary: (visible, total, outside) =>
        `${visible} éléments visibles sur ${total}; ${outside} hors de la vue courante.`,
      exploreSelection: "Explorer la sélection",
      backToRoot: "Revenir à la racine",
    },
    offscreen: {
      label: "Extrémités hors de la vue courante",
      relation: (name) => `${name} — relation hors de la vue courante.`,
      show: (name) => `Afficher ${name}`,
    },
    status: {
      matches: (total, visible, nodeCount) =>
        `${total} correspondance${total > 1 ? "s" : ""} — ${visible} éléments visibles sur ${nodeCount}`,
      visible: (visible, nodeCount) => `${visible} éléments visibles sur ${nodeCount}`,
      normalProjectionUnreadable: (detail) => `Projection normale illisible : ${detail}`,
      hostUnavailable: (detail) => `Hôte indisponible : ${detail}`,
      indexMissing:
        "Index absent. Préparez l’exemple synthétique si nécessaire, puis choisissez Actualiser pour construire l’index.",
      failed: (detail) =>
        `Échec : ${detail}. Le dernier index enregistré reste disponible via Ouvrir.`,
      endpointAbsent: "Extrémité absente de l'index courant.",
      compositionRefused: (detail) => `Composition refusée — ${detail}`,
      addRefused: (detail) => `Ajout refusé : ${detail}`,
      activeBrainNotSaved: (detail) => `Cerveau actif non enregistré : ${detail}`,
      projectionRefused: (detail) => `Projection refusée : ${detail}`,
      detailUnavailable: (detail) => `Détail indisponible : ${detail}`,
      contentObserved: (hashed, indexed, generationId) =>
        `${hashed}/${indexed} fichiers observés · ${generationId}`,
      contentObservationFailed: (detail) => `Observation de contenu impossible : ${detail}`,
      analysisDone: (engineVersion, relations, suggestions) =>
        `${engineVersion} : ${relations} relation(s), ${suggestions} suggestion(s).`,
      analysisFailed: (detail) => `Analyse des relations impossible : ${detail}`,
      approved: (key, brainId) =>
        `Suggestion ${key} approuvée dans ${brainId} : elle est désormais une relation APPROVED.`,
      approvalRefused: (detail) => `Approbation refusée : ${detail}`,
      confirmed: (key, brainId) =>
        `Suggestion ${key} confirmée dans ${brainId} : une relation APPROVED existe désormais.`,
      confirmationRefused: (detail) => `Confirmation refusée : ${detail}`,
      rejected: (key, brainId) =>
        `Suggestion ${key} rejetée dans ${brainId} : aucune relation créée, la décision est conservée.`,
      rejectionRefused: (detail) => `Rejet refusé : ${detail}`,
      later: "Suggestion laissée en attente : aucune décision enregistrée.",
      crossApproved: (key) =>
        `Suggestion inter-cerveaux ${key} approuvée : elle est désormais une relation APPROVED.`,
      crossApprovalRefused: (detail) => `Approbation inter-cerveaux refusée : ${detail}`,
      revoked: (key, brainId) =>
        `Relation ${key} révoquée dans ${brainId} : la suggestion est de nouveau en attente.`,
      revocationRefused: (detail) => `Révocation refusée : ${detail}`,
      crossRevoked: (key) =>
        `Relation inter-cerveaux ${key} révoquée : la suggestion est de nouveau en attente.`,
      crossRevocationRefused: (detail) => `Révocation inter-cerveaux refusée : ${detail}`,
      crossNavigation: (brainId) =>
        `Navigation inter-cerveaux : ${brainId} rejoint la vue. ` +
        `Aucune relation n'est créée, modifiée ni approuvée.`,
      resolutionRefused: (detail) => `Résolution refusée : ${detail}`,
      crossCheckFailed: (detail) => `Contrôle inter-cerveaux impossible : ${detail}`,
      relationsCheckFailed: (detail) => `Contrôle des relations impossible : ${detail}`,
      checkFailed: (detail) => `Contrôle impossible : ${detail}`,
      verificationWritten: (path) => `Vérification écrite dans ${path}`,
      verificationInterrupted: (detail) => `Vérification interrompue : ${detail}`,
      measurementWritten: (path) => `Mesures écrites dans ${path}`,
      measurementInterrupted: (detail) => `Mesure interrompue : ${detail}`,
      syntheticPrepared: "Exemple synthétique préparé. Choisissez Actualiser pour construire l’index.",
      syntheticRefused: (detail) => `Préparation refusée : ${detail}`,
      childrenUnavailable: (detail) => `Enfants indisponibles : ${detail}`,
      identitySaved: (icon, name) => `Cerveau personnalisé : ${icon} ${name}`,
    },
    compositionRefusals: {
      composed_view_empty: "une composition vide est interdite",
      composed_view_duplicate_brain: "ce cerveau est déjà affiché",
      composed_view_unknown_brain: "ce cerveau n'est pas au catalogue",
      composed_view_focus_not_displayed: "le cerveau actif doit être affiché",
      composed_view_cannot_remove_last_brain: "retirer le dernier cerveau affiché est refusé",
    },
    invariants: {
      brainMissingFromCatalogue: (brainId) => `cerveau absent du catalogue : ${brainId}`,
      brainMismatch: (asked, received) =>
        `incohérence de cerveau : demandé ${asked}, reçu ${received}`,
      projectionOfAnotherBrain: "projection d'un autre cerveau refusée",
      brainNotLoaded: (brainId) => `cerveau non chargé : ${brainId}`,
    },
  },
  en: {
    appTitle: "FileTopo — block map",
    subtitle: "TASK-0019 vertical slice · composed view, synthetic brains only",
    language: { label: "Interface language", fr: "Français", en: "English" },
    workspace: {
      preferences: "Workspace preferences",
      density: "Density",
      densityOptions: { comfortable: "Comfortable", compact: "Compact" },
      motion: "Motion",
      motionOptions: { system: "System", reduce: "Reduced" },
      motionHint: "“System” follows your system setting; “Reduced” removes all animation.",
      correctionsTitle: "Workspace reopened with corrections",
      correctionsDismiss: "Dismiss this summary",
      corrections: {
        RECORD_UNREADABLE: "The saved workspace was unreadable: defaults were used.",
        BRAIN_MISSING: "A displayed brain is no longer in the catalogue: it was removed from the composition.",
        COMPOSITION_FALLBACK: "No remembered brain exists any more: the active brain is shown alone.",
        FOCUSED_BRAIN_MISSING: "The remembered active brain no longer exists: another displayed brain took the focus.",
        VIEW_COMPOSITION_CHANGED: "The composition changed: the remembered camera was not restored.",
        SELECTION_BRAIN_NOT_DISPLAYED: "The remembered selection belongs to a brain that is no longer displayed: it was dropped.",
        SELECTION_GENERATION_CHANGED: "The Index changed since the remembered selection: it was dropped.",
        SELECTION_MISSING: "The selected item no longer exists in the Index: the selection was dropped.",
        BRANCH_BRAIN_NOT_DISPLAYED: "The focused branch's brain is no longer displayed: branch focus was abandoned.",
        BRANCH_GENERATION_CHANGED: "The Index changed since the branch focus: it was abandoned.",
        BRANCH_ROOT_INVALID: "The focused branch's root no longer exists: branch focus was abandoned.",
        BRANCH_COLLAPSED_INVALID: "Some collapsed folders no longer exist or lie outside the branch: they were dropped.",
        BRANCH_SELECTION_OUTSIDE: "The selection was outside the focused branch: the branch root is selected.",
        BRANCH_SAVED_SELECTION_INVALID: "The selection to return to when leaving the focus is no longer valid: it was dropped.",
        BRANCH_UNAVAILABLE: "The focused branch could not be read again: branch focus was abandoned.",
        BRANCH_SELECTION_NOT_IN_VIEW: "The selection is not in the branch view: the branch root is selected.",
      },
    },
    composition: "Displayed brains",
    compositionFocused: "active",
    compositionFocus: "make active",
    compositionAdd: "Add",
    compositionAddEmpty: "Every brain of the catalogue is already displayed",
    compositionRemove: "Remove from view",
    compositionRemoveRefused: "The last displayed brain cannot be removed",
    compositionSource: "source",
    compositionBusy: "Loading…",
    identity: {
      open: "Customize brain",
      title: "Customize brain",
      name: "Name",
      color: "Color",
      icon: "Icon",
      iconHint: "1 or 2 characters, shown next to the name.",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      nameInvalid: "The name must be 1 to 80 characters long.",
      colorInvalid: "The color must have the form #RRGGBB.",
      iconInvalid: "The icon must be 1 or 2 characters long.",
      unchanged: "No change: the brain stays as it is.",
      refused: "Save refused:",
    },
    addRealRoot: "Add a folder",
    addRealRootBusy: "Selecting…",
    addRealRootCancelled: "No folder chosen. Nothing was created.",
    indexBrain: "Index",
    notBuilt:
      "This brain is not indexed yet. Choose Index to read the folder for the first time; " +
      "FileTopo never reads the source without this action.",
    brainsDiagnostic: "Developer diagnostic · synthetic sources",
    fixtures: "Synthetic fixtures",
    open: "Open",
    refresh: "Refresh",
    prepareSynthetic: "Prepare the synthetic example",
    rebuild: "Rebuild index",
    building: "Building…",
    map: "Composed graph",
    legend: {
      open: "Legend",
      close: "Close legend",
      title: "Map legend",
      description: "The shapes, strokes and words below explain every meaningful sign used on the map.",
      items: {
        "node-root": "Brain root — diamond.",
        "node-directory": "Folder — folder glyph.",
        "node-file": "File — document glyph.",
        "node-skipped": "Skipped item — cross and dashed outline.",
        "node-selected": "Selected item — heavy outline.",
        "node-related": "Direct parent or child of the selection — stronger outline.",
        "node-linked": "Linked inside the same brain — strong dashed outline.",
        "node-cross-linked": "Linked to another brain — heavy solid outline.",
        "filter-match": "Matches the filter — heavy outline and filled symbol.",
        "filter-context": "Context needed for a result — dashed outline and open symbol.",
        "node-diagnostic": "Access diagnostic — triangular corner.",
        "territory-focused": "Active brain — bold territory title.",
        "hierarchy-normal": "Parent-child hierarchy — single line.",
        "hierarchy-touching": "Hierarchy touching the selection — stronger line.",
        "intra-established": "Established relation inside a brain — directed arrow.",
        "intra-suggestion": "Suggestion to confirm — dashes, rings and no arrow.",
        "intra-approved": "Approved relation — long-short stroke pattern.",
        "intra-touching": "Relation inside a brain touching the selection — stronger line.",
        "inter-crossing": "Inter-brain relation — doubled line with a middle chevron.",
        "inter-established": "Established inter-brain relation — directed arrow.",
        "inter-suggestion": "Inter-brain suggestion — dashes, rings and no arrow.",
        "inter-approved": "Approved inter-brain relation — long-short stroke pattern.",
        "inter-touching": "Inter-brain relation touching the selection — stronger line.",
        aggregate: "Real items not displayed — dashed capsule with their count.",
      },
    },
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit",
    fitSelection: "Frame the selection",
    reset: "Reset view",
    selectRoot: "Select the root",
    measure: "Measure in WebView2",
    measuring: "Measuring…",
    selfCheck: "Check H1–H5",
    relationsCheck: "Check J1–J5, J10",
    crossCheck: "Check M1–M5",
    territory: "territory",
    nodesWord: "nodes",
    keyboardTitle: "Keyboard",
    keyboard:
      "Arrows: parent, child, siblings · N / P: next, previous territory · " +
      "Alt+arrows: pan · + / −: zoom · F: fit · R: reset · Home: root",
    nodes: "nodes",
    depth: "depth",
    ceiling: "ceiling",
    noArtifacts: "No FileTopo file in the analyzed root",
    artifactsFound: "FileTopo files found in the analyzed root",
    engine: "Rendering engine",
    sandbox: "Sandbox",
    sandboxRepoToken: "<repo>",
    searchLabel: "Search for a folder or file",
    searchPlaceholder: "Name or relative path…",
    searchClear: "Clear",
    searchEmpty: "No results.",
    searchTotal: (total) => `${total} result${total === 1 ? "" : "s"}`,
    searchPrevious: "Previous page",
    searchNext: "Next page",
    searchStale: "Results are outdated after a refresh — run the search again.",
    revealAction: "Open in Explorer",
    revealBusy: "Opening…",
    revealError: REVEAL_CODES_EN,
    revealErrorGeneric: "Could not open this item.",
    copyAction: "Copy path",
    copyBusy: "Copying…",
    copyError: {
      indexed_target_unavailable: "This item cannot be found or is inaccessible.",
      indexed_target_reparse_point: "This item is a link and its path cannot be copied.",
      indexed_target_not_openable: "This item's path cannot be copied.",
      indexed_target_not_representable: "This item's name cannot be copied as is.",
      clipboard_write_failed: "Could not copy to the clipboard.",
      platform_not_supported: "This action is only available on Windows.",
    },
    copyErrorGeneric: "Could not copy the path.",
    detailsPanelHide: "Hide details",
    detailsPanelShow: "Show details",
    panel: {
      title: "Selection details",
      empty: "Select a block on the map, or press Home.",
      loading: "Reading the index…",
      name: "Name",
      kind: "Type",
      path: "Relative path",
      size: "Size",
      modified: "Modified",
      parent: "Parent",
      children: "Direct children",
      diagnostic: "Access diagnostic",
      noDiagnostic: "none",
      noParent: "This node is the root.",
      noChildren: "No direct children.",
      childrenPrevious: "Previous page",
      childrenNext: "Next page",
      rootPath: "(root)",
      kinds: {
        root: "root",
        directory: "folder",
        file: "file",
        skipped: "skipped",
      },
    },
    territoryLabel: (name, icon, nodeCount, focused) =>
      `territory ${name}, icon ${icon}, ${nodeCount} node${nodeCount === 1 ? "" : "s"}` +
      (focused ? ", active" : ""),
    nodeLabel: (brainName, nodeName, kind, depth, childCount, diagnostic) =>
      `${brainName} · ${nodeName}, ${kind}, depth ${depth}, ` +
      `${childCount} direct children` +
      (diagnostic ? `, Access diagnostic ${diagnostic}` : ""),
    report: {
      label: "Last recorded index",
      revision: (brainId, revision) => `${brainId} · revision ${revision}`,
      territories: (count, nodeCount) =>
        `${count} territor${count === 1 ? "y" : "ies"} · ${nodeCount} node${nodeCount === 1 ? "" : "s"}`,
      indexed: (count) => `${count} items indexed`,
      lastRecorded: "Last recorded index",
    },
    checks: {
      h: {
        label: "Check H1 to H5",
        paths: (planned, disk, index) => `H1 · plan ${planned} / disk ${disk} / index ${index}`,
        violations: (n) => `N3 · ${n} violation(s)`,
        mismatches: (n, test) => `${test} · ${n} mismatch(es)`,
      },
      j: {
        label: "Check J1 to J5 and J10",
        rejected: (rejected, total) =>
          `J1–J3 · ${rejected}/${total} invalid attempt(s) rejected`,
        pending: (count) => `J2 · ${count} pending suggestion(s), outside the counts`,
        replay: (stable) => `J3 · replay ${stable ? "identical" : "DIVERGENT"}`,
        conform: (matching, total) =>
          `J5 · ${matching}/${total} node(s) matching the frozen expectation`,
        inverses: (count) => `J5 · ${count} invented inverse(s)`,
        unresolved: (count) => `J10 · ${count} unresolved endpoint(s)`,
      },
      m: {
        label: "Check M1 to M5",
        rejected: (rejected, total) =>
          `M1–M3 · ${rejected}/${total} invalid attempt(s) rejected`,
        singleBrain: (count) => `M1 · ${count} single-brain relation(s)`,
        deterministic: (count, stable) =>
          `M2 · ${count} deterministic, replay ${stable ? "identical" : "DIVERGENT"}`,
        approved: (approved, pending) =>
          `M3 · ${approved} approved, ${pending} suggestion(s) outside the counts`,
        conform: (matching, total) =>
          `M4 · ${matching}/${total} endpoint(s) matching the frozen expectation`,
        inverses: (count) => `M2 · ${count} invented inverse(s)`,
        unresolved: (count) => `M5 · ${count} unresolved endpoint(s)`,
      },
    },
    measureReport: {
      label: "H9 measurements — composed runtime regression",
      title: "H9 · WebView2 · composed runtime regression",
      brain: "Brain",
      frameMedian: "Frame med.",
      frameRange: "Frame min–max",
      selectionMedian: "Selection med.",
    },
    observe: "Observe content",
    observing: "Observing…",
    projection: {
      label: "Progressive navigation",
      summary: (visible, total, outside) =>
        `${visible} items visible out of ${total}; ${outside} outside the current view.`,
      exploreSelection: "Explore the selection",
      backToRoot: "Back to the root",
    },
    offscreen: {
      label: "Endpoints outside the current view",
      relation: (name) => `${name} — relation outside the current view.`,
      show: (name) => `Show ${name}`,
    },
    status: {
      matches: (total, visible, nodeCount) =>
        `${total} match${total === 1 ? "" : "es"} — ${visible} items visible out of ${nodeCount}`,
      visible: (visible, nodeCount) => `${visible} items visible out of ${nodeCount}`,
      normalProjectionUnreadable: (detail) => `Normal projection unreadable: ${detail}`,
      hostUnavailable: (detail) => `Host unavailable: ${detail}`,
      indexMissing:
        "No index. Prepare the synthetic example if needed, then choose Refresh to build the index.",
      failed: (detail) =>
        `Failed: ${detail}. The last recorded index remains available through Open.`,
      endpointAbsent: "Endpoint absent from the current index.",
      compositionRefused: (detail) => `Composition refused — ${detail}`,
      addRefused: (detail) => `Add refused: ${detail}`,
      activeBrainNotSaved: (detail) => `Active brain not saved: ${detail}`,
      projectionRefused: (detail) => `Projection refused: ${detail}`,
      detailUnavailable: (detail) => `Detail unavailable: ${detail}`,
      contentObserved: (hashed, indexed, generationId) =>
        `${hashed}/${indexed} files observed · ${generationId}`,
      contentObservationFailed: (detail) => `Content observation failed: ${detail}`,
      analysisDone: (engineVersion, relations, suggestions) =>
        `${engineVersion}: ${relations} relation(s), ${suggestions} suggestion(s).`,
      analysisFailed: (detail) => `Relations analysis failed: ${detail}`,
      approved: (key, brainId) =>
        `Suggestion ${key} approved in ${brainId}: it is now an APPROVED relation.`,
      approvalRefused: (detail) => `Approval refused: ${detail}`,
      confirmed: (key, brainId) =>
        `Suggestion ${key} confirmed in ${brainId}: an APPROVED relation now exists.`,
      confirmationRefused: (detail) => `Confirmation refused: ${detail}`,
      rejected: (key, brainId) =>
        `Suggestion ${key} rejected in ${brainId}: no relation created, the decision is kept.`,
      rejectionRefused: (detail) => `Rejection refused: ${detail}`,
      later: "Suggestion left pending: no decision recorded.",
      crossApproved: (key) =>
        `Inter-brain suggestion ${key} approved: it is now an APPROVED relation.`,
      crossApprovalRefused: (detail) => `Inter-brain approval refused: ${detail}`,
      revoked: (key, brainId) =>
        `Relation ${key} revoked in ${brainId}: the suggestion is pending again.`,
      revocationRefused: (detail) => `Revocation refused: ${detail}`,
      crossRevoked: (key) =>
        `Inter-brain relation ${key} revoked: the suggestion is pending again.`,
      crossRevocationRefused: (detail) => `Inter-brain revocation refused: ${detail}`,
      crossNavigation: (brainId) =>
        `Inter-brain navigation: ${brainId} joins the view. ` +
        `No relation is created, modified or approved.`,
      resolutionRefused: (detail) => `Resolution refused: ${detail}`,
      crossCheckFailed: (detail) => `Inter-brain check failed: ${detail}`,
      relationsCheckFailed: (detail) => `Relations check failed: ${detail}`,
      checkFailed: (detail) => `Check failed: ${detail}`,
      verificationWritten: (path) => `Verification written to ${path}`,
      verificationInterrupted: (detail) => `Verification interrupted: ${detail}`,
      measurementWritten: (path) => `Measurements written to ${path}`,
      measurementInterrupted: (detail) => `Measurement interrupted: ${detail}`,
      syntheticPrepared: "Synthetic example prepared. Choose Refresh to build the index.",
      syntheticRefused: (detail) => `Preparation refused: ${detail}`,
      childrenUnavailable: (detail) => `Children unavailable: ${detail}`,
      identitySaved: (icon, name) => `Brain customized: ${icon} ${name}`,
    },
    compositionRefusals: {
      composed_view_empty: "an empty composition is forbidden",
      composed_view_duplicate_brain: "this brain is already displayed",
      composed_view_unknown_brain: "this brain is not in the catalogue",
      composed_view_focus_not_displayed: "the active brain must be displayed",
      composed_view_cannot_remove_last_brain: "removing the last displayed brain is refused",
    },
    invariants: {
      brainMissingFromCatalogue: (brainId) => `brain missing from the catalogue: ${brainId}`,
      brainMismatch: (asked, received) =>
        `brain mismatch: asked for ${asked}, received ${received}`,
      projectionOfAnotherBrain: "projection of another brain refused",
      brainNotLoaded: (brainId) => `brain not loaded: ${brainId}`,
    },
  },
};
