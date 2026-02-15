# Atlas Studio Website

Site web professionnel pour Atlas Studio - startup technologique specialisee dans le developpement d'applications Web et Mobile pour le marche africain.

## Structure du Projet

```
atlas-studio-website/
├── front/              # Frontend Next.js 14
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/          # Composants UI (Button, Card, Badge, Input)
│   │   │   ├── layout/      # Composants layout (Navbar, Footer, Container)
│   │   │   └── sections/    # Sections de la page (Hero, Products, etc.)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   └── utils.ts
│   └── public/
│       ├── images/
│       └── documents/
│           └── pitch-deck.pdf    # A ajouter
│
└── back/               # Backend Express.js
    └── src/
        └── index.ts
```

## Stack Technique

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Langage:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** Google Fonts (Inter + Playfair Display)

### Backend
- **Framework:** Express.js
- **Langage:** TypeScript
- **Email:** Nodemailer

## Installation

### Frontend

```bash
cd front
npm install
```

### Backend

```bash
cd back
npm install
```

## Configuration

### Backend (.env)

Copier `.env.example` vers `.env` et configurer les variables:

```env
PORT=5000

# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password

# Email de destination
CONTACT_EMAIL=contact@atlas-studio.com

# URL du frontend
FRONTEND_URL=http://localhost:3000
```

## Developpement

### Lancer le frontend

```bash
cd front
npm run dev
# Ouvre http://localhost:3000
```

### Lancer le backend

```bash
cd back
npm run dev
# Ouvre http://localhost:5000
```

## Build Production

### Frontend

```bash
cd front
npm run build
npm run start
```

### Backend

```bash
cd back
npm run build
npm run start
```

## Deploiement

### Vercel (Frontend)

```bash
npm install -g vercel
cd front
vercel --prod
```

### Configuration DNS (Namecheap)

1. Dashboard Vercel > Project > Settings > Domains
2. Ajouter: `www.votre-domaine.com` + `votre-domaine.com`
3. Sur Namecheap > Domain List > Manage > Advanced DNS
4. Configurer les records:

| Type  | Host | Value                | TTL  |
|-------|------|----------------------|------|
| A     | @    | 76.76.21.21          | Auto |
| CNAME | www  | cname.vercel-dns.com | Auto |

## Sections du Site

1. **Hero** - Presentation principale avec CTA
2. **Metriques** - Chiffres cles (utilisateurs, produits, pays, TAM)
3. **Produits** - Presentation de Wedo, Advist, U'Wallet
4. **Vision** - Pourquoi l'Afrique, statistiques du marche
5. **Investisseurs** - Opportunite d'investissement, utilisation des fonds
6. **Contact** - Formulaire pour investisseurs
7. **Footer** - Navigation et copyright

## Assets Requis

- [ ] Logo Atlas Studio (SVG)
- [ ] Favicon (16x16, 32x32, 180x180)
- [ ] OG Image (1200x630)
- [ ] Pitch Deck PDF (`public/documents/pitch-deck.pdf`)

## Licence

Copyright 2025 Atlas Studio. Tous droits reserves.
