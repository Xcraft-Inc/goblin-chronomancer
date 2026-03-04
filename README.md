# 📘 goblin-chronomancer

## Aperçu

Le module `goblin-chronomancer` est un gestionnaire de tâches planifiées (cron jobs) pour l'écosystème Xcraft. Il permet de créer, gérer et exécuter des tâches récurrentes selon des expressions cron ou des timestamps Unix spécifiques. Ce module fournit une abstraction pour la planification de commandes Xcraft à exécuter à des moments précis, avec persistance des entrées en base de données.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Détails des sources](#détails-des-sources)
- [Licence](#licence)

## Structure du module

Le module est composé de deux acteurs principaux :

1. **Chronomancer** — Un acteur singleton (`Elf.Alone`) qui orchestre l'ensemble des entrées cron. Il est le point d'entrée pour la création, la gestion et la supervision des tâches planifiées.
2. **CronEntry** — Un acteur persisté (`Elf.Archetype`) qui représente une tâche planifiée individuelle. Chaque entrée encapsule sa propre instance de `CronJob` (bibliothèque `cron`).

Ces acteurs suivent le modèle Elf du framework Xcraft avec une séparation claire entre la logique métier (`Logic`) et l'état (`State`).

## Fonctionnement global

Le `Chronomancer` agit comme un orchestrateur central pour toutes les tâches planifiées. Lors de son initialisation (`init`), il interroge la base de données `chronomancer` pour charger toutes les entrées cron existantes et les démarre automatiquement.

### Cycle de vie des tâches

1. **Création/mise à jour** : Une tâche est créée ou mise à jour via `upsert()` avec ses paramètres de planification.
2. **Démarrage** : L'entrée cron crée un `CronJob` et commence à planifier les exécutions.
3. **Exécution** : À chaque déclenchement, la commande Xcraft spécifiée est exécutée via `this.quest.cmd()`.
4. **Gestion des erreurs** : Les erreurs sont capturées, loggées et accessibles via `error()`.
5. **Arrêt/Suppression** : Une tâche peut être arrêtée temporairement (`stop`) ou supprimée définitivement (`trash`).

### Mécanisme d'exécution

La méthode privée `_job()` gère l'exécution effective :

- **Prévention des exécutions concurrentes** : le flag `_running` empêche qu'une même tâche soit lancée deux fois simultanément.
- **Mesure du temps d'exécution** : via `hrtime.bigint()` avec précision à la milliseconde.
- **Journalisation conditionnelle** : activée ou désactivée selon `loggingMode`.
- **Capture des erreurs** : via `this.quest.logCommandError()`, l'erreur est également stockée localement.

```
Chronomancer.init()
  └─> CronEntryLogic.db (cryo reader)
        └─> pour chaque cronEntry persistée
              └─> new CronEntry(this).create(id, desktopId)
                    └─> cronEntry.start()
                          └─> new CronJob(time, _job, ...)
                                └─> _job() → this.quest.cmd(command, payload)
```

## Exemples d'utilisation

### Création d'une tâche planifiée récurrente

```javascript
// Dans une méthode d'un acteur Elf
async createBackupTask() {
  const chronomancer = new Chronomancer(this);

  // Sauvegarde quotidienne à 2h du matin
  await chronomancer.upsert(
    'daily-backup',
    '0 2 * * *',
    'backup.create',
    { type: 'full', destination: '/backup/daily' },
    'enabled'
  );
}
```

### Planification d'une tâche à un moment précis (timestamp Unix)

```javascript
async scheduleMaintenanceWindow() {
  const chronomancer = new Chronomancer(this);

  const maintenanceDate = new Date('2025-01-01T00:00:00Z').getTime();

  await chronomancer.upsert(
    'maintenance-2025',
    maintenanceDate,
    'system.maintenance',
    { mode: 'full', notify: true }
  );
}
```

### Gestion dynamique des tâches

```javascript
async manageCronTasks() {
  const chronomancer = new Chronomancer(this);

  // Vérifier l'état d'une tâche
  const isRunning = await chronomancer.running('daily-backup');

  if (!isRunning) {
    // Redémarrer avec exécution immédiate
    await chronomancer.restart('daily-backup', true);
  }

  // Obtenir les 5 prochaines exécutions planifiées
  const nextRuns = await chronomancer.nextDates('daily-backup', 5);

  // Lister toutes les tâches dont le nom commence par 'backup'
  const backupTasks = await chronomancer.getAllEntriesLike('backup');
}
```

### Suppression d'une tâche

```javascript
async removeObsoleteTask() {
  const chronomancer = new Chronomancer(this);
  await chronomancer.remove('maintenance-2025');
}
```

## Interactions avec d'autres modules

- **[xcraft-core-goblin]** — Fournit les abstractions `Elf`, `Elf.Alone`, `Elf.Archetype`, `Elf.Spirit` et `SmartId` utilisées pour définir les acteurs.
- **[xcraft-core-stones]** — Fournit les types (`string`, `object`, `enumeration`, `union`, `number`) pour définir la structure des shapes d'état.
- **[xcraft-core-utils]** — Utilitaires généraux du framework Xcraft.
- **cron** — Bibliothèque externe (`^3.1.6`) qui fournit `CronJob` et `sendAt` pour la planification et la vérification des dates.

Le module peut exécuter n'importe quelle commande Xcraft via `this.quest.cmd()`, lui permettant d'interagir avec l'ensemble des modules du système.

## Détails des sources

### `chronomancer.js`

Point d'entrée racine qui exporte les commandes Xcraft pour l'acteur `Chronomancer` via `Elf.birth(Chronomancer, ChronomancerLogic)`.

### `cronEntry.js`

Point d'entrée racine pour l'acteur `CronEntry`, exporte ses commandes Xcraft via `Elf.birth(CronEntry, CronEntryLogic)`.

### `lib/chronomancer.js`

Implémente le singleton `Chronomancer` (`Elf.Alone`) et sa logique `ChronomancerLogic` (`Elf.Spirit`).

#### État et modèle de données

L'état du `Chronomancer` est minimal, défini par `ChronomancerShape` :

```javascript
class ChronomancerShape {
  id = string; // Toujours 'chronomancer'
}
```

Le `_desktopId` interne est fixé à `'system@chronomancer'` et utilisé pour toutes les instanciations de `CronEntry`.

#### Méthodes publiques

- **`init()`** — Quête d'initialisation du singleton. Charge toutes les entrées cron persistées depuis la base `chronomancer` et démarre chacune d'elles.
- **`upsert(name, cronTime, command, payload, loggingMode='enabled')`** — Crée ou met à jour une entrée cron identifiée par `name`. `cronTime` peut être une expression cron (string, ex. `'0 2 * * *'`) ou un timestamp Unix en millisecondes (number).
- **`remove(name)`** — Supprime définitivement une entrée cron (la marque `trashed`). Sans effet si l'entrée n'existe pas.
- **`start(name)`** — Démarre la planification d'une entrée cron spécifique.
- **`stop(name)`** — Arrête temporairement l'exécution d'une entrée cron sans la supprimer.
- **`restart(name, asap=false)`** — Arrête puis redémarre une entrée cron. Si `asap` est `true`, déclenche une exécution immédiate via `fire()`.
- **`running(name)`** — Retourne `true` si le `CronJob` sous-jacent est actuellement actif.
- **`nextDates(name, count=1)`** — Retourne un tableau des prochaines dates d'exécution planifiées.
- **`getAllEntriesLike(name)`** — Recherche en base toutes les entrées cron dont l'ID commence par le motif dérivé de `name`. Retourne les champs `id`, `time`, `command` et `payload`.

### `lib/cronEntry.js`

Implémente l'acteur persisté `CronEntry` (`Elf.Archetype`) et sa logique `CronEntryLogic`.

#### État et modèle de données

La structure complète est définie par `CronEntryShape` :

```javascript
class CronEntryShape {
  id = string; // Identifiant unique (ex: cronEntry@<hash>)
  meta = MetaShape; // Métadonnées de cycle de vie
  time = union(string, number); // Expression cron ou timestamp Unix (ms)
  command = string; // Commande Xcraft à exécuter
  payload = object; // Paramètres transmis à la commande
  loggingMode = enumeration('enabled', 'disabled'); // Mode de journalisation
}

class MetaShape {
  status = enumeration('published', 'trashed'); // État de l'entrée
}
```

L'état initial dans `CronEntryLogic` définit le statut `'published'` et `loggingMode` à `'enabled'` par défaut.

La base de données utilisée pour la persistance est définie par `CronEntryLogic.db = 'chronomancer'`.

#### Méthodes publiques

- **`create(id, desktopId)`** — Crée et persiste une nouvelle entrée cron. Retourne `this` pour permettre le chaînage.
- **`upsert(time, command, payload, loggingMode='enabled')`** — Met à jour les paramètres de planification et persiste les changements. Remet le statut à `'published'`.
- **`start()`** — Démarre la planification. Réutilise le `CronJob` existant si le temps n'a pas changé ; en crée un nouveau sinon. Convertit les timestamps Unix en objets `Date`.
- **`stop()`** — Arrête le `CronJob` sans modifier la persistance.
- **`fire()`** — Déclenche immédiatement l'exécution via `fireOnTick()`, indépendamment du planning.
- **`revive()`** — Restaure le statut `'published'` d'une entrée préalablement `trashed` et persiste.
- **`trash()`** — Arrête le job, marque l'entrée `'trashed'`, persiste et nettoie les références internes.
- **`running()`** — Retourne l'état d'exécution (`CronJob.running`) ou `false` si aucun job n'est actif.
- **`nextDates(count=1)`** — Délègue à `CronJob.nextDates()` pour prédire les prochaines exécutions. Retourne `[]` si aucun job n'est actif.
- **`inPast()`** — Vérifie si la date/heure planifiée est dans le passé en utilisant `sendAt()`. Retourne `true` si c'est le cas.
- **`error()`** — Retourne la dernière erreur capturée lors de l'exécution, ou `null`.
- **`delete()`** — Méthode de cycle de vie appelée lors de la suppression de l'acteur : arrête le job.
- **`dispose()`** — Méthode de nettoyage appelée lors de la fermeture de l'application : arrête le job.

#### Gestion des warnings cron

Lors de la création d'un `CronJob`, les messages commençant par `'WARNING'` (ex. date dans le passé) sont traités comme de simples avertissements (`log.warn`) plutôt que comme des erreurs fatales, permettant une distinction claire entre alertes informatives et problèmes critiques.

## Licence

Ce module est distribué sous [licence MIT](./LICENSE).

---

_Ce contenu a été généré par IA_

[xcraft-core-goblin]: https://github.com/Xcraft-Inc/xcraft-core-goblin
[xcraft-core-stones]: https://github.com/Xcraft-Inc/xcraft-core-stones
[xcraft-core-utils]: https://github.com/Xcraft-Inc/xcraft-core-utils
