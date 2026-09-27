# ACTION-0084 — Contrôle indépendant final de TASK-0049

- **Date :** 2026-09-26
- **Statut :** `CLOSED`
- **Tâche :** `TASK-0049 — V1 Reconstructibility & Index-Generation Safety`
- **Branche :** `build/v0.2-a33-v1-reconstructibility-closure`
- **HEAD contrôlé :** `1d975f0bcb4a8f41e9c48e373a86f3840abba9a5`
- **Commit produit contrôlé :** `bfb173d3fad656030e28c82a9056aa04ef487634`
- **Verdict :** `VERIFIED` dans la portée F-006

## Verdict

**PASS. TASK-0049 et F-006 sont VERIFIED dans leur portée V1.**

## Contrôles indépendants

1. **Génération existante réutilisée.** Aucun nouvel identifiant parallèle :
   l'enveloppe privée de resume v2 est liée à l'`index_id` existant.
2. **Backend autoritaire.** `map_brain_resume_update` lit l'identité de
   l'Index via `open_store`; le DTO frontend reste à cinq champs et ne peut pas
   fournir l'`index_id`.
3. **Legacy / génération étrangère.** Un record v1 ou un record v2 d'un autre
   `index_id` efface focus/sélection **avant** tout lookup numérique. Les
   préférences indépendantes restent conservées, puis la correction est
   persistée sous la génération courante.
4. **Même génération.** Le comportement historique est conservé : focus,
   sélection, filtres et caméra restent restaurés selon les gardes déjà
   vérifiées.
5. **Réattribution réellement prouvée.** Le test Rust construit
   `a,b,c,d`, retire `a`, garde `b=3` dans l'ancienne génération puis
   reconstruit fraîchement : `b=2` et l'ancien id `3` désigne `c`.
   Le resume ne sélectionne jamais `c`.
6. **Digest inter-génération.** `reconstructible_digest()` n'encode plus
   `node_id` ni `parent_id`; la parenté est encodée par chemin relatif du
   parent. Nom, kind, profondeur, taille, modified time, disponibilité,
   reparse, child_count, diagnostic, stable_key et provenance entrent dans le
   digest, trié par champs logiques.
7. **Inventaire fermé.** `NON_RECONSTRUCTIBLE_KEYS` contient exactement neuf
   états : `built_unix_ms`, `index_id`, `index_revision`,
   `change_events`, `seen_change_events`, `seen_through_event_id`,
   `next_node_id`, `node_id_allocation`, `nodes.seen_legacy`.
8. **Nouvelle baseline honnête.** Après perte, la publication fraîche utilise
   `BaselineFull`; le journal démarre vide et aucun ancien seen/unseen n'est
   synthétisé.
9. **Source absente après perte.** Le chemin `publish_locked` résout et
   scanne la source avant `BrainIndex::open` lorsque le fichier n'existe
   plus. Une source absente échoue donc avant toute création d'Index partiel.
10. **Rollback existant conservé.** Les tests lifecycle de TASK-0031 continuent
    de couvrir l'échec d'un rebuild avec Index présent et la conservation du
    dernier Index fiable.
11. **Preuve réelle.** L'artefact TASK-0049 rapporte trois processus WebView2,
    deux redémarrages, nouvel index_id, digest logique identique, mapping
    `b: 3→2` / ancien 3 → `c.txt`, correction resume persistée, journal
    neuf vide, policy/source/stores externes inchangés et zéro erreur console
    fatale.
12. **Frontière de suppression.** Aucun bouton ni commande produit de
    suppression n'est ajouté; le harnais supprime l'Index seulement entre deux
    processus fermés et sous chemin synthétique validé.

## Preuves exécuteur conservées comme telles

Codex rapporte :

- Rust ciblé : 27 PASS;
- Rust complet : 770 PASS, 0 échec, 6 ignorés;
- TypeScript ciblé : 41 PASS;
- TypeScript complet : 625 PASS;
- check/build/Tauri/WebView2/diff check/audit public : PASS;
- Clippy : dette historique 13/22, aucune ligne TASK-0049.

Aucun check GitHub Actions/status n'est attaché au HEAD contrôlé. Ces nombres
restent donc des preuves d'exécuteur; le contrôle indépendant a porté sur le
diff, le code, les tests déterministes, le harnais et l'ordre réel des
opérations.

## Limites

- Windows/NTFS local;
- fermetures normales;
- crash recovery non revendiqué;
- inter-volume non revendiqué;
- la reconstruction du harnais invoque la commande produit Tauri par IPC,
  sans clic physique sur le bouton.

## Conclusion

- `TASK-0049 = VERIFIED`
- `F-006 = VERIFIED dans sa portée`
- aucune TASK-0050 n'est créée par ce verdict; prochaine lacune à auditer.
