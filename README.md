# 📘 Documentation du module goblin-chronomancer

## Aperçu

Le module `goblin-chronomancer` est un gestionnaire de tâches planifiées (cron jobs) pour l'écosystème Xcraft. Il permet de créer, gérer et exécuter des tâches récurrentes selon des expressions cron ou des timestamps spécifiques. Ce module fournit une abstraction élégante pour la planification de commandes Xcraft à exécuter à des moments précis.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module est composé de deux acteurs principaux :

1. **Chronomancer** - Un acteur singleton (`Elf.Alone`) qui gère l'ensemble des entrées cron
2. **CronEntry** - Un acteur persisté (`Elf.Archetype`) qui représente une tâche planifiée individuelle

Ces acteurs sont implémentés selon le modèle Elf du framework Xcraft, avec une séparation claire entre la logique métier (`Logic`) et l'état (`State`).

## Fonctionnement global

Le `Chronomancer` agit comme un orchestrateur central pour toutes les tâches planifiées. Lors de son initialisation, il charge toutes les entrées cron existantes depuis la base de données `chronomancer` et les démarre automatiquement. Chaque entrée cron est représentée par un acteur `CronEntry` qui encapsule les détails de la tâche planifiée.

### Cycle de vie des tâches

1. **Création** : Une tâche est créée via `upsert()` avec ses paramètres de planification
2. **Démarrage** : La tâche est démarrée et planifiée selon son expression cron
3. **Exécution** : À chaque déclenchement, la commande Xcraft spécifiée est exécutée
4. **Gestion des erreurs** : Les erreurs sont capturées et journalisées
5. **Arrêt/Suppression** : La tâche peut être arrêtée temporairement ou supprimée définitivement

### Mécanisme d'exécution

Chaque `CronEntry` utilise la bibliothèque `cron` pour gérer la planification. Lors de l'exécution :

- Vérification qu'aucune instance de la tâche n'est déjà en cours
- Exécution de la commande Xcraft avec les paramètres fournis
- Journalisation du début, de la fin et de la durée d'exécution
- Gestion des erreurs avec capture et logging

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
    {
      type: 'full',
      destination: '/backup/daily'
    },
    'enabled'
  );
}
```

### Planification d'une tâche à un moment précis

```javascript
// Dans une méthode d'un acteur Elf
async scheduleMaintenanceWindow() {
  const chronomancer = new Chronomancer(this);

  // Maintenance programmée le 1er janvier 2025 à minuit
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
// Dans une méthode d'un acteur Elf
async manageCronTasks() {
  const chronomancer = new Chronomancer(this);

  // Vérifier l'état d'une tâche
  const isRunning = await chronomancer.running('daily-backup');

  if (!isRunning) {
    // Redémarrer avec exécution immédiate
    await chronomancer.restart('daily-backup', true);
  }

  // Obtenir les 5 prochaines exécutions
  const nextRuns = await chronomancer.nextDates('daily-backup', 5);
  console.log('Prochaines exécutions:', nextRuns);

  // Lister toutes les tâches de backup
  const backupTasks = await chronomancer.getAllEntriesLike('backup-');
}
```

## Interactions avec d'autres modules

Le module `goblin-chronomancer` interagit avec :

- **[xcraft-core-goblin]** : Utilise le modèle d'acteur Elf pour la gestion des tâches
- **[xcraft-core-stones]** : Utilise les types pour définir la structure des données
- **[xcraft-core-utils]** : Utilitaires du framework Xcraft
- **cron** : Bibliothèque externe pour la planification des tâches

Le module peut exécuter n'importe quelle commande Xcraft via `this.quest.cmd()`, lui permettant d'interagir avec tous les autres modules du système.

### Variables d'environnement

Aucune variable d'environnement spécifique n'est utilisée par ce module.

## Détails des sources

### `chronomancer.js`

Point d'entrée principal qui exporte les commandes Xcraft pour l'acteur `Chronomancer` via `Elf.birth()`.

### `cronEntry.js`

Point d'entrée pour l'acteur `CronEntry` qui exporte ses commandes Xcraft via `Elf.birth()`.

### `lib/chronomancer.js`

#### État et modèle de données

L'acteur `Chronomancer` a un état minimal défini par `ChronomancerShape` :

```javascript
class ChronomancerShape {
  id = string; // Toujours 'chronomancer'
}
```

#### Méthodes publiques

- **`init()`** — Initialise le Chronomancer en chargeant et démarrant toutes les entrées cron existantes depuis la base de données.
- **`upsert(name, cronTime, command, payload, loggingMode='enabled')`** — Crée ou met à jour une entrée cron. Le paramètre `cronTime` peut être une expression cron (string) ou un timestamp Unix (number).
- **`remove(name)`** — Supprime définitivement une entrée cron en la marquant comme "trashed".
- **`start(name)`** — Démarre l'exécution planifiée d'une entrée cron spécifique.
- **`stop(name)`** — Arrête temporairement l'exécution d'une entrée cron.
- **`restart(name, asap=false)`** — Redémarre une entrée cron. Si `asap` est `true`, déclenche une exécution immédiate.
- **`running(name)`** — Retourne `true` si l'entrée cron est actuellement en cours d'exécution.
- **`nextDates(name, count=1)`** — Retourne un tableau des prochaines dates d'exécution planifiées.
- **`getAllEntriesLike(name)`** — Recherche toutes les entrées cron dont l'ID commence par le motif spécifié.

### `lib/cronEntry.js`

#### État et modèle de données

La structure de l'état d'une entrée cron est définie par `CronEntryShape` :

```javascript
class CronEntryShape {
  id = string; // Identifiant unique
  meta = MetaShape; // Métadonnées (status: 'published'|'trashed')
  time = union(string, number); // Expression cron ou timestamp Unix
  command = string; // Commande Xcraft à exécuter
  payload = object; // Paramètres pour la commande
  loggingMode = enumeration('enabled', 'disabled'); // Mode de journalisation
}
```

La classe `MetaShape` définit les métadonnées de l'entrée :

```javascript
class MetaShape {
  status = enumeration('published', 'trashed'); // État de publication
}
```

#### Méthodes publiques

- **`create(id, desktopId)`** — Crée une nouvelle entrée cron avec l'ID spécifié et la persiste en base.
- **`upsert(time, command, payload, loggingMode='enabled')`** — Met à jour les paramètres de planification et de commande de l'entrée cron.
- **`start()`** — Démarre la planification en créant un `CronJob`. Gère la réutilisation des jobs existants si les paramètres n'ont pas changé.
- **`stop()`** — Arrête l'exécution planifiée sans supprimer l'entrée.
- **`fire()`** — Déclenche immédiatement l'exécution de la tâche via `fireOnTick()`.
- **`revive()`** — Restaure une entrée précédemment marquée comme "trashed".
- **`trash()`** — Marque l'entrée comme supprimée et arrête son exécution.
- **`running()`** — Retourne l'état d'exécution du job cron sous-jacent.
- **`nextDates(count=1)`** — Utilise la méthode `nextDates()` du `CronJob` pour prédire les prochaines exécutions.
- **`error()`** — Retourne la dernière erreur capturée lors de l'exécution.
- **`delete()`** — Méthode de cycle de vie qui arrête le job lors de la suppression de l'acteur.
- **`dispose()`** — Méthode de nettoyage qui arrête le job lors de la fermeture de l'application.

#### Mécanisme d'exécution privé

La méthode privée `_job()` gère l'exécution effective des tâches :

- Prévention des exécutions concurrentes avec le flag `_running`
- Mesure du temps d'exécution avec `hrtime.bigint()`
- Journalisation conditionnelle selon `loggingMode`
- Capture et logging des erreurs via `this.quest.logCommandError()`

#### Gestion de la persistance

L'acteur utilise la base de données `chronomancer` (définie dans `CronEntryLogic.db`) pour persister son état. Les opérations de création, mise à jour et suppression sont automatiquement sauvegardées via `await this.persist()`.

#### Gestion des erreurs et warnings

Le module gère spécifiquement les warnings de la bibliothèque `cron` en les loggant comme des avertissements plutôt que des erreurs, permettant une meilleure distinction entre les problèmes critiques et les alertes informatives.

_Cette documentation a été mise à jour automatiquement._

[xcraft-core-goblin]: https://github.com/Xcraft-Inc/xcraft-core-goblin
[xcraft-core-stones]: https://github.com/Xcraft-Inc/xcraft-core-stones
[xcraft-core-utils]: https://github.com/Xcraft-Inc/xcraft-core-utils