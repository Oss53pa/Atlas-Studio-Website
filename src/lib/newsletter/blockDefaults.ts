import { nanoid } from 'nanoid'
import type { BlockType, EmailBlock } from '../../types/newsletter'

export function createDefaultBlock(type: BlockType, accentColor = '#EF9F27'): EmailBlock {
  const id = nanoid(8)
  const defaults: Record<BlockType, EmailBlock> = {
    header: { type: 'header', id, props: { title: 'Titre de votre email', subtitle: 'Sous-titre', bg: '#0A0A0A', titleColor: accentColor, subtitleColor: '#888888' } },
    text: { type: 'text', id, props: { content: 'Bonjour {{prénom}},\n\nVotre texte ici.', fontSize: 14, color: '#333333', align: 'left', padding: '20px 32px' } },
    image: { type: 'image', id, props: { src: '', alt: '', width: '100%', align: 'center', borderRadius: 8 } },
    button: { type: 'button', id, props: { text: 'Accéder à mon espace →', url: 'https://app.atlasstudio.africa', color: accentColor, textColor: '#000000', align: 'center', borderRadius: 8, padding: '12px 32px', fullWidth: false } },
    divider: { type: 'divider', id, props: { color: '#EEEEEE', thickness: 1, style: 'solid', margin: '10px 32px' } },
    cols2: { type: 'cols2', id, props: { left: { title: 'Fonctionnalité A', text: 'Description de la nouveauté.', iconEmoji: '✨' }, right: { title: 'Fonctionnalité B', text: 'Description de la nouveauté.', iconEmoji: '🚀' }, bg: '#F9F9F9', gap: 16 } },
    featured: { type: 'featured', id, props: { badge: 'NOUVEAU', title: 'Nom du produit', subtitle: 'Description courte', ctaText: 'Découvrir →', ctaUrl: '', bg: '#0A0A0A', accentColor } },
    footer: { type: 'footer', id, props: { companyName: 'Atlas Studio', address: 'Abidjan, Côte d\'Ivoire', unsubscribeText: 'Se désabonner', color: '#999999', showSocial: false, socialLinks: [] } },
  }
  return defaults[type]
}

export const BLOCK_LABELS: Record<BlockType, { label: string; icon: string }> = {
  header: { label: 'En-tête', icon: 'LayoutTemplate' },
  text: { label: 'Texte', icon: 'Type' },
  image: { label: 'Image', icon: 'Image' },
  button: { label: 'Bouton', icon: 'MousePointerClick' },
  divider: { label: 'Séparateur', icon: 'Minus' },
  cols2: { label: '2 colonnes', icon: 'Columns2' },
  featured: { label: 'Mise en avant', icon: 'Star' },
  footer: { label: 'Pied de page', icon: 'PanelBottom' },
}
