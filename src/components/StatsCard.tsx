// React import not required with new JSX runtime

interface Props {
  title: string
  items: { id: string; name: string; count: number }[]
}

export default function StatsCard({ title, items }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
            <div className="text-sm text-gray-700">{it.name}</div>
            <div className="text-sm font-medium text-gray-900">{it.count}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-gray-500 text-sm">Nenhum registro</div>
        )}
      </div>
    </div>
  )
}
