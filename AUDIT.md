# AUDIT.md — État fonctionnel de chaque élément interactif

Produit à la fin de la Phase 9, conformément à PROMPT.md. Catalogue exhaustif,
écran par écran, de chaque élément interactif de l'application avec son état :

- **✅ Fonctionnel** — fait exactement ce qu'il promet, données réelles, aucun raccourci.
- **🟡 Partiel** — fonctionne mais avec une limite assumée et documentée (voir la note).
- **❌ Non implémenté** — visible mais inerte, ou reporté à une phase ultérieure (Phase 10).

Écrans de démonstration exclus de cet audit : `/styleguide` (composant de
démonstration du design system, jamais présenté comme un écran produit — voir
CLAUDE.md § Structure actuelle).

---

## Authentification (`/login`, `/signup`, `/forgot-password`, `/reset-password`)

| Élément | État | Note |
|---|---|---|
| Connexion email + mot de passe | ✅ | Better Auth, limite de débit sur échecs répétés |
| Étape 2FA TOTP (si activée) | ✅ | Code + codes de récupération à usage unique |
| Inscription | ✅ | Politique 12 caractères, blocage mots de passe compromis (liste locale), vérification email obligatoire |
| Mot de passe oublié → lien à usage unique | ✅ | Expiration 1 h, invalidation des sessions actives après changement, email de notification |
| Renvoi d'email de vérification | ✅ | Limité en débit |
| Messages d'erreur | ✅ | Non discriminants (ne révèlent jamais si un email existe) |

## Vue d'ensemble (`/`)

| Élément | État | Note |
|---|---|---|
| Sélecteur de mois (remplace l'ancien sélecteur de période, mort depuis la Phase 0) | ✅ | 12 derniers mois réels, persisté dans l'URL (`?month=`), pilote le CA affiché et le graphique 12 mois |
| CA encaissé + variation vs mois précédent | ✅ | Calculé depuis `invoice_payments`, jamais depuis les factures émises non payées |
| Graphique CA sur 12 mois | ✅ | Données réelles mois par mois |
| Trésorerie à 3 mois (graphique + chiffre) | ✅ | Projection réelle (solde actuel + encours attendu − charges estimées dans la fenêtre), 3 points à 30/60/90 jours |
| Carte ÉCHÉANCES (3 prochaines) | ✅ | Lecture réelle de `deadlines`, lien "Voir le calendrier" vers `/treasury` |
| Carte EN RETARD (nombre, montant, plus vieille facture) | ✅ | Bouton "Relancer maintenant" envoie une vraie relance à toutes les factures en retard |
| Carte DÉPENDANCE (concentration du CA) | ✅ | Calculée sur toutes les factures émises, seuil d'alerte à 30 % (seuil d'interface, pas une règle fiscale) ; affiche un message neutre tant qu'il n'y a pas assez de factures |
| Bouton "Nouvelle facture" | ✅ | Vers `/invoices/new` |
| Bouton "Relancer N factures" | ✅ | Identique au bouton de la carte EN RETARD |

## Clients (`/clients`, `/clients/[id]`)

