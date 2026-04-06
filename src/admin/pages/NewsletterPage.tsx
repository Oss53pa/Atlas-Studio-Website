import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { createDefaultBlock } from "../../lib/newsletter/blockDefaults";
import { CampaignList } from "../../components/newsletter/CampaignList";
import { CampaignEditor } from "../../components/newsletter/CampaignEditor";
import { CampaignStats } from "../../components/newsletter/CampaignStats";
import { SubscribersList } from "../../components/newsletter/SubscribersList";
import { TemplateGallery } from "../../components/newsletter/TemplateGallery";
import { Mail, Users, LayoutTemplate } from "lucide-react";
import type { Campaign, NewsletterTemplate } from "../../types/newsletter";

type MainTab = "campaigns" | "subscribers" | "templates";
type View = "list" | "editor" | "stats";

export default function NewsletterPage() {
  const [mainTab, setMainTab] = useState<MainTab>("campaigns");
  const [view, setView] = useState<View>("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const createCampaign = async (blocks?: unknown[]) => {
    const defaultBlocks = blocks || [
      createDefaultBlock("header", "#EF9F27"),
      createDefaultBlock("text", "#EF9F27"),
      createDefaultBlock("button", "#EF9F27"),
      createDefaultBlock("footer", "#EF9F27"),
    ];

    const { data } = await supabase
      .from("newsletter_campaigns")
      .insert({
        name: "Nouvelle campagne",
        subject: "",
        from_name: "Pamela — Atlas Studio",
        from_email: "notifications@atlasstudio.org",
        blocks: defaultBlocks,
        status: "draft",
      })
      .select()
      .single();

    if (data) {
      setSelectedCampaignId(data.id);
      setView("editor");
      setMainTab("campaigns");
    }
  };

  const handleTemplateSelect = (template: NewsletterTemplate) => {
    createCampaign(template.blocks);
  };

  // Editor/Stats views are fullscreen
  if (view === "editor" && selectedCampaignId) {
    return (
      <div className="h-[calc(100vh-64px)]">
        <CampaignEditor
          campaignId={selectedCampaignId}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "stats" && selectedCampaignId) {
    return (
      <CampaignStats
        campaignId={selectedCampaignId}
        onBack={() => setView("list")}
      />
    );
  }

  // Main tabbed view
  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2A2A3A] pb-0">
        {([
          { key: "campaigns" as const, icon: Mail, label: "Campagnes" },
          { key: "subscribers" as const, icon: Users, label: "Abonnés" },
          { key: "templates" as const, icon: LayoutTemplate, label: "Templates" },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              mainTab === key
                ? "text-[#EF9F27] border-[#EF9F27]"
                : "text-[#888] border-transparent hover:text-[#F5F5F5]"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mainTab === "campaigns" && (
        <CampaignList
          onEdit={(id) => {
            setSelectedCampaignId(id);
            setView("editor");
          }}
          onStats={(id) => {
            setSelectedCampaignId(id);
            setView("stats");
          }}
          onCreate={() => createCampaign()}
        />
      )}

      {mainTab === "subscribers" && <SubscribersList />}

      {mainTab === "templates" && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#F5F5F5]">Templates</h1>
              <p className="text-sm text-[#888] mt-1">Choisissez un template pour démarrer une campagne</p>
            </div>
          </div>
          <TemplateGallery onSelect={handleTemplateSelect} />
        </div>
      )}
    </div>
  );
}
