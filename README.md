# 📘 Documentation du module goblin-chronomancer

## Aperçu

Le module `goblin-chronomancer` est un gestionnaire de tâches planifiées (cron jobs) pour l'écosystème Xcraft. Il permet de créer, gérer et exécuter des tâches récurrentes selon des expressions cron ou des timestamps spécifiques. Ce module fournit une abstraction élégante pour la planification de commandes Xcraft à exécuter à des moments précis.

## Structure du module

Le module est composé de deux acteurs principaux :

1. **Chronomancer** - Un acteur singleton qui gère l'ensemble des entrées cron
2. **CronEntry** - Un acteur qui représente une tâche planifiée individuelle

Ces acteurs sont implémentés selon le modèle Elf du framework Xcraft, avec une séparation claire entre la logique métier et l'état.

## Fonctionnement global

Le `Chronomancer` agit comme un orchestrateur central pour toutes les tâches planifiées. Lors de son initialisation, il charge toutes les entrées cron existantes depuis la base de données et les démarre. Chaque entrée cron est représentée par un acteur `CronEntry` qui encapsule les détails de la tâche planifiée, comme l'expression cron, la commande à exécuter et les données associées.

Les tâches planifiées peuvent être définies avec :
- Une expression cron standard (par exemple, `* * * * *` pour exécuter chaque minute)
- Un timestamp Unix pour une exécution à un moment précis

Lorsqu'une tâche est déclenchée selon sa planification, le `CronEntry` correspondant exécute la commande Xcraft spécifiée avec les données fournies. Le module gère également les erreurs d'exécution et peut fournir des informations sur l'état d'exécution des tâches.

Le système prend en charge plusieurs opérations de gestion des tâches :
- Création et mise à jour de tâches
- Démarrage et arrêt de tâches
- Suppression de tâches
- Vérification de l'état d'exécution
- Prédiction des prochaines dates d'exécution

## Exemples d'utilisation

### Création d'une tâche planifiée

```javascript
const {Chronomancer} = require('goblin-chronomancer/lib/chronomancer.js');

// Dans une méthode d'un acteur Elf
async createCronTask() {
  // Obtenir l'instance du Chronomancer
  const chronomancer = new Chronomancer(this);

  // Créer une tâche qui s'exécute toutes les 5 minutes
  await chronomancer.upsert(
    'task-name',           // Nom unique de la tâche
    '*/5 * * * *',         // Expression cron (toutes les 5 minutes)
    'my-command',          // Commande Xcraft à exécuter
    { param1: 'value1' },  // Paramètres à passer à la commande
    'enabled'              // Mode de journalisation
  );
}
```

### Démarrage et arrêt d'une tâche

```javascript
const {Chronomancer} = require('goblin-chronomancer/lib/chronomancer.js');

// Dans une méthode d'un acteur Elf
async workWithTheCron() {
  // Obtenir l'instance du Chronomancer
  const chronomancer = new Chronomancer(this);

  // Démarrer une tâche
  await chronomancer.start('task-name');

  // Arrêter une tâche
  await chronomancer.stop('task-name');

  // Redémarrer une tâche (avec exécution immédiate optionnelle)
  await chronomancer.restart('task-name', true);
}
```

### Vérification de l'état et des prochaines exécutions

```javascript
const {Chronomancer} = require('goblin-chronomancer/lib/chronomancer.js');

// Dans une méthode d'un acteur Elf
async checkCronStatus() {
  // Obtenir l'instance du Chronomancer
  const chronomancer = new Chronomancer(this);

  // Vérifier si une tâche est en cours d'exécution
  const isRunning = await chronomancer.running('task-name');

  // Obtenir les 3 prochaines dates d'exécution
  const nextDates = await chronomancer.nextDates('task-name', 3);
}
```

### Suppression d'une tâche

```javascript
const {Chronomancer} = require('goblin-chronomancer/lib/chronomancer.js');

// Dans une méthode d'un acteur Elf
async removeTheCron() {
  // Obtenir l'instance du Chronomancer
  const chronomancer = new Chronomancer(this);

  // Supprimer une tâche
  await chronomancer.remove('task-name');
}
```

### Recherche de tâches par motif

```javascript
const {Chronomancer} = require('goblin-chronomancer/lib/chronomancer.js');

// Dans une méthode d'un acteur Elf
async listCron() {
  // Obtenir l'instance du Chronomancer
  const chronomancer = new Chronomancer(this);
  
  // Obtenir toutes les tâches dont le nom commence par "backup-"
  const backupTasks = await chronomancer.getAllEntriesLike('backup-');
}
```

## Interactions avec d'autres modules

Le module `goblin-chronomancer` interagit principalement avec :

- **xcraft-core-goblin** : Utilise le modèle d'acteur Elf pour la gestion des tâches
- **xcraft-core-stones** : Utilise les types pour définir la structure des données
- **cron** : Bibliothèque sous-jacente pour la planification des tâches

Le module peut exécuter n'importe quelle commande Xcraft, ce qui lui permet d'interagir indirectement avec tous les autres modules du système.

## Détails des sources

### `chronomancer.js`

Ce fichier exporte l'acteur singleton `Chronomancer` qui sert de point d'entrée principal pour la gestion des tâches planifiées. Il expose des méthodes pour créer, démarrer, arrêter et gérer les entrées cron.

L'acteur `Chronomancer` est implémenté comme un `Elf.Alone`, ce qui signifie qu'il s'agit d'un singleton dans le système. Il gère un ensemble d'acteurs `CronEntry` qui représentent les tâches individuelles.

### `cronEntry.js`

Ce fichier définit l'acteur `CronEntry` qui représente une tâche planifiée individuelle. Chaque entrée cron contient :

- Un identifiant unique
- Une expression cron ou un timestamp
- Une commande Xcraft à exécuter
- Des données à passer à la commande
- Un mode de journalisation

L'acteur `CronEntry` est implémenté comme un `Elf.Archetype`, ce qui signifie que son état est persisté dans la base de données. Il utilise la bibliothèque `cron` pour planifier l'exécution des tâches.

### `lib/chronomancer.js`

Ce fichier contient l'implémentation détaillée de l'acteur `Chronomancer`. Il définit :

- `ChronomancerShape` : La structure des données de l'acteur
- `ChronomancerState` : L'état de l'acteur basé sur la forme
- `ChronomancerLogic` : La logique métier de l'acteur
- `Chronomancer` : La classe d'acteur qui expose les méthodes publiques

L'acteur `Chronomancer` initialise toutes les entrées cron existantes au démarrage et fournit des méthodes pour gérer les tâches planifiées.

### `lib/cronEntry.js`

Ce fichier contient l'implémentation détaillée de l'acteur `CronEntry`. Il définit :

- `MetaShape` : La structure des métadonnées de l'entrée cron
- `CronEntryShape` : La structure des données de l'entrée cron
- `CronEntryState` : L'état de l'entrée cron basé sur la forme
- `CronEntryLogic` : La logique métier de l'entrée cron
- `CronEntry` : La classe d'acteur qui gère l'exécution des tâches planifiées

L'acteur `CronEntry` gère le cycle de vie d'une tâche planifiée, y compris son démarrage, son arrêt, son exécution et sa suppression. Il utilise la bibliothèque `cron` pour planifier l'exécution des tâches et gère les erreurs d'exécution.

Le système de journalisation intégré permet de suivre l'exécution des tâches, avec la possibilité de désactiver la journalisation pour les tâches fréquentes ou peu importantes.

*Ce document est une mise à jour de la documentation précédente.*