import { useState, useEffect } from "react";
import { Loader2, Check, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { exportToCSV } from "../../lib/csvExport";
import type { NewsletterSubscriber } from "../../lib/database.types";

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    setSubscribers(data as NewsletterSubscriber[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const toggleActive = async (sub: NewsletterSubscriber) => {
    await supabase
      .from("newsletter_subscribers")
      .update({ is_active: !sub.is_active })
      .eq("id", sub.id);
    fetchSubscribers();
    showToast(sub.is_active ? "Abonné désactivé" : "Abonné réactivé");
  };

  const handleExport = () => {
    exportToCSV(subscribers, [
      { key: "email", label: "Email" },
      { key: "subscribed_at", label: "Date d'inscription", render: (r) => new Date(r.subscribed_at).toLocaleDateString("fr-FR") },
      { key: "is_active", label: "Actif", render: (r) => r.is_active ? "Oui" : "Non" },
    ], "newsletter-abonnes");
    showToast("Export CSV téléchargé");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Newsletter</h1>
          <p className="text-neutral-muted text-sm">{subscribers.length} abonnés</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-warm-border rounded-lg bg-white text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
          <Download size={14} /> Exporter CSV
        </button>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <AdminTable
        keyExtractor={(r: NewsletterSubscriber) => r.id}
        columns={[
          { key: "email", label: "Email", sortable: true },
          { key: "subscribed_at", label: "Inscrit le", sortable: true, render: (r: NewsletterSubscriber) => new Date(r.subscribed_at).toLocaleDateString("fr-FR") },
          { key: "is_active", label: "Statut", render: (r: NewsletterSubscriber) => (
            <button onClick={(e) => { e.stopPropagation(); toggleActive(r); }}>
              <AdminBadge status={r.is_active ? "active" : "suspended"} label={r.is_active ? "Actif" : "Inactif"} />
            </button>
          )},
        ]}
        data={subscribers}
      />
    </div>
  );
}
