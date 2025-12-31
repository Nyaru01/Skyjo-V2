export const AVATARS = [
    { id: 'cat', name: 'Chat', emoji: '🐱', path: '/avatars/cat.png?v=2' },
    { id: 'dog', name: 'Chien', emoji: '🐶', path: '/avatars/dog.png?v=2' },
    { id: 'fox', name: 'Renard', emoji: '🦊', path: '/avatars/fox.png?v=2' },
    { id: 'bear', name: 'Ours', emoji: '🐻', path: '/avatars/bear.png?v=2' },
    { id: 'panda', name: 'Panda', emoji: '🐼', path: '/avatars/panda.png?v=2' },
    { id: 'lion', name: 'Lion', emoji: '🦁', path: '/avatars/lion.png?v=2' },
    { id: 'frog', name: 'Grenouille', emoji: '🐸', path: '/avatars/frog.png?v=2' },
    { id: 'monkey', name: 'Singe', emoji: '🐵', path: '/avatars/monkey.png?v=2' },
];

export const getAvatarPath = (id) => {
    const avatar = AVATARS.find(a => a.id === id);
    return avatar ? avatar.path : null;
};
