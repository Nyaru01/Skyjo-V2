# 🛡️ PROTOCOLE DE MAINTENANCE & RAPPELS IMPORTANTS

Ce fichier recense les règles critiques à respecter lors des interventions sur le projet Skyjo V2.

## 🤖 COEUR DU JEU (CRITIQUE)
**NE PAS TOUCHER SANS TESTS APPROFONDIS**

### 1. Logique IA (`src/utils/aiLogic.js`)
- L'algorithme de décision de l'IA (probabilités, prise de risque) est calibré finement.
- Toute modification ici peut déséquilibrer complètement le jeu.
- **Règle :** Si une modification est nécessaire, créer une branche de test spécifique et simuler au moins 50 parties.

### 2. Mouvements de Cartes (`VirtualGame.jsx` & `animUtils.js`)
- Les animations de distribution et de défausse reposent sur des timings précis (`setTimeout`, `framer-motion`).
- Ne pas modifier les délais d'animation arbitrairement.
- La synchronisation entre l'état logique (Zustand) et l'état visuel est fragile.

## 💾 PERSISTANCE & BACKEND
### 1. Synchronisation Profil (`gameStore.js`)
- La sauvegarde du profil se fait automatiquement via `syncProfileWithBackend`.
- ne pas ajouter d'appels manuels à `updateProfile` dans les composants UI, passer par le store.

### 2. Socket.io
- L'identification des joueurs repose sur `dbId` (Database ID) et non `socket.id`.
- Toujours vérifier que `userProfile.id` est passé lors des `emit` (`create_room`, `join_room`).

## 🎨 UI/UX
- **Design System :** Utiliser les classes utilitaires `glass-premium`, `text-skyjo-blue` définies dans `index.css`.
- **Sons :** Utiliser le hook `useFeedback` pour tous les sons. Ne pas instancier `Audio` directement dans les composants.

## 🚀 DÉPLOIEMENT
- Vérifier systématiquement les variables d'environnement (`.env`) avant le build.
- Clés VAPID (Push Notifications) : Doivent correspondre entre client (`VITE_VAPID_PUBLIC_KEY`) et serveur.

---
*Dernière mise à jour : 27 Janvier 2026*
