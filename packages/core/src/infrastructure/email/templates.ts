import type { EmailTemplate } from './index.ts';

export interface RenderedEmail {
  subject: string;
  text: string;
}

/**
 * Contenu français des emails transactionnels, rendu par le CORE : le payload
 * webhook part avec l'email déjà rédigé (sujet + texte), pour qu'un récepteur
 * puisse se contenter de le transférer tel quel à son fournisseur — ou
 * l'ignorer et composer le sien à partir des `variables`.
 */
export function renderEmail(
  template: EmailTemplate,
  variables: Record<string, string>,
): RenderedEmail {
  switch (template) {
    case 'invitation':
      return {
        subject: "Invitation à rejoindre l'espace d'administration",
        text: [
          'Bonjour,',
          '',
          "Vous avez été invité·e à rejoindre l'espace d'administration de votre collectivité.",
          'Pour créer votre compte, suivez ce lien (valable 7 jours) :',
          '',
          variables.url ?? '',
          '',
          "Si vous n'êtes pas à l'origine de cette invitation, ignorez simplement ce message.",
        ].join('\n'),
      };
    case 'password-reset':
      return {
        subject: 'Réinitialisation de votre mot de passe',
        text: [
          'Bonjour,',
          '',
          'Une réinitialisation du mot de passe de votre compte a été demandée.',
          'Pour choisir un nouveau mot de passe, suivez ce lien (valable 7 jours) :',
          '',
          variables.url ?? '',
          '',
          "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe reste inchangé.",
        ].join('\n'),
      };
  }
}
