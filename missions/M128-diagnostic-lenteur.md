Mission : diagnostiquer pourquoi l'application est lente entre un clic et l'affichage de la page. DIAGNOSTIC UNIQUEMENT : tu ne modifies aucun fichier, tu ne crées pas de branche, tu ne déploies rien. Tu me rends un rapport et tu attends mon accord écrit avant toute correction.

À vérifier, dans cet ordre :

1\. Régions : région des fonctions Vercel (vercel.json et réglage du projet) contre région du projet Supabase. Si elles sont différentes, indique l'écart et le nombre d'allers-retours base de données par page (chaque aller-retour paie la latence entre les deux régions).

2\. Base de données : paramètre connection\_limit ou pooler dans l'URL de connexion (pgbouncer / port 6543 ?). Une limite à 1 connexion met toutes les requêtes en file d'attente.

3\. Pages lentes : pour chaque page principale (liste des dossiers, fiche d'un dossier, préparation, live), liste les requêtes Supabase ou Prisma, dis si elles s'exécutent l'une après l'autre (cascade) alors qu'elles pourraient partir en parallèle (Promise.all), et si certaines ramènent bien plus de colonnes ou de lignes que l'écran n'en affiche (select \*, absence de pagination).

4\. Appels externes pendant le chargement d'une page : lecture d'annonces, scraping, appels à une IA, import PDF, images. Dis lesquels bloquent l'affichage alors qu'ils pourraient passer en arrière-plan ou derrière un indicateur de chargement.

5\. Rafraîchissements automatiques (setInterval, polling, abonnements temps réel) qui occupent la base en continu.

6\. Retour visuel : y a-t-il des fichiers loading.tsx ou des squelettes pendant le chargement ? Sans eux, l'utilisateur voit l'ancienne page figée jusqu'à la fin du chargement.

7\. Poids du navigateur : taille des bundles (next build), grosses bibliothèques chargées sur toutes les pages, images non optimisées.

8\. Authentification : un middleware ou un appel de session qui interroge la base à chaque requête.

Rendu attendu : un tableau « cause probable / preuve (fichier et ligne) / gain estimé / effort / risque », classé par rapport gain/effort, puis ta proposition de lots dans l'ordre. Ne propose rien que tu ne puisses pas relier à une ligne de code ou à un chiffre.  
