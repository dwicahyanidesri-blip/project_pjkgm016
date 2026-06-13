// src/components/UI.jsx
import { Loader2, Database } from 'lucide-react'

export function Spinner({ text = 'Memuat data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <Loader2 size={32} className="animate-spin text-blue-500" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

export function EmptyState({ title = 'Belum ada data', desc = 'Upload dataset untuk memulai analisis.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
        <Database size={36} className="text-blue-300" />
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-slate-600">{title}</div>
        <div className="text-sm mt-1 max-w-xs">{desc}</div>
      </div>
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
      ⚠️ {message}
    </div>
  )
}
