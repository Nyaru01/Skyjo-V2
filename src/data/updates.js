export const UPDATES = [
    {
        id: 0,
        version: "2.1.0",
        date: "27 Janv. 2026",
        title: "Stats & UI Premium",
        description: "Finalisation du design Glassmorphism et refonte complète des statistiques.",
        isNew: true,
        type: "minor",
        changes: [
            { text: "Nouvelle page Stats avec Podium interactif", type: "feat" },
            { text: "Graphiques d'évolution des scores & victoires", type: "feat" },
            { text: "Historique des parties unifié (Hero Header)", type: "improve" },
            { text: "Popup de mise à jour style Premium", type: "improve" },
            { text: "Correction de crashs sur les stats vides", type: "fix" }
        ],
        image: "/premium-bg.jpg"
    },
    {
        id: 1,
        version: "2.0.0",
        date: "27 Janv. 2026",
        title: "Skyjo V2 : La Révolution Sociale",
        description: "Une refonte complète de l'expérience avec de nouvelles fonctionnalités sociales et un design premium.",
        isNew: false,
        type: "major",
        changes: [
            { text: "Système d'amis et recherche par VibeID", type: "feat" },
            { text: "Profils personnalisables avec avatars", type: "feat" },
            { text: "Classements mondiaux et entre amis", type: "feat" },
            { text: "Notifications push pour les invitations", type: "feat" },
            { text: "Nouveau mode 'En Ligne' ultra-stable avec PostgreSQL", type: "feat" },
            { text: "Refonte complète de l'écran d'accueil (Dashboard)", type: "improve" },
            { text: "Nouvelle barre de navigation flottante style iOS", type: "improve" },
            { text: "Page de réglages repensée avec nouveaux switchs", type: "improve" },
            { text: "Interface 'Glassmorphism' modernisée", type: "improve" },
            { text: "Ambiance sonore immersive & retours haptiques", type: "improve" },
            { text: "Tutoriel interactif corrigé et amélioré", type: "feat" }
        ],
        image: "/premium-bg.jpg"
    },
    {
        id: 2,
        version: "1.1.0",
        date: "15 Janv. 2025",
        title: "IA Améliorée",
        description: "L'IA prend désormais des décisions plus intelligentes basées sur les probabilités.",
        type: "improvement",
        changes: [
            { text: "Algorithme de l'IA optimisé", type: "improve" },
            { text: "Meilleure gestion de la défausse", type: "improve" },
            { text: "Corrections de bugs mineurs", type: "fix" }
        ]
    }
];
