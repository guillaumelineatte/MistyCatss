// Stub pour les tests Vitest : `server-only` est un garde-fou de bundler
// (Next.js l'alias différemment côté client/serveur au build). Sous Vitest,
// qui n'est pas ce bundler, le vrai package lève toujours une erreur à
// l'import — on le neutralise ici en le remplaçant par un module vide, comme
// le ferait le build serveur de Next.js.
export {}