| Élément | État | Note |
|---|---|---|
| Liste + recherche | ✅ | Recherche locale (nom/SIRET/email) — pas encore persistée dans l'URL (voir note Phase 7 dans CLAUDE.md : seul `/treasury` a reçu ce traitement pour limiter le diff) |
| Création (formulaire complet) | ✅ | Détection de doublon (nom/SIRET) avec confirmation |
| Édition | ✅ | |
| Archivage / réactivation | ✅ | |
| Suppression | ✅ | Confirmation forte (saisie du nom du client) ; bloquée si des documents existent (redirige vers l'archivage) |
| Indicateurs (CA cumulé, encours, délai de paiement moyen, part du CA) | ✅ | Calculés à la volée, avoirs soustraits jamais additionnés |

## Devis & Factures (`/invoices`, `/quotes/*`, `/invoices/*`)

| Élément | État | Note |
|---|---|---|
| Liste combinée devis + factures | ✅ | |
| Export CSV / FEC | ✅ | Format réglementaire, écritures équilibrées, testé unitairement |
| Création/édition devis (brouillon) | ✅ | Lignes réordonnables via le formulaire, remises %/montant |
| Envoi devis + lien public | ✅ | Email avec pièce jointe PDF |
| Expiration automatique des devis | 🟡 | Bascule à la lecture (lazy), pas encore un vrai cron — cron réel prévu Phase 10 |
| Duplication devis | ✅ | |
| Conversion devis → facture | ✅ | Reprend les lignes, référence le devis d'origine |
| Consultation publique + acceptation/refus horodatés | ✅ | Jeton non devinable, sans session |
| Création/édition facture (brouillon) | ✅ | |
| Émission (numérotation, mentions légales, snapshot) | ✅ | Transaction verrouillée testée en concurrence (20 émissions simultanées → 20 numéros uniques) |
| Immuabilité post-émission | ✅ | Vérifiée activement contre la connexion admin qui contourne la RLS, pas seulement supposée |
| Avoir (annulation totale ou partielle) | ✅ | Confirmation forte (saisie du numéro de facture) pour l'annulation totale |
| Paiement (total/partiel) | ✅ | Solde restant dû recalculé, statut mis à jour |
| Relance manuelle | ✅ | |
| Proposition automatique des factures à relancer | 🟡 | Bascule "en retard" à la lecture (lazy), pas de rappel programmé — cron réel Phase 10 |
| Facturation récurrente | ❌ | Schéma prêt (`recurring_invoice_templates`), aucune interface ni génération programmée — non couvert par un phase explicite du plan, à faire en Phase 10 avec les tâches planifiées |
| PDF facture/devis | ✅ | |
| Journal d'audit (création, émission, envoi, paiement, avoir) | ✅ | Inaltérable, vérifié contre la connexion admin |

## Trésorerie & charges (`/treasury`)

| Élément | État | Note |
|---|---|---|
| Comptes bancaires (CRUD, solde) | ✅ | |
| Transactions (CRUD, recherche/filtres) | ✅ | Filtres persistés dans l'URL (`?q=&account=&category=`) |
| Justificatifs (upload, consultation) | ✅ | Signature binaire vérifiée (pas seulement le Content-Type déclaré), stockage privé, aucune URL publique |
| Catégories + règles d'auto-catégorisation | ✅ | Suppression avec annulation (toast), pas de confirmation bloquante |
| Rapprochement facture ↔ transaction | ✅ | Solde facture recalculé, réversible (annulation du rapprochement) |
| Suppression de transaction rapprochée | ✅ | Confirmation native + reversion correcte du solde facture |
| Cotisations & impôts estimés | ✅ | S'affiche seulement si le statut + les paramètres fiscaux de l'année sont saisis ; sinon bandeau explicite, jamais de chiffre inventé |
| Jauge seuil micro-entreprise / franchise TVA | ✅ | |
| Calendrier des échéances (CRUD, marquage traité/ignoré, rappel email) | ✅ | Rappel déclenché manuellement — cron réel Phase 10 |
| Déclaration de TVA (préparation, export) | ✅ | TVA collectée recalculée depuis les factures ; TVA déductible saisie manuellement (aucun taux de TVA capturé sur les dépenses actuellement) |

## Prévisionnel (`/forecast`)

| Élément | État | Note |
|---|---|---|
| Objectif de CA annuel (saisie + suivi) | ✅ | |
| Pipeline pondéré | ✅ | Un devis sans probabilité saisie compte pour 100 %, jamais une probabilité inventée |
| Projection de trésorerie à 3 et 6 mois | ✅ | Même moteur que la carte du tableau de bord |
| Simulateur de revenu net comparatif (3 statuts) | ✅ | Calcul client-side réactif au slider ; paramètres fiscaux résolus côté serveur par statut, bandeau si incomplets |
| Simulation EURL/SASU | 🟡 | Simplification assumée et documentée : bénéfice imposable = CA fourni (aucune charge déductible modélisée), 100 % du résultat net supposé versé en rémunération — comparatif d'ordre de grandeur, pas une liasse fiscale |

## Temps & rentabilité (`/time`)

| Élément | État | Note |
|---|---|---|
| Chrono persistant (démarrer/arrêter depuis n'importe quel écran) | ✅ | Widget dans l'en-tête, visible sur tout l'app, survit à un rechargement |
| Grille hebdomadaire (saisie, navigation semaine, lundi en premier) | ✅ | Navigation persistée dans l'URL (`?week=`) |
| Ajout/suppression d'entrée | ✅ | Suppression avec annulation (toast) ; une entrée déjà convertie ne peut plus être supprimée |
| Distinction facturable / non facturable | ✅ | |
| Projets (CRUD, archivage, TJM cible) | ✅ | |
| Conversion du temps en ligne de facture | ✅ | Regroupe les entrées sélectionnées en une ligne d'une facture brouillon ; le taux de TVA est **toujours saisi par l'utilisateur**, jamais un défaut (interdiction d'inventer un taux) |
| TJM effectif par projet vs TJM cible | ✅ | Basé sur le montant réellement facturé (ligne convertie), pas une estimation |
| Classement des clients par rentabilité | ✅ | |

## Paramètres (`/settings`, `/settings/fiscal/[year]`, `/settings/security`)

| Élément | État | Note |
|---|---|---|
| Profil entreprise (raison sociale, SIRET, TVA, adresse, IBAN…) | ✅ | Rien de présumé, tout nullable |
| Logo | ✅ | Upload validé (signature binaire, taille, pas de SVG) |
| Statut juridique et périodes | ✅ | Table de périodes, pas un champ unique ; validation anti-chevauchement |
| Régime de TVA avec bascule datée | ✅ | Même mécanisme que le changement de statut (colonne sur la période) |
| Séries et format de numérotation | ✅ | |
| Mentions légales personnalisables | ✅ | |
| Conditions de paiement / TJM par défaut | ✅ | |
| Paramètres fiscaux par année/statut | ✅ | Formulaire généré depuis `lib/fiscal/param-definitions.ts`, jamais de valeur par défaut |
| Raccourcis clavier documentés | ✅ | Cmd/Ctrl K, Échap |
| Onboarding (parcours sautable, indicateur de complétude) | ✅ | |
| Sécurité : mot de passe, 2FA, sessions actives (révocation), changement d'email, export RGPD, suppression de compte | ✅ | Suppression avec confirmation forte (saisie de l'email) |
| Modèles d'email | ❌ | Non exposés dans l'interface (personnalisation par défaut uniquement) — reporté, non bloquant |
| Import initial de données | ❌ | Non implémenté — non couvert explicitement par une phase du plan |

## Transverse

| Élément | État | Note |
|---|---|---|
| Palette de commandes (Cmd/Ctrl K) | ✅ | Recherche réelle (clients, devis, factures, projets) + actions rapides vers de vraies destinations |
| Recherche globale | 🟡 | Fusionnée avec la palette de commandes (une seule surface de recherche, choix assumé) ; ne couvre pas les transactions, échéances ou entrées de temps — ceux-ci ont leurs propres filtres dédiés (`/treasury`, `/time`) |
| Filtres/tri persistés dans l'URL | 🟡 | Fait sur `/treasury` (transactions) et `/time` (semaine) et le tableau de bord (mois) ; la recherche `/clients` reste en état local (Phase 5, non rétrofitée pour limiter le diff) |
| Toasts avec annulation | 🟡 | Couvre les suppressions réversibles et bon marché à annuler (échéance, catégorie, règle, entrée de temps) ; les suppressions aux effets de bord complexes (transaction rapprochée) gardent une confirmation native simple, sans annulation automatique — annuler proprement un rapprochement en cascade n'est pas implémenté |
| Confirmations fortes (saisie du nom) | ✅ | Suppression de client, suppression de compte, annulation de facture émise — réservées aux actions à conséquence réelle et difficile à défaire |
| En-têtes de sécurité / CSP | ❓ | À vérifier en Phase 10 (`next.config`) |
| Tâches planifiées (rappels, expiration, factures récurrentes) | ❌ | Reportées à la Phase 10 (Vercel Cron), en attendant : bascules "à la lecture" partout où c'est listé ci-dessus comme 🟡 |

---

## Résumé

Sur l'ensemble du catalogue ci-dessus : la quasi-totalité des éléments interactifs
est fonctionnelle avec des données réelles. Les limites assumées (🟡) sont
documentées avec leur raison ; aucune n'est un bouton mort silencieux. Les seuls
éléments non implémentés (❌) sont soit explicitement réservés à la Phase 10
(tâches planifiées), soit hors du périmètre couvert par un phase précis du plan
(modèles d'email personnalisables, import initial, facturation récurrente) et
n'ont jamais été présentés comme actifs dans l'interface.
