import { useEffect, useState } from 'react'
import api from '../services/api'
import usePaginatedFetch from '../hooks/usePaginatedFetch'

interface NotificationRow {
  id: string
  policyId: string
  message: string
  scheduledFor: string
  status: string
  policy?: { policyNumber: string; policyholderName: string }
}

export default function ScheduledNotifications() {
  const { items: notifications, total, page, pageSize, setPage, setPageSize, loading, fetchPage } = usePaginatedFetch<NotificationRow>('/notifications', undefined, 1, 20)
  const [editing, setEditing] = useState<NotificationRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    // initial load handled by hook
  }, [])

  const openEdit = (n: NotificationRow) => { setEditing(n); setModalOpen(true) }

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setToast({ type: 'success', message: 'Notificação deletada' })
      fetchPage()
    } catch (err) {
      console.error('Delete error', err)
      setToast({ type: 'error', message: 'Erro ao deletar notificação' })
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleSendNow = async (id: string) => {
    try {
      setToast({ type: 'info', message: 'Enviando...' })
      await api.post(`/notifications/send-now/${id}`)
      setToast({ type: 'success', message: 'Envio disparado' })
      fetchPage()
    } catch (err) {
      console.error('Send now error', err)
      setToast({ type: 'error', message: 'Erro ao enviar agora' })
    }
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await api.put(`/notifications/${editing.id}`, { message: editing.message, scheduledFor: editing.scheduledFor, status: editing.status })
      setToast({ type: 'success', message: 'Notificação atualizada' })
      setModalOpen(false)
      setEditing(null)
      fetchPage()
    } catch (err) {
      console.error('Save error', err)
      setToast({ type: 'error', message: 'Erro ao salvar notificação' })
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notificações Agendadas</h1>

      <div className="bg-white rounded shadow p-4">
          {loading ? <div>Loading...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2">Apólice</th>
                <th className="py-2">Cliente</th>
                <th className="py-2">Agendada</th>
                <th className="py-2">Status</th>
                <th className="py-2">Mensagem</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} className="border-t">
                  <td className="py-2">{n.policy?.policyNumber}</td>
                  <td className="py-2">{n.policy?.policyholderName}</td>
                  <td className="py-2">{new Date(n.scheduledFor).toLocaleString()}</td>
                  <td className="py-2">{n.status}</td>
                  <td className="py-2">{n.message}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => openEdit(n)} className="text-blue-600 mr-2">Editar</button>
                    <button onClick={() => handleSendNow(n.id)} className="text-green-600 mr-2">Enviar agora</button>
                    <button onClick={() => handleDelete(n.id)} className="text-red-600">Deletar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      {total !== null && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Total: {total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const np = Math.max(1, page-1); setPage(np); fetchPage(); }} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
            <div>Página {page}</div>
            <button disabled={total !== null && page * pageSize >= total} onClick={() => { const np = page+1; setPage(np); fetchPage(); }} className="px-3 py-1 border rounded disabled:opacity-50">Próxima</button>
            <select value={pageSize} onChange={(e) => { const s = parseInt(e.target.value, 10); setPageSize(s); setPage(1); fetchPage(); }} className="ml-4 border rounded px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2 rounded shadow ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
          <div className="flex items-center gap-3">
            <div>{toast.message}</div>
            <button className="ml-4 text-sm underline" onClick={() => setToast(null)}>Fechar</button>
          </div>
        </div>
      )}

      {modalOpen && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-semibold mb-2">Editar Notificação</h3>
            <label className="block text-sm text-gray-700">Mensagem</label>
            <textarea className="w-full border p-2 mb-2" value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} />
            <label className="block text-sm text-gray-700">Data Agendada</label>
            <input type="datetime-local" className="w-full border p-2 mb-2" value={editing.scheduledFor.slice(0,16)} onChange={(e) => setEditing({ ...editing, scheduledFor: new Date(e.target.value).toISOString() })} />
            <label className="block text-sm text-gray-700">Status</label>
            <select className="w-full border p-2 mb-4" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="pending">pending</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-80">
            <h3 className="font-semibold mb-2">Confirma exclusão?</h3>
            <p className="text-sm text-gray-600 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => confirmDelete(confirmDeleteId)}>Deletar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
