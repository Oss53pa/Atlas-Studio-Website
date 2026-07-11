import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { NewsletterTemplate } from '../../types/newsletter'
import { LayoutTemplate, Loader2 } from 'lucide-react'

interface Props {
  onSelect: (template: NewsletterTemplate) => void
}

export function TemplateGallery({ onSelect }: Props) {
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('newsletter_templates').select('*').order('category').then(({ data }) => {
      setTemplates((data as NewsletterTemplate[]) || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-p-accent" /></div>

  const categories = [...new Set(templates.map(t => t.category))]

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-xs font-medium text-p-accent uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.filter(t => t.category === cat).map(tpl => (
              <button key={tpl.id} onClick={() => onSelect(tpl)}
                className="p-4 rounded-xl bg-p-surface border border-p-border hover:border-p-accent/50 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-p-surface-alt flex items-center justify-center mb-3 group-hover:bg-p-accent/20 transition-colors">
                  <LayoutTemplate size={18} className="text-[#888] group-hover:text-p-accent" />
                </div>
                <div className="text-sm text-[#F5F5F5] font-medium">{tpl.name}</div>
                {tpl.description && <div className="text-[11px] text-[#888] mt-1">{tpl.description}</div>}
                {tpl.is_system && <div className="text-[10px] text-p-accent mt-2">Atlas Studio</div>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
