import { useEffect, useState } from 'react'
import api from '../services/api'
// StatsCard not used when rendering charts
// import StatsCard from '../components/StatsCard'
// Recharts types may not be installed yet; ignore until dependency is added
// Simple inline SVG bar chart component (avoids adding external chart dependency)
function SimpleBarChart({ data, color = '#3b82f6' }: { data: { name: string; count: number }[]; color?: string }) {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0) || 1
  return (
    <div className="w-full h-full overflow-auto">
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-4">
            <div className="text-sm text-gray-700 w-40 truncate">{d.name}</div>
            <div className="flex-1 bg-gray-100 rounded overflow-hidden" style={{ height: 20 }}>
              <div
                className="h-full"
                style={{ width: `${(d.count / max) * 100}%`, background: color }}
                title={`${d.count}`}
              />
            </div>
            <div className="w-12 text-right text-sm font-medium">{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface StatItem { id: string; name: string; count: number }

export default function StatsPage() {
  const [providers, setProviders] = useState<StatItem[]>([])
  const [types, setTypes] = useState<StatItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topN, setTopN] = useState<number>(10)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const [pRes, tRes] = await Promise.all([
          api.get('/insurance-providers/stats', { params: { top: topN } }),
          api.get('/insurance-types/stats', { params: { top: topN } })
        ])

        setProviders(pRes.data?.items || [])
        setTypes(tRes.data?.items || [])
      } catch (err: any) {
        console.error('Error fetching stats', err)
        setError('Erro ao carregar estatísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [topN])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estatísticas</h1>
          <p className="text-gray-600">Contagens de apólices por seguradora e por tipo</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600">Top</label>
        <select value={topN} onChange={(e) => { const v = parseInt(e.target.value, 10); setTopN(v); }} className="border rounded px-2 py-1">
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Seguradoras - Top {topN}</h3>
            <div style={{ height: 300 }}>
              <SimpleBarChart data={providers} color="#3b82f6" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Tipos - Top {topN}</h3>
            <div style={{ height: 300 }}>
              <SimpleBarChart data={types} color="#10b981" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
