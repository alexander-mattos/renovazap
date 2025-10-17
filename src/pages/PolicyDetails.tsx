import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'

const PolicyDetails: React.FC = () => {
  const { id } = useParams()
  const [policy, setPolicy] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingRenewal, setUpdatingRenewal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewalDateInput, setRenewalDateInput] = useState<string>('')

  useEffect(() => {
    if (id) fetchPolicy(id)
  }, [id])

  const fetchPolicy = async (policyId: string) => {
    try {
      setLoading(true)
      const p = await api.get(`/policies/${policyId}`)
      setPolicy(p.data)
      const h = await api.get(`/notifications/history/${policyId}`)
      setNotifications(h.data || [])
    } catch (error) {
      console.error('Error loading policy details', error)
    } finally {
      setLoading(false)
    }
  }

  const openRenewModal = () => {
    setRenewalDateInput(new Date().toISOString().slice(0, 10))
    setShowRenewModal(true)
  }

  const confirmRenewal = async () => {
    if (!policy) return
    try {
      setUpdatingRenewal(true)
      await api.put(`/policies/${policy.id}/renew`, { renewed: true, renewalDate: renewalDateInput })
      setShowRenewModal(false)
      await fetchPolicy(policy.id)
    } catch (error) {
      console.error('Error updating renewal', error)
      alert('Erro ao atualizar renovação')
    } finally {
      setUpdatingRenewal(false)
    }
  }

  const unmarkRenewal = async () => {
    if (!policy) return
    if (!confirm('Remover marca de renovada?')) return
    try {
      setUpdatingRenewal(true)
      await api.put(`/policies/${policy.id}/renew`, { renewed: false })
      await fetchPolicy(policy.id)
    } catch (error) {
      console.error('Error unmarking renewal', error)
      alert('Erro ao atualizar renovação')
    } finally {
      setUpdatingRenewal(false)
    }
  }

  const handleResend = async (notificationId: string) => {
    if (!confirm('Reenviar notificação?')) return
    try {
      await api.post(`/notifications/resend/${notificationId}`)
      alert('Reenvio solicitado')
    } catch (error) {
      console.error('Error resending notification', error)
      alert('Erro ao reenviar notificação')
    }
  }

  const handleSendNow = async (notificationId: string) => {
    if (!confirm('Enviar notificação agora?')) return
    try {
      await api.post(`/notifications/send-now/${notificationId}`)
      alert('Envio iniciado')
      if (id) fetchPolicy(id)
    } catch (error) {
      console.error('Error sending notification now', error)
      alert('Erro ao enviar notificação')
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'sent': return 'Enviada'
      case 'failed': return 'Falha no envio'
      default: return status
    }
  }

  if (loading) return <div>Carregando...</div>

  if (!policy) return <div>Apólice não encontrada</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Apólice {policy.policyNumber}</h1>
        <p>{policy.policyholderName} - {policy.policyholderPhone}</p>
        <div className="mt-2 flex items-center gap-4">
          <div>
            <label className="text-sm font-medium mr-2">Renovada:</label>
            <strong>{policy.renewed ? 'Sim' : 'Não'}</strong>
          </div>
          <div>
            {policy.renewalDate && <span className="text-sm text-gray-500">(em: {new Date(policy.renewalDate).toLocaleDateString()})</span>}
          </div>
          <div>
            {!policy.renewed ? (
              <button disabled={updatingRenewal} onClick={openRenewModal} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Marcar renovada
              </button>
            ) : (
              <button disabled={updatingRenewal} onClick={unmarkRenewal} className="ml-4 bg-gray-300 text-black px-3 py-1 rounded text-sm">
                Remover renovada
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Renewal modal */}
      {showRenewModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Registrar Renovação</h3>
            <label className="block text-sm mb-2">Data da renovação</label>
            <input type="date" value={renewalDateInput} onChange={(e) => setRenewalDateInput(e.target.value)} className="border p-2 rounded w-full mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRenewModal(false)} className="px-3 py-1 rounded border">Cancelar</button>
              <button onClick={confirmRenewal} className="px-3 py-1 rounded bg-blue-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Notificações agendadas / histórico</h2>
        {notifications.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhuma notificação encontrada</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>Data Agendada</th>
                <th>Status</th>
                <th>Mensagem</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-t">
                  <td className="py-2">{new Date(n.scheduledFor).toLocaleString()}</td>
                  <td className="py-2">{n.status}</td>
                  <td className="py-2">{n.message}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <div className="text-sm">{statusLabel(n.status)}</div>
                      <div>
                        <button onClick={() => handleSendNow(n.id)} className="text-green-700">Enviar agora</button>
                      </div>
                      {n.status === 'failed' && (
                        <button onClick={() => handleResend(n.id)} className="text-blue-700">Reenviar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default PolicyDetails