/**
 * Skyjo Game Engine
 * Contains all game logic for the virtual Skyjo card game
 */

// Card distribution according to official rules (150 cards total)
const CARD_DISTRIBUTION = {
    '-2': { count: 5, color: 'indigo' },
    '-1': { count: 10, color: 'blue' },
    '0': { count: 15, color: 'cyan' },
    '1': { count: 10, color: 'green' },
    '2': { count: 10, color: 'green' },
    '3': { count: 10, color: 'green' },
    '4': { count: 10, color: 'green' },
    '5': { count: 10, color: 'yellow' },
    '6': { count: 10, color: 'yellow' },
    '7': { count: 10, color: 'yellow' },
    '8': { count: 10, color: 'yellow' },
    '9': { count: 10, color: 'orange' },
    '10': { count: 10, color: 'orange' },
    '11': { count: 10, color: 'orange' },
    '12': { count: 10, color: 'red' },
};

// Color mappings for CSS classes
export const CARD_COLORS = {
    indigo: { bg: 'bg-indigo-600', text: 'text-white', glow: 'shadow-indigo-500/50' },
    blue: { bg: 'bg-blue-500', text: 'text-white', glow: 'shadow-blue-500/50' },
    cyan: { bg: 'bg-cyan-500', text: 'text-white', glow: 'shadow-cyan-500/50' },
    green: { bg: 'bg-emerald-500', text: 'text-white', glow: 'shadow-emerald-500/50' },
    yellow: { bg: 'bg-yellow-400', text: 'text-yellow-900', glow: 'shadow-yellow-400/50' },
    orange: { bg: 'bg-orange-500', text: 'text-white', glow: 'shadow-orange-500/50' },
    red: { bg: 'bg-red-600', text: 'text-white', glow: 'shadow-red-500/50' },
};

/**
 * Create a single card object
 */
export const createCard = (value, id) => ({
    id,
    value: parseInt(value),
    color: CARD_DISTRIBUTION[value].color,
    isRevealed: false,
});

/**
 * Create a full Skyjo deck (150 cards)
 */
export const createDeck = () => {
    const deck = [];
    let cardId = 0;

    Object.entries(CARD_DISTRIBUTION).forEach(([value, { count }]) => {
        for (let i = 0; i < count; i++) {
            deck.push(createCard(value, `card-${cardId++}`));
        }
    });

    return deck;
};

/**
 * Fisher-Yates shuffle algorithm
 */
export const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Deal cards to players (12 cards each in 3x4 grid)
 */
export const dealCards = (deck, playerCount) => {
    const shuffled = shuffleDeck(deck);
    const cardsPerPlayer = 12;
    const hands = [];
    let deckIndex = 0;

    for (let p = 0; p < playerCount; p++) {
        const hand = [];
        for (let i = 0; i < cardsPerPlayer; i++) {
            hand.push({ ...shuffled[deckIndex++] });
        }
        hands.push(hand);
    }

    // Remaining cards form the draw pile
    const drawPile = shuffled.slice(deckIndex);

    return { hands, drawPile };
};

/**
 * Initialize a new game
 */
export const initializeGame = (players) => {
    const deck = createDeck();
    const { hands, drawPile } = dealCards(deck, players.length);

    // Start discard pile with one card from draw pile
    const discardPile = [{ ...drawPile.pop(), isRevealed: true }];

    return {
        players: players.map((player, index) => ({
            ...player,
            hand: hands[index],
            hasFinished: false,
        })),
        drawPile,
        discardPile,
        currentPlayerIndex: 0,
        phase: 'INITIAL_REVEAL', // INITIAL_REVEAL, PLAYING, FINAL_ROUND, FINISHED
        turnPhase: 'DRAW', // DRAW, REPLACE_OR_DISCARD
        drawnCard: null,
        finishingPlayerIndex: null,
        roundNumber: 1,
    };
};

/**
 * Reveal initial cards (each player reveals 2 cards)
 */
export const revealInitialCards = (gameState, playerIndex, cardIndices) => {
    if (cardIndices.length !== 2) {
        throw new Error('Must reveal exactly 2 cards initially');
    }

    const newState = { ...gameState };
    newState.players = [...gameState.players];
    newState.players[playerIndex] = {
        ...gameState.players[playerIndex],
        hand: gameState.players[playerIndex].hand.map((card, i) =>
            cardIndices.includes(i) ? { ...card, isRevealed: true } : card
        ),
    };

    // Check if all players have revealed their initial cards
    const allRevealed = newState.players.every(
        p => p.hand.filter(c => c.isRevealed).length >= 2
    );

    if (allRevealed) {
        // Find player with highest sum of revealed cards to start
        let highestSum = -Infinity;
        let startingPlayer = 0;

        newState.players.forEach((player, idx) => {
            const sum = player.hand
                .filter(c => c.isRevealed)
                .reduce((acc, c) => acc + c.value, 0);
            if (sum > highestSum) {
                highestSum = sum;
                startingPlayer = idx;
            }
        });

        newState.phase = 'PLAYING';
        newState.currentPlayerIndex = startingPlayer;
    }
    // For simultaneous reveal: don't change currentPlayerIndex until all reveal
    // Each player can reveal independently

    return newState;
};

/**
 * Draw a card from the draw pile
 */
export const drawFromPile = (gameState) => {
    if (gameState.drawPile.length === 0) {
        // Shuffle discard pile (except top card) back into draw pile
        const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
        const newDrawPile = shuffleDeck(gameState.discardPile.slice(0, -1));
        return {
            ...gameState,
            drawPile: newDrawPile,
            discardPile: [topDiscard],
            drawnCard: { ...newDrawPile.pop(), isRevealed: true },
            turnPhase: 'REPLACE_OR_DISCARD',
        };
    }

    const drawnCard = { ...gameState.drawPile[gameState.drawPile.length - 1], isRevealed: true };
    return {
        ...gameState,
        drawPile: gameState.drawPile.slice(0, -1),
        drawnCard,
        turnPhase: 'REPLACE_OR_DISCARD',
    };
};

/**
 * Take the top card from discard pile
 */
export const drawFromDiscard = (gameState) => {
    if (gameState.discardPile.length === 0) {
        throw new Error('Discard pile is empty');
    }

    const drawnCard = { ...gameState.discardPile[gameState.discardPile.length - 1] };
    return {
        ...gameState,
        discardPile: gameState.discardPile.slice(0, -1),
        drawnCard,
        turnPhase: 'MUST_REPLACE', // When taking from discard, must replace a card
    };
};

/**
 * Replace a card in hand with the drawn card
 */
export const replaceCard = (gameState, cardIndex) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const replacedCard = { ...player.hand[cardIndex], isRevealed: true };
    const drawnCard = { ...gameState.drawnCard, isRevealed: true };

    const newHand = [...player.hand];
    newHand[cardIndex] = drawnCard;

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex] = {
        ...player,
        hand: newHand,
    };

    return {
        ...gameState,
        players: newPlayers,
        discardPile: [...gameState.discardPile, replacedCard],
        drawnCard: null,
        turnPhase: 'DRAW',
    };
};

/**
 * Discard the drawn card and reveal one hidden card
 */
export const discardAndReveal = (gameState, cardIndex) => {
    const player = gameState.players[gameState.currentPlayerIndex];

    if (player.hand[cardIndex].isRevealed) {
        throw new Error('Cannot reveal an already revealed card');
    }

    const newHand = player.hand.map((card, i) =>
        i === cardIndex ? { ...card, isRevealed: true } : card
    );

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentPlayerIndex] = {
        ...player,
        hand: newHand,
    };

    return {
        ...gameState,
        players: newPlayers,
        discardPile: [...gameState.discardPile, { ...gameState.drawnCard, isRevealed: true }],
        drawnCard: null,
        turnPhase: 'DRAW',
    };
};

/**
 * Check and remove completed columns (3 cards of same value)
 */
export const checkAndRemoveColumns = (gameState) => {
    const newPlayers = gameState.players.map(player => {
        const hand = [...player.hand];
        const columnsToRemove = [];

        // Check each column (0-1-2, 3-4-5, 6-7-8, 9-10-11)
        for (let col = 0; col < 4; col++) {
            const indices = [col * 3, col * 3 + 1, col * 3 + 2];
            const cards = indices.map(i => hand[i]);

            if (
                cards.every(c => c && c.isRevealed) &&
                cards[0].value === cards[1].value &&
                cards[1].value === cards[2].value
            ) {
                columnsToRemove.push(...indices);
            }
        }

        if (columnsToRemove.length > 0) {
            const newHand = hand.map((card, i) =>
                columnsToRemove.includes(i) ? null : card
            );
            return { ...player, hand: newHand };
        }

        return player;
    });

    return { ...gameState, players: newPlayers };
};

/**
 * End current player's turn and move to next
 */
export const endTurn = (gameState) => {
    let newState = checkAndRemoveColumns(gameState);

    // Check if current player has revealed all cards
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    const allRevealed = currentPlayer.hand.every(c => c === null || c.isRevealed);

    if (allRevealed && newState.phase === 'PLAYING') {
        newState = {
            ...newState,
            phase: 'FINAL_ROUND',
            finishingPlayerIndex: newState.currentPlayerIndex,
        };
    }

    // Move to next player
    let nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;

    // Check if game is finished (back to finishing player)
    if (newState.phase === 'FINAL_ROUND' && nextPlayerIndex === newState.finishingPlayerIndex) {
        return {
            ...newState,
            phase: 'FINISHED',
        };
    }

    return {
        ...newState,
        currentPlayerIndex: nextPlayerIndex,
        turnPhase: 'DRAW',
    };
};

/**
 * Calculate score for a player's hand
 */
export const calculateHandScore = (hand) => {
    return hand.reduce((sum, card) => {
        if (card === null) return sum;
        return sum + card.value;
    }, 0);
};

/**
 * Calculate final scores and determine winner
 */
export const calculateFinalScores = (gameState) => {
    const scores = gameState.players.map((player, index) => {
        let score = calculateHandScore(player.hand);

        // Penalty: if finisher doesn't have lowest score, double their score
        if (index === gameState.finishingPlayerIndex) {
            const otherScores = gameState.players
                .filter((_, i) => i !== index)
                .map(p => calculateHandScore(p.hand));
            const lowestOther = Math.min(...otherScores);

            // Official rule: penalty only applies to POSITIVE scores
            if (score >= lowestOther && score > 0) {
                score *= 2;
            }
        }

        return {
            playerId: player.id,
            playerName: player.name,
            rawScore: calculateHandScore(player.hand),
            finalScore: score,
            isFinisher: index === gameState.finishingPlayerIndex,
            penalized: index === gameState.finishingPlayerIndex && score !== calculateHandScore(player.hand),
        };
    });

    return scores.sort((a, b) => a.finalScore - b.finalScore);
};

/**
 * Get valid actions for current game state
 */
export const getValidActions = (gameState) => {
    if (gameState.phase === 'INITIAL_REVEAL') {
        return { type: 'REVEAL_INITIAL', description: 'Révélez 2 cartes' };
    }

    if (gameState.phase === 'FINISHED') {
        return { type: 'GAME_OVER', description: 'Partie terminée' };
    }

    if (gameState.turnPhase === 'DRAW') {
        return {
            type: 'DRAW',
            description: 'Piochez une carte',
            options: ['DRAW_PILE', 'DISCARD_PILE'],
        };
    }

    if (gameState.turnPhase === 'MUST_REPLACE') {
        return {
            type: 'MUST_REPLACE',
            description: 'Remplacez une carte de votre main',
        };
    }

    if (gameState.turnPhase === 'REPLACE_OR_DISCARD') {
        return {
            type: 'REPLACE_OR_DISCARD',
            description: 'Remplacez une carte ou défaussez et retournez',
            options: ['REPLACE', 'DISCARD_AND_REVEAL'],
        };
    }

    return null;
};
