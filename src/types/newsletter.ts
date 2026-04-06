export type BlockType =
  | 'header' | 'text' | 'image' | 'button'
  | 'divider' | 'cols2' | 'featured' | 'footer'

export interface BlockBase {
  id: string
  type: BlockType
}

export interface HeaderBlock extends BlockBase {
  type: 'header'
  props: {
    title: string
    subtitle: string
    bg: string
    titleColor: string
    subtitleColor: string
    logoUrl?: string
  }
}

export interface TextBlock extends BlockBase {
  type: 'text'
  props: {
    content: string
    fontSize: number
    color: string
    align: 'left' | 'center' | 'right'
    padding: string
  }
}

export interface ImageBlock extends BlockBase {
  type: 'image'
  props: {
    src: string
    alt: string
    width: string
    align: 'left' | 'center' | 'right'
    linkUrl?: string
    borderRadius: number
  }
}

export interface ButtonBlock extends BlockBase {
  type: 'button'
  props: {
    text: string
    url: string
    color: string
    textColor: string
    align: 'left' | 'center' | 'right'
    borderRadius: number
    padding: string
    fullWidth: boolean
  }
}

export interface DividerBlock extends BlockBase {
  type: 'divider'
  props: {
    color: string
    thickness: number
    style: 'solid' | 'dashed' | 'dotted'
    margin: string
  }
}

export interface Cols2Block extends BlockBase {
  type: 'cols2'
  props: {
    left: { title: string; text: string; iconEmoji?: string }
    right: { title: string; text: string; iconEmoji?: string }
    bg: string
    gap: number
  }
}

export interface FeaturedBlock extends BlockBase {
  type: 'featured'
  props: {
    badge: string
    title: string
    subtitle: string
    ctaText: string
    ctaUrl: string
    bg: string
    accentColor: string
  }
}

export interface FooterBlock extends BlockBase {
  type: 'footer'
  props: {
    companyName: string
    address: string
    unsubscribeText: string
    color: string
    showSocial: boolean
    socialLinks: { platform: string; url: string }[]
  }
}

export type EmailBlock =
  | HeaderBlock | TextBlock | ImageBlock | ButtonBlock
  | DividerBlock | Cols2Block | FeaturedBlock | FooterBlock

export interface Campaign {
  id: string
  name: string
  subject: string
  subject_variant_b?: string
  preview_text?: string
  from_name: string
  from_email: string
  reply_to?: string
  html_body?: string
  blocks: EmailBlock[]
  segment_ids: string[]
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  ab_test_enabled: boolean
  ab_split_ratio: number
  scheduled_at?: string
  sent_at?: string
  recipient_count: number
  delivered_count: number
  open_count: number
  unique_open_count: number
  click_count: number
  unique_click_count: number
  unsubscribe_count: number
  bounce_count: number
  spam_count: number
  open_count_b: number
  click_count_b: number
  created_at: string
  updated_at: string
}

export interface Subscriber {
  id: string
  email: string
  full_name?: string
  tenant_id?: string
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
  source: string
  tags: string[]
  open_count: number
  click_count: number
  bounce_count: number
  last_opened_at?: string
  created_at: string
  updated_at: string
}

export interface Segment {
  id: string
  name: string
  description?: string
  filters: Record<string, unknown>
  subscriber_count: number
  last_computed_at?: string
  created_at: string
}

export interface NewsletterTemplate {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  blocks: EmailBlock[]
  category: string
  is_system: boolean
  created_at: string
}

export interface CampaignSend {
  id: string
  campaign_id: string
  subscriber_id: string
  email: string
  variant: 'a' | 'b'
  status: string
  resend_message_id?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  bounce_reason?: string
  created_at: string
}
