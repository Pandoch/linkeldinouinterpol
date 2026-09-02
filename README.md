# LINKEDIN // INTERPOL — Classification Protocol

Jeu web futuriste **"LinkedIn ou Interpol"**.

Déterminez si le sujet affiché est un professionnel (LinkedIn) ou un fugitif recherché (Interpol).

## ✨ Fonctionnalités

- **Mode Solo** : score, streak, meilleurs scores sauvegardés localement
- **Mode Multijoueur** : salles privées en temps réel via **PeerJS (P2P)**
  - 100 % compatible **GitHub Pages** (aucun serveur backend à héberger)
  - Jusqu’à plusieurs agents dans la même salle
  - L’hôte lance les rounds, tout le monde vote, scores synchronisés
- **Images toujours différentes** : photos générées via l’API randomuser.me
- Design **cyber / Interpol** : scanlines, néons cyan/rouge, effets holographiques
- Sons optionnels, responsive, raccourcis clavier (1 / L = LinkedIn, 2 / I = Interpol)

## 🚀 Déploiement sur GitHub Pages

1. Crée un nouveau repository GitHub
2. Upload tous les fichiers de ce dossier (`index.html`, `styles.css`, `app.js`, `README.md`)
3. Va dans **Settings → Pages**
4. Source : Deploy from branch `main` (ou `master`), dossier `/ (root)`
5. Ton site sera dispo sur `https://TON-USERNAME.github.io/NOM-DU-REPO/`

C’est tout. Aucune configuration supplémentaire.

## 🎮 Comment jouer

### Solo
1. Clique sur **SOLO**
2. Observe le sujet
3. Clique **LINKEDIN** ou **INTERPOL**
4. Voir le résultat et passe au suivant

### Multijoueur
1. **Hôte** : clique MULTI → entre ton nom → **CRÉER SALLE**
2. Copie le **code complet** affiché (bouton ⧉)
3. Partage le code aux autres joueurs
4. **Autres** : MULTI → entre ton nom + colle le code → **REJOINDRE**
5. L’hôte clique **LANCER LA MISSION**
6. Tout le monde classifie le même sujet → résultats + scores en live

## 🛠 Stack technique

- HTML / CSS / Vanilla JS (aucune dépendance de build)
- [PeerJS](https://peerjs.com/) pour le multijoueur P2P (WebRTC)
- [randomuser.me](https://randomuser.me/) pour les photos & identités aléatoires
- LocalStorage pour les high scores

## 📁 Structure

```
linkedin-or-interpol/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Licence

MIT — libre d’utilisation et de modification.
