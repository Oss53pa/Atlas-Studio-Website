import { ArrowLeft, Loader2, Mail, MousePointerClick, Eye, UserMinus, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useCampaignStats } from '../../hooks/newsletter/useCampaignStats'

interface Props {
  campaignId: string
  onBack: () => void
}

export function CampaignStats({ campaignId, onBack }: Props) {
  const { campaign, sends, loading, openRate, clickRate, ctor, unsubRate, bounceRate } = useCampaignStats(campaignId)

  if (loading || !campaign) return (
    <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-[#EF9F27]" /></div>
  )

  const kpis = [
    { label: 'Taux d\'ouverture', value: `${openRate.toFixed(1)}%`, sub: `${campaign.unique_open_count} / ${campaign.delivered_count}`, icon: Eye, color: '#EF9F27' },
    { label: 'Taux de clic', value: `${clickRate.toFixed(1)}%`, sub: `${campaign.unique_click_count} / ${campaign.delivered_count}`, icon: MousePointerClick, color: '#3B82F6' },
    { label: 'CTOR', value: `${ctor.toFixed(1)}%`, sub: 'Click-to-Open Rate', icon: Mail, color: '#8B5CF6' },
    { label: 'Désabonnements', value: `${unsubRate.toFixed(2)}%`, sub: `${campaign.unsubscribe_count} désabonnés`, icon: UserMinus, color: '#F59E0B' },
    { label: 'Rebonds', value: `${bounceRate.toFixed(2)}%`, sub: `${campaign.bounce_count} rebonds`, icon: AlertTriangle, color: '#EF4444' },
  ]

  // Distribution horaire des envois
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}h`,
    count: sends.filter(s => s.opened_at && new Date(s.opened_at).getHours() === h).length,
  }))

  // Status breakdown
  const statusBreakdown = ['sent', 'delivered', 'opened', 'clicked', 'bounced'].map(s => ({
    status: s, count: sends.filter(x => x.status === s).length
  }))

  return (
    <div className="p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5]"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">{campaign.name}</h1>
          <p className="text-xs text-[#888] mt-0.5">Envoyée le {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} · {campaign.recipient_count} destinataires</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><k.icon size={14} style={{ color: k.color }} /><span className="text-[11px] text-[#888]">{k.label}</span></div>
            <div className="text-2xl font-bold text-[#F5F5F5]">{k.value}</div>
            <div className="text-[10px] text-[#888] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#F5F5F5] mb-4">Ouvertures par heure</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourData}>
              <XAxis dataKey="hour" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1E1E2E', border: '1px solid #2A2A3A', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#EF9F27" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#F5F5F5] mb-4">Distribution des statuts</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusBreakdown} layout="vertical">
              <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis dataKey="status" type="category" tick={{ fill: '#888', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: '#1E1E2E', border: '1px solid #2A2A3A', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* A/B test results */}
      {campaign.ab_test_enabled && (
        <div className="mt-6 bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#F5F5F5] mb-4">Résultats A/B Test</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#2A2A3A]/30">
              <div className="text-xs text-[#EF9F27] font-medium mb-1">Variante A</div>
              <div className="text-sm text-[#F5F5F5]">{campaign.subject}</div>
              <div className="text-xs text-[#888] mt-2">Opens: {campaign.open_count} · Clics: {campaign.click_count}</div>
            </div>
            <div className="p-4 rounded-lg bg-[#2A2A3A]/30">
              <div className="text-xs text-[#3B82F6] font-medium mb-1">Variante B</div>
              <div className="text-sm text-[#F5F5F5]">{campaign.subject_variant_b || '-'}</div>
              <div className="text-xs text-[#888] mt-2">Opens: {campaign.open_count_b} · Clics: {campaign.click_count_b}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
