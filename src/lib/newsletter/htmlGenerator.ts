import type {
  EmailBlock, Campaign, HeaderBlock, TextBlock, ImageBlock,
  ButtonBlock, DividerBlock, Cols2Block, FeaturedBlock, FooterBlock
} from '../../types/newsletter'

export function generateEmailHtml(blocks: EmailBlock[], campaign: Campaign): string {
  const blocksHtml = blocks.map(renderBlock).join('\n')
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(campaign.subject)}</title>
  ${campaign.preview_text ? `<!--[if !mso]><!--><div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(campaign.preview_text)}</div><!--<![endif]-->` : ''}
  <style>
    body { margin: 0; padding: 0; background-color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; }
    img { max-width: 100%; height: auto; display: block; border: 0; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .col-half { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;">
    <tr><td align="center" style="padding:20px 0;">
      <table role="presentation" class="email-wrapper" width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td>
${blocksHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case 'header': return renderHeader(block)
    case 'text': return renderText(block)
    case 'image': return renderImage(block)
    case 'button': return renderButton(block)
    case 'divider': return renderDivider(block)
    case 'cols2': return renderCols2(block)
    case 'featured': return renderFeatured(block)
    case 'footer': return renderFooter(block)
    default: return ''
  }
}

function renderHeader(block: HeaderBlock): string {
  return `<div style="padding:28px 32px;text-align:center;background:${block.props.bg};">
  <div style="font-size:26px;font-weight:500;color:${block.props.titleColor};line-height:1.3;">${block.props.title}</div>
  ${block.props.subtitle ? `<div style="font-size:14px;color:${block.props.subtitleColor || '#888888'};margin-top:8px;">${block.props.subtitle}</div>` : ''}
</div>`
}

function renderText(block: TextBlock): string {
  const content = block.props.content.replace(/\n/g, '<br>')
  return `<div style="padding:${block.props.padding};text-align:${block.props.align};">
  <div style="font-size:${block.props.fontSize}px;color:${block.props.color};line-height:1.8;">${content}</div>
</div>`
}

function renderImage(block: ImageBlock): string {
  if (!block.props.src) return `<div style="padding:16px 32px;text-align:${block.props.align};">
  <div style="background:#F9F9F9;border:2px dashed #CCC;border-radius:8px;padding:40px;text-align:center;color:#999;font-size:13px;">Image</div>
</div>`
  const img = `<img src="${block.props.src}" alt="${escapeHtml(block.props.alt)}" style="width:${block.props.width};border-radius:${block.props.borderRadius}px;">`
  return `<div style="padding:16px 32px;text-align:${block.props.align};">
  ${block.props.linkUrl ? `<a href="${block.props.linkUrl}">${img}</a>` : img}
</div>`
}

function renderButton(block: ButtonBlock): string {
  return `<div style="padding:16px 32px;text-align:${block.props.align};">
  <a href="${block.props.url}" style="display:inline-block;padding:${block.props.padding};background:${block.props.color};color:${block.props.textColor};font-size:14px;font-weight:500;border-radius:${block.props.borderRadius}px;${block.props.fullWidth ? 'width:100%;text-align:center;box-sizing:border-box;' : ''}">${block.props.text}</a>
</div>`
}

function renderDivider(block: DividerBlock): string {
  return `<div style="margin:${block.props.margin};">
  <div style="height:${block.props.thickness}px;background:${block.props.color};border-style:${block.props.style};"></div>
</div>`
}

function renderCols2(block: Cols2Block): string {
  const renderCol = (col: { title: string; text: string; iconEmoji?: string }) => `
    <td class="col-half" style="width:50%;vertical-align:top;padding:0 8px;">
      <div style="background:${block.props.bg};border-radius:8px;padding:16px;">
        ${col.iconEmoji ? `<div style="font-size:20px;margin-bottom:8px;">${col.iconEmoji}</div>` : ''}
        <div style="font-size:13px;font-weight:500;color:#0A0A0A;margin-bottom:6px;">${col.title}</div>
        <div style="font-size:12px;color:#666666;line-height:1.6;">${col.text}</div>
      </div>
    </td>`
  return `<div style="padding:16px 24px;">
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
    ${renderCol(block.props.left)}
    ${renderCol(block.props.right)}
  </tr></table>
</div>`
}

function renderFeatured(block: FeaturedBlock): string {
  return `<div style="padding:16px 32px;">
  <div style="background:${block.props.bg};border-radius:10px;padding:28px;text-align:center;">
    ${block.props.badge ? `<div style="font-size:11px;color:${block.props.accentColor};font-weight:500;letter-spacing:1px;margin-bottom:10px;">${block.props.badge}</div>` : ''}
    <div style="font-size:22px;font-weight:500;color:#FFFFFF;margin-bottom:8px;">${block.props.title}</div>
    <div style="font-size:13px;color:#AAAAAA;margin-bottom:20px;">${block.props.subtitle}</div>
    <a href="${block.props.ctaUrl}" style="display:inline-block;padding:10px 28px;background:${block.props.accentColor};color:#000000;font-size:13px;font-weight:500;border-radius:6px;">${block.props.ctaText}</a>
  </div>
</div>`
}

function renderFooter(block: FooterBlock): string {
  return `<div style="padding:24px 32px;text-align:center;border-top:0.5px solid #EEEEEE;">
  <div style="font-size:11px;color:${block.props.color};">${block.props.companyName} · ${block.props.address}</div>
  <div style="margin-top:8px;">
    <a href="{{unsubscribe_url}}" style="font-size:11px;color:#EF9F27;">${block.props.unsubscribeText}</a>
    &nbsp;·&nbsp;
    <a href="{{view_online_url}}" style="font-size:11px;color:#EF9F27;">Voir en ligne</a>
  </div>
</div>`
}
