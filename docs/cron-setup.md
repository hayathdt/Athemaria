# Configuration de la tâche Cron pour la purge automatique

## Installation des dépendances

Avant de configurer la tâche cron, assurez-vous d'installer les dépendances :

```bash
npm install
```

## Configuration de la tâche Cron

### 1. Ouvrir le crontab

```bash
crontab -e
```

### 2. Ajouter la tâche de purge quotidienne

Ajoutez cette ligne pour exécuter la purge tous les jours à minuit :

```bash
0 0 * * * cd /chemin/vers/votre/projet && npm run purge-stories
```

Remplacez `/chemin/vers/votre/projet` par le chemin absolu vers votre projet.

### 3. Vérifier la configuration

Pour vérifier que la tâche cron est bien configurée :

```bash
crontab -l
```

## Test manuel

Pour tester le script de purge manuellement :

```bash
npm run purge-stories
```

## Logs

Pour surveiller l'exécution de la tâche cron, vous pouvez rediriger les logs :

```bash
0 0 * * * cd /chemin/vers/votre/projet && npm run purge-stories >> /var/log/purge-stories.log 2>&1
```

## Fréquences alternatives

- **Toutes les heures** : `0 * * * *`
- **Tous les dimanche à 2h** : `0 2 * * 0`
- **Tous les premiers du mois** : `0 0 1 * *`

## Variables d'environnement

Assurez-vous que les variables d'environnement Firebase sont disponibles lors de l'exécution du cron. Vous pouvez les charger explicitement :

```bash
0 0 * * * cd /chemin/vers/votre/projet && source .env.local && npm run purge-stories