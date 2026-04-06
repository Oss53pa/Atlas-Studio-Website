import { useState } from 'react'
import { Upload, X, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  onClose: () => void
  onImported: () => void
}

export function ImportModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState({ email: '0', full_name: '-1' })
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)

  const handleFile = async (f: File) => {
    setFile(f)
    const text = await f.text()
    const rows = text.split('\n').map(r => r.split(',').map(c => c.trim().replace(/"/g, '')))
    setPreview(rows.slice(0, 5))
    const headers = rows[0].map(h => h.toLowerCase())
    setMapping({
      email: String(headers.findIndex(h => h.includes('email'))),
      full_name: String(headers.findIndex(h => h.includes('nom') || h.includes('name'))),
    })
  }

  const runImport = async () => {
    if (!file) return
    setIsImporting(true)
    const text = await file.text()
    const rows = text.split('\n').slice(1).filter(r => r.trim())
    let added = 0, skipped = 0

    const batch = rows.map(row => {
      const cols = row.split(',').map(c => c.trim().replace(/"/g, ''))
      return {
        email: cols[parseInt(mapping.email)],
        full_name: parseInt(mapping.full_name) >= 0 ? cols[parseInt(mapping.full_name)] : undefined,
        status: 'active',
        source: 'import',
      }
    }).filter(s => s.email && s.email.includes('@'))

    const { data, error } = await supabase.from('newsletter_subscribers').upsert(batch, { onConflict: 'email', ignoreDuplicates: true }).select()
    added = data?.length || 0
    skipped = batch.length - added
    setResult({ added, skipped })
    setIsImporting(false)
    onImported()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#F5F5F5]">Importer des abonnés</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2A2A3A] text-[#888]"><X size={18} /></button>
        </div>

        {result ? (
          <div className="text-center py-8">
            <CheckCircle size={40} className="mx-auto text-green-400 mb-4" />
            <p className="text-[#F5F5F5] font-medium">{result.added} ajoutés, {result.skipped} ignorés (doublons)</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-[#EF9F27] text-black rounded-lg text-sm font-medium">Fermer</button>
          </div>
        ) : !file ? (
          <label className="flex flex-col items-center gap-3 p-10 border-2 border-dashed border-[#2A2A3A] rounded-xl cursor-pointer hover:border-[#EF9F27]/50 transition-colors">
            <Upload size={32} className="text-[#888]" />
            <span className="text-sm text-[#888]">Glissez un CSV ou cliquez pour choisir</span>
            <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        ) : (
          <>
            <p className="text-xs text-[#888] mb-3">{file.name} — {preview.length > 1 ? preview.length - 1 : 0} lignes</p>
            {preview.length > 0 && (
              <div className="overflow-x-auto mb-4 bg-[#0A0A0A] rounded-lg p-3">
                <table className="text-[10px] text-[#888]">
                  <thead><tr>{preview[0].map((h, i) => <th key={i} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                  <tbody>{preview.slice(1, 4).map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="px-2 py-1">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-[#888] mb-1 block">Colonne Email</label>
                <select value={mapping.email} onChange={e => setMapping({ ...mapping, email: e.target.value })}
                  className="w-full px-2 py-1.5 bg-[#2A2A3A] rounded text-xs text-[#F5F5F5] outline-none">
                  {preview[0]?.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#888] mb-1 block">Colonne Nom</label>
                <select value={mapping.full_name} onChange={e => setMapping({ ...mapping, full_name: e.target.value })}
                  className="w-full px-2 py-1.5 bg-[#2A2A3A] rounded text-xs text-[#F5F5F5] outline-none">
                  <option value="-1">— Aucun —</option>
                  {preview[0]?.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
            </div>
            <button onClick={runImport} disabled={isImporting}
              className="w-full py-2.5 bg-[#EF9F27] text-black rounded-lg text-sm font-medium hover:bg-[#C47E00] disabled:opacity-50 flex items-center justify-center gap-2">
              {isImporting ? <><Loader2 size={14} className="animate-spin" />Importation...</> : 'Lancer l\'import'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
