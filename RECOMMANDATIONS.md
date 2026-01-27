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


Toujours mettre à jour le patchnote dans les règlages 
---
*Dernière mise à jour : 27 Janvier 2026*


Recommande PWA :


1. Empêcher le geste "tirer pour rafraîchir".
Vous devez vous assurer que votre appli se rafraîchit automatiquement ou met à jour le contenu à l'intérieur ; ou vous devez fournir un bouton dans l'interface utilisateur pour rafraîchir la page, car sur les téléphones, ce geste est le seul moyen pour l'utilisateur de rafraîchir la page.

Pour empêcher ce geste, vous devez définir le style racine overscroll-behavior-y sur none, ou sur contain

:root {
    overscroll-behavior-y: none;
}
Merci à la personne dans les commentaires d'avoir suggéré cette solution au lieu de JS

2. Supprimer -webkit-tap-highlight-color
Lorsque l'utilisateur appuie sur un bouton et des éléments similaires, le navigateur mobile met cet élément en surbrillance. Ça casse l'immersion. Pour empêcher ce comportement, vous devez ajouter ce style

button, a, label, input {
    -webkit-tap-highlight-color: transparent;
}
3. Empêcher le menu contextuel par défaut
C'est énervant quand un utilisateur maintient son doigt sur une zone aléatoire de votre appli, et que le navigateur suggère de télécharger ou d'imprimer la page. Pour empêcher cela, vous devez exécuter event.preventDefault() sur tous les éléments où ce n'est pas censé être, mais l'autoriser uniquement sur les images, les vidéos, le texte sélectionné, etc.

function isInsidePWA() {
    return window.matchMedia('(display-mode: standalone)').matches;
}

document.addEventListener('contextmenu', (e) => {
    if (!isInsidePWA()) {
        return;
    }
    if (e.shiftKey) {
        return;
    }
    if (e.target.matches('a, img, video, audio, '
                        + 'textarea:not([disabled]), '
                        + 'input[type="text"]:not([disabled]), '
                        + 'div.cm-content[contenteditable="true"] *'
    )) {
        return;
    }
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (selectedText.length > 0) {
        return;
    }
    e.preventDefault();
});
Ce code autorise le menu contextuel par défaut sur les liens, les images, les vidéos, l'audio, les zones de texte et sur le texte sélectionné. Je pense que sur une page web normale, cette restriction est très peu conviviale et hostile pour l'utilisateur, donc je ne recommande pas de le faire en dehors de PWA. J'autorise également les utilisateurs PC à ouvrir le menu contextuel par défaut en maintenant la touche Maj enfoncée

Vous pouvez aller plus loin et ajouter votre propre menu contextuel pour les images, les vidéos, le texte, etc.

4. Empêcher la sélection sur la plupart des zones
C'est similaire au menu contextuel - c'est énervant quand vous pouvez accidentellement sélectionner des onglets, des cases à cocher, etc., des images, etc. Pour empêcher cela, vous devez utiliser le style user-select: none;

body.pwa {
    user-select: none;
    -webkit-user-select: none;
    .allow-pwa-select, .allow-pwa-select * {
        user-select: text;
        -webkit-user-select: text;
    }
}
Sur une page normale, ce comportement est également perçu comme hostile, donc je recommande de l'activer uniquement pour PWA. À cette fin, j'ajoute la classe "pwa" au body lors du chargement de l'interface utilisateur

...
if (isInsidePWA()) {
    document.body.classList.add("pwa");
}
...
J'autorise la sélection en utilisant la classe allow-pwa-select sur des éléments comme les messages d'erreur et les tableaux. De plus, user-select n'a pas d'effet sur les zones de texte, donc nous n'avons pas à nous soucier de les exclure - l'utilisateur pourra sélectionner le texte qu'il vient d'entrer