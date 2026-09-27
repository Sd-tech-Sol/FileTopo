# Action suivante

## Préparer / exécuter TASK-0049 — V1 Reconstructibility & Index-Generation Safety

TASK-0048 / F-005 sont **VERIFIED** par ACTION-0082.

ACTION-0083 confirme F-006 comme prochaine lacune P0. Le pipeline de rebuild
existe déjà; la tranche doit fermer deux écarts actuels :

1. inventaire `nonReconstructible` devenu incomplet depuis journal/seen;
2. resume focus/sélection lié seulement à `nodeId`, donc potentiellement
   recollé au mauvais nœud après perte complète et recréation d'Index.

Préparer TASK-0049 sur une nouvelle branche. Exécuteur prévu : **Codex +
GPT-5.6 Sol — High effort**.
