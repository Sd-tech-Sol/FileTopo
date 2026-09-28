# Action suivante

## Décision de Sébastien : `node-diagnostic` (TASK-0050 corrective, `BLOCKED`)

`node-diagnostic` est actuellement irréalisable sur un index réellement publié
(`src-tauri/src/map/commands.rs:745-749` refuse toute publication dès qu'un
diagnostic de scan existe, y compris au premier scan; confirmé par la suite
`SCAN_INCOMPLETE` de `source_availability_tests.rs`). Le prouver en WebView2
réel demanderait un changement Rust, hors périmètre d'une passe corrective de
légende (TASK-0050 §K).

Choisir entre :

1. amender DEC-0048 §C pour retirer ou requalifier `node-diagnostic` en
   manque documenté (comme P-19);
2. autoriser explicitement le changement Rust minimal qui permettrait de
   publier un index portant un diagnostic connu.

Détail complet : `docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section O;
`docs/ai/VALIDATION.md` section CR.

Tant que ce choix n'est pas fait, `TASK-0050` / `F-014` / `P-10` restent
`BLOCKED`, jamais `VERIFIED`. Aucune TASK-0051.
