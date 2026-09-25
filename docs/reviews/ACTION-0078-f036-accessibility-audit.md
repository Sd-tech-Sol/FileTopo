# ACTION-0078 — Audit F-036 / accessibilité du runtime V1

- **Date :** 2026-09-25
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Prérequis :** TASK-0046 / F-035 VERIFIED par ACTION-0077
- **Portée auditée :** `F-036`, partie accessibilité de `P-21`; impact sur `P-19`

## Constat réel

`F-036` n'est **pas** un chantier from-scratch. Le runtime courant possède
déjà plusieurs briques à conserver :

- `MapView` expose un arbre sémantique (`role=tree`, `treeitem`,
  `aria-activedescendant`) et un `handleKeyDown`;
- les agrégats de carte sont activables au clavier;
- `CompositionBar` implémente un menu clavier et des états ARIA;
- les formulaires/panneaux utilisent labels, alertes et états ARIA;
- `map.css` a un `:focus-visible` global et plusieurs focus visibles
  spécialisés;
- `map.css` respecte déjà `prefers-reduced-motion: reduce` en supprimant
  transitions et animations;
- plusieurs états visuels portent aussi un mot, symbole, contour ou attribut
  sémantique plutôt qu'une couleur seule;
- les principaux couples de tokens texte/fond inspectés dépassent 4,5:1 en
  clair et en sombre.

Mais aucune preuve actuelle ne permet de déclarer `F-036` ou `P-21`
fermées : la ligne de matrice cite encore l'ancien prototype, aucun audit WCAG
automatisé du vrai WebView2 n'est publié, aucun parcours clavier global ne
prouve l'absence de piège, et les contrastes / alternatives non colorées ne
sont pas inventoriés systématiquement.

## Reuse-first : outil d'audit

Pour la prochaine tranche, le choix principal est **axe-core**, en
**devDependency seulement**, injecté dans le vrai WebView2 par le harnais
existant :

- dépôt officiel `dequelabs/axe-core`, organisation Deque vérifiée et active;
- version courante contrôlée : **4.13.0**;
- licence **MPL-2.0**;
- paquet npm `axe-core` : **0 dépendance npm** déclarée;
- règles WCAG 2.0/2.1/2.2 A/AA disponibles;
- fonctionne dans Edge/WebView2; la règle de contraste n'est pas fiable sous
  JSDOM, donc la preuve de contraste doit rester dans le vrai moteur navigateur.

**Écarté :** MCP / service Axe distant. Il n'est pas nécessaire pour FileTopo,
ajouterait authentification/service externe et peut transmettre du contexte de
page selon les fonctions utilisées. FileTopo peut garder l'audit 100 % local.

Ce choix ne met aucune dépendance dans le runtime produit : elle sert aux tests
et au harnais de preuve seulement, version épinglée et lockfile contrôlé.

## Frontière de la prochaine tranche

Choisir **TASK-0047 — V1 Accessibility Closure** :

1. inventaire complet des surfaces interactives du vrai `MapApp`;
2. audit axe-core dans **WebView2 réel**, FR et EN, clair et sombre lorsque
   pertinent, règles WCAG 2.2 A/AA applicables;
3. corriger uniquement les violations réelles;
4. parcours clavier de bout en bout sans piège, avec focus visible et parité
   des actions souris/clavier;
5. contrôle du contraste texte >= 4,5:1 selon le contrat `P-21`, et contrôle
   des contrastes non-textuels requis par les règles A/AA applicables;
6. inventaire et preuve que tout codage porteur de sens a une alternative non
   colorée;
7. preuve réelle de `prefers-reduced-motion`;
8. aucun changement de source, Index, journal, seen, resume ou watcher;
9. aucune « option d'accessibilité » nouvelle inventée uniquement pour fermer
   la tâche;
10. aucune certification générale ou juridique « WCAG compliant » : on ferme
    le **contrat produit F-036/P-21**, avec résultats axe et contrôles manuels
    publiés.

## Impact produit

Si TASK-0047 passe un contrôle indépendant :

- `F-036` pourra être déclarée VERIFIED dans sa portée;
- `P-21` pourra être CLOSED / VERIFIED par composition ACTION-0077 + TASK-0047;
- `P-19` restera PARTIELLE : persistance de composition multi-cerveaux,
  légende/préférences non couvertes et toute option d'accessibilité réellement
  décidée restent une tranche distincte.

Aucune persistance nouvelle et aucune TASK-0048 ne sont justifiées ici.
