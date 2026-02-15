import { Link } from "react-router-dom";
import { useContentContext } from "../components/layout/Layout";
import { AppLogo } from "../components/ui/Logo";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import type { AppItem } from "../config/content";

function PricingTable({ apps, columns }: { apps: AppItem[]; columns: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px] bg-white rounded-2xl overflow-hidden border border-warm-border">
        <thead>
          <tr className="bg-warm-bg">
            <th className="p-5 text-left text-neutral-muted text-xs font-bold uppercase border-b border-warm-border">Application</th>
            {columns.map((col, i) => (
              <th
                key={col}
                className={`p-5 text-center text-xs font-bold uppercase border-b border-warm-border ${
                  i === 1 ? "text-gold" : "text-neutral-muted"
                }`}
              >
                {col}
                {i === 1 && <span className="bg-gold text-onyx px-2 py-0.5 rounded-full text-[10px] ml-1.5">POPULAIRE</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => {
            const p = Object.entries(app.pricing);
            return (
              <tr key={app.id} className="border-b border-warm-border last:border-b-0 hover:bg-warm-bg/50 transition-colors">
                <td className="p-5">
                  <Link to={`/applications/${app.id}`} className="hover:opacity-80 transition-opacity">
                    <AppLogo name={app.name} size={18} color="text-gold" />
                    <div className="text-neutral-placeholder text-[11px] mt-0.5">{app.tagline}</div>
                  </Link>
                </td>
                {columns.map((_, ci) => (
                  <td key={ci} className={`p-5 text-center ${ci === 1 ? "bg-gold/[0.03]" : ""}`}>
                    {p[ci] ? (
                      <span className="text-gold text-2xl font-bold">
                        {p[ci][1] === 0 ? (
                          <span className="text-lg">Gratuit</span>
                        ) : (
                          <>{p[ci][1]}<span className="text-neutral-muted text-xs font-normal">/mois</span></>
                        )}
                      </span>
                    ) : (
                      <span className="text-neutral-muted text-sm">—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PricingPage() {
  const { content } = useContentContext();

  const erpModules = content.apps.filter(a => a.type === "Module ERP");
  const standaloneApps = content.apps.filter(a => a.type === "App" || a.type === "App mobile");

  return (
    <div className="bg-warm-bg text-neutral-text pt-28 pb-24 px-6 min-h-screen">
      <div className="max-w-site mx-auto">
        <ScrollReveal>
          <SectionHeading
            title="Tarifs simples et transparents"
            subtitle="Payez uniquement ce que vous utilisez. Changez ou annulez à tout moment."
          />
        </ScrollReveal>

        {/* Summary cards */}
        <ScrollReveal>
          <div className="flex gap-5 justify-center flex-wrap mb-14">
            <div className="bg-white border border-warm-border rounded-2xl p-8 flex-1 min-w-[200px] max-w-[280px] text-center">
              <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Modules ERP</div>
              <div className="text-gold text-4xl font-extrabold">19</div>
              <div className="text-neutral-placeholder text-sm">/mois par module</div>
              <p className="text-neutral-muted text-xs mt-3">{erpModules.length} modules disponibles</p>
            </div>
            <div className="bg-white border border-warm-border rounded-2xl p-8 flex-1 min-w-[200px] max-w-[280px] text-center">
              <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Apps standalone</div>
              <div className="text-gold text-4xl font-extrabold">0</div>
              <div className="text-neutral-placeholder text-sm">/mois (freemium)</div>
              <p className="text-neutral-muted text-xs mt-3">{standaloneApps.length} apps disponibles</p>
            </div>
          </div>
        </ScrollReveal>

        {/* ERP Modules table */}
        <ScrollReveal>
          <h3 className="text-neutral-text text-lg font-bold mb-4">Modules ERP — {erpModules.length} modules</h3>
          <PricingTable apps={erpModules} columns={["Starter", "Pro", "Enterprise"]} />
        </ScrollReveal>

        {/* Standalone Apps table */}
        <ScrollReveal>
          <h3 className="text-neutral-text text-lg font-bold mb-4 mt-12">Apps standalone — {standaloneApps.length} apps</h3>
          <PricingTable apps={standaloneApps} columns={["Basic", "Pro", "Enterprise"]} />
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center mt-12">
            <Link to="/portal" className="btn-gold">
              Créer mon compte &rarr;
            </Link>
            <p className="text-neutral-placeholder text-[13px] mt-4">
              Essai gratuit 14 jours &middot; Sans carte bancaire &middot; Sans engagement
            </p>
          </div>
        </ScrollReveal>

        {/* FAQ preview */}
        <ScrollReveal>
          <div className="mt-20 max-w-2xl mx-auto text-center">
            <h3 className="text-neutral-text text-xl font-bold mb-4">Questions sur les tarifs ?</h3>
            <p className="text-neutral-muted text-sm mb-6">
              Consultez notre FAQ ou contactez-nous directement.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/faq" className="text-gold font-semibold text-sm hover:underline">
                Voir la FAQ &rarr;
              </Link>
              <Link to="/contact" className="text-gold font-semibold text-sm hover:underline">
                Nous contacter &rarr;
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
