# ACTION-0051 — Recontrôle indépendant de TASK-0033

- Date : 2026-09-10
- Statut : `CLOSED / VERIFIED`
- Tâche contrôlée : `TASK-0033 — V1 Progressive Topographic UX`
- Branche : `build/v0.2-a17-v1-topographic-ux`
- Livraison contrôlée : `243e21b`, résultat épinglé par `156361a`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l'exécuteur
- Verdict : **VERIFIED dans la portée de TASK-0033**

## Verdict

Le verrou restant de `ACTION-0050` est fermé. La passe d'acceptation a exécuté le vrai produit sous WebView2 sur une arborescence `REAL_ROOT` synthétique de 5 206 éléments aux deux tailles demandées, a découvert deux défauts réels dans la portée de TASK-0033, les a corrigés, puis a rejoué les validations. Aucune donnée personnelle n'a été utilisée.

`TASK-0033` est donc `VERIFIED` dans sa portée. Ce verdict ne constitue pas une acceptation de performance sur laptop modeste, ni une validation des fonctions explicitement hors portée (watcher, changements récents, recherche avancée, ouverture Explorer, préférences écran/icône).

## Contrôle indépendant

1. **Preuve WebView2 réelle.** `docs/performance/runs/TASK-0033-webview2.json` rapporte WebView2 `152.0.4191.66`, Tauri `2.11.5`, SQLite `3.53.2`, un corpus synthétique de 5 206 nœuds et deux passes à 1366×768 et 1920×1080.
2. **Projection bornée.** `VIEW_BUDGET = 512` reste la borne dure et `ORDINARY_MATERIAL_TARGET = 64` reste une cible produit. La passe réelle confirme la cible ordinaire, la priorité dossiers et la pagination sans accumulation.
3. **Défaut A correctement circonscrit.** `materialize_view` ne descend plus automatiquement dans les petits-enfants : seule la page des enfants directs du focus est matérialisée; descendre d'un niveau exige une nouvelle projection explicite. Aucun nouveau tri, index, store ou renderer n'est introduit.
4. **Défaut B correctement circonscrit.** `MapApp` réapplique `clampView` uniquement lors d'un changement des dimensions mesurées du viewport. Ce chemin ne recentre pas et ne remplace pas `readableView`/`recenterOnFocus`; il maintient seulement le pan/zoom dans les bornes valides.
5. **Tests ajustés sans changement de sujet.** Les helpers de résolution ajoutés dans les modules de tests naviguent explicitement jusqu'aux nœuds imbriqués maintenant que la vue racine n'expose plus les petits-enfants par accident. Les chemins produit des relations restent inchangés.
6. **Confidentialité.** Le harnais génère sa propre arborescence, enregistre un `REAL_ROOT` synthétique dans un sandbox de preuve, vérifie l'absence de chemin absolu dans le DOM, les payloads `map_view` et le log hôte, puis détruit la source de preuve.
7. **Validations de l'exécuteur.** Rust 328 PASS, TypeScript 289 PASS, `pnpm check`, `pnpm build`, `cargo build --offline` et `git diff --check` verts. Clippy strict reste rouge à 26 erreurs historiques selon le rapport, sans nouveau diagnostic attribué à cette passe.

## Acceptation produit observée

- 1366×768 et 1920×1080 exercés dans le même processus WebView2 par `Emulation.setDeviceMetricsOverride`;
- branche de 120 dossiers : 62 affichés, 58 omis;
- branche mixte 40 dossiers + 90 fichiers : les 40 dossiers sont retenus avant les fichiers, 22 fichiers admis, 68 omis;
- deux pages successives d'une branche plate sans recouvrement de nœuds;
- navigation explicite sur plusieurs niveaux;
- navigation de branche sans changement d'échelle;
- `Ajuster` produit un fit exhaustif, `Réinitialiser` revient à l'échelle lisible `1`;
- pastille d'agrégat 150×34, sans jargon interne;
- 0 erreur console fatale;
- aucune fuite de chemin absolu observée.

## Réserves non bloquantes

- Le redimensionnement est émulé via CDP plutôt qu'effectué par changement physique de moniteur.
- La passe a lieu sur le poste de développement, pas sur un laptop modeste : aucune promesse de performance matérielle nouvelle n'est créée.
- La palette directionnelle historique des relations n'appartient pas au verrou corrigé ici et reste une amélioration UX ultérieure.

## État

`TASK-0033 = VERIFIED` dans sa portée. `DEC-0034 = APPROVED`.

La prochaine tranche doit continuer vers une V1 utilisable, sans rouvrir cette architecture.