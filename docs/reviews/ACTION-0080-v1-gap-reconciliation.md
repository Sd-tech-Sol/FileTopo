# ACTION-0080 — Réconciliation des écarts V1 après P-21

- Date : 2026-09-26
- Statut : CLOSED — prochaine tranche choisie
- Base auditée : 2645431b83ebfe2bad41c0f0e9f255b68417ea43
- Prérequis : ACTION-0079

## But

Réconcilier la FEATURE_MATRIX avec le runtime courant et les contrôles indépendants déjà présents avant de créer une nouvelle tâche. Aucun code produit n'est modifié.

## Statuts historiques corrigés

### F-009 à F-012 — navigation de carte

Les quatre lignes étaient encore PROPOSED sur la base de l'ancien TerrainMap/App. TASK-0033 / ACTION-0051 a contrôlé le vrai MapApp et WebView2 : pan/zoom, Ajuster explicite, Réinitialiser, projection bornée et clavier. Elles passent à IMPLEMENTED avec limites de preuve documentées. P-11 n'est pas auto-fermé par cette action.

### F-023, F-024, F-026 — contexte, copie et enfants directs

TASK-0035 / ACTION-0056 a vérifié le panneau Détails branché sur l'Index, les enfants directs paginés via Index::children_page(), et la copie sûre du chemin par BrainNodeRef sans chemin absolu renvoyé au WebView. Les trois lignes passent à IMPLEMENTED. La fiche TASK-0035 est corrigée de READY à VERIFIED selon ACTION-0056.

### F-014 — légende

Le statut IMPLEMENTED était fondé sur l'ancien App.tsx. Le runtime courant MapApp, mapStrings et map.css ne contiennent aucune légende produit. F-014 revient à PROPOSED. TASK-0047 prouve les alternatives non colorées, mais cela ne remplace pas P-10.

### F-006 — index reconstructible

Le produit possède déjà Open / Refresh / Rebuild séparés, rebuild transactionnel, rollback réel et conservation du dernier Index fiable via TASK-0031 / ACTION-0048. Mais le critère F-006 exact demande encore une preuve explicite : supprimer l'index puis reconstruire et comparer corpus/hiérarchie, avec l'état non reconstructible énuméré. F-006 reste PROPOSED sans nier son socle.

## Audit F-005 — lacune réelle

Le scanner refuse une racine symlink/reparse et matérialise les entrées symlink/reparse comme Skipped sans les suivre. Mais il n'existe aucune exclusion utilisateur configurable/listable, ni politique commune scanner/refresh/rebuild/watcher.

## Reuse-first

- ignore 0.4.33 : maintenu dans ripgrep, MIT OR Unlicense; moteur complet de parcours/ignore, trop large ici et avec plusieurs dépendances/comportements gitignore non demandés.
- globset 0.4.20 : actif, MIT OR Unlicense; utile pour les globs, mais le contrat F-005 n'exige aucune syntaxe wildcard.
- glob et walkdir visibles dans Cargo.lock ne sont pas des dépendances directes de FileTopo et ne doivent pas devenir une API implicite.

Décision : aucune nouvelle dépendance V1. Les règles utilisateur seront des sous-arbres relatifs exacts, normalisés côté backend avec std::path. Reparse/symlink reste une règle de sécurité intégrée non désactivable.

## Choix

La prochaine tranche est TASK-0048 — V1 Safe Exclusion Policy.

Motif : F-005 est P0/MVP et constitue une capacité produit réellement absente. F-006 a déjà son noyau et surtout un manque de preuve spécifique. F-014 est une lacune réelle mais P1. P-19 reste PARTIELLE et ne doit pas être mélangée à cette tranche.

Exécuteur suivant : Codex.