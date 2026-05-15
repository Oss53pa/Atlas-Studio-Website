import { Settings, Construction } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';

export default function AsvcConfigPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Configuration ASVC"
        subtitle="Paramètres globaux, prompts agents, intégrations"
      />

      <div className="rounded-xl border border-white/10 bg-onyx-light/20 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Construction size={16} className="text-admin-accent" />
          <h2 className="text-neutral-light text-sm font-semibold">À venir</h2>
        </div>
        <p className="text-neutral-400 text-[13px] leading-relaxed">
          Cet écran exposera les contrôles fins par agent :
        </p>
        <ul className="mt-3 space-y-1.5 text-[12.5px] text-neutral-400 list-disc list-inside marker:text-admin-accent">
          <li>Édition des <em>system prompts</em> par agent (versionnés)</li>
          <li>Choix des LLM primaires/fallback</li>
          <li>Rate limiting et budget tokens mensuel</li>
          <li>Seuils de confiance et de sentiment pour escalade</li>
          <li>Connecteurs externes (Gmail, LinkedIn, X, CinetPay, Stripe, GitHub)</li>
          <li>Calendrier éditorial Marketing</li>
          <li>ICP & grille tarifaire</li>
        </ul>

        <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2 text-neutral-600 text-[11px]">
          <Settings size={11} />
          Sprint S0 (foundation) — fonctionnalités prévues à partir de S1.
        </div>
      </div>
    </div>
  );
}
