import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import api from '../services/api'

const STATUS_LABELS: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Inicializando',
  scan_qr_code: 'Aguardando QR Code',
  disconnected: 'Desconectado',
  failed: 'Falhou',
}

const WhatsAppSetup: React.FC = () => {
  const [status, setStatus] = useState<string>('desconhecido')
  const [sessionState, setSessionState] = useState<string>('')
  const [rawStatus, setRawStatus] = useState<string>('')
  const [qrData, setQrData] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string>('-')
  const [feedback, setFeedback] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pollRef = useRef<number | null>(null)

  const mapStatus = (input: string | undefined | null) => STATUS_LABELS[input || ''] || (input || 'desconhecido')

  const renderQr = (value: string | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!value) {
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    QRCode.toCanvas(canvas, value, { width: 300, margin: 1 }).catch((err) => {
      console.error('Erro ao desenhar QR', err)
    })
  }

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status')
      const { status: s, qrCode, rawStatus: raw } = res.data || {}
      setStatus(mapStatus(s))
      setSessionState(s || '')
      setRawStatus(raw || '')
      setQrData(qrCode || null)
      renderQr(qrCode || null)

      if (String(s) === 'connected' && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch (error) {
      console.error('Erro ao obter status do WhatsApp', error)
      setStatus('erro')
      setSessionState('error')
      setRawStatus('')
      setQrData(null)
      renderQr(null)
      setFeedback('Não foi possível consultar o status da sessão WAHA. Verifique se o serviço está acessível e as variáveis WAHA_BASE_URL/WAHA_API_KEY estão corretas.')
    }
  }

  useEffect(() => {
    fetchStatus()
    pollRef.current = window.setInterval(fetchStatus, 4000) as unknown as number
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleInit = async () => {
    setFeedback('')
    setLoading(true)
    try {
      const res = await api.post('/whatsapp/init')
      const { status: s, qrCode } = res.data || {}
      setStatus(mapStatus(s))
      setSessionState(s || '')
      setQrData(qrCode || null)
      renderQr(qrCode || null)
      setFeedback('Sessão inicializada. Escaneie o QR ou aguarde conexão.')
      if (!pollRef.current) {
        pollRef.current = window.setInterval(fetchStatus, 4000) as unknown as number
      }
    } catch (error: any) {
      console.error('Erro ao iniciar sessão WAHA', error)
      setFeedback(error?.response?.data?.message || 'Erro ao iniciar sessão')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setFeedback('')
    setLoading(true)
    try {
      await api.post('/whatsapp/disconnect')
      setStatus(mapStatus('disconnected'))
      setSessionState('disconnected')
      setQrData(null)
      renderQr(null)
      setFeedback('Sessão desconectada com sucesso.')
    } catch (error: any) {
      console.error('Erro ao desconectar sessão', error)
      setFeedback(error?.response?.data?.message || 'Erro ao desconectar sessão')
    } finally {
      setLoading(false)
    }
  }

  const handlePairCode = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setFeedback('')
    const phone = phoneRef.current?.value.trim()
    if (!phone) {
      setFeedback('Informe um número de telefone no formato internacional.')
      return
    }

    try {
      const res = await api.post('/whatsapp/pair-code', { phoneNumber: phone })
      const result = res.data || {}
      const code = result.code || result.message || 'Código solicitado. Verifique o aplicativo.'
      setPairingCode(code)
      setFeedback('Código solicitado com sucesso.')
    } catch (error: any) {
      console.error('Erro ao solicitar código de pareamento', error)
      setFeedback(error?.response?.data?.message || 'Erro ao solicitar código de pareamento')
    }
  }

  const badgeClassName = (() => {
    switch (sessionState) {
      case 'connected':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      case 'connecting':
        return 'bg-amber-100 text-amber-700 border border-amber-200'
      case 'scan_qr_code':
        return 'bg-sky-100 text-sky-700 border border-sky-200'
      case 'failed':
        return 'bg-red-100 text-red-700 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  })()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conector WhatsApp</h1>
          <p className="text-sm text-gray-500">Gerencie a sessão WAHA "default" diretamente pelo painel.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Iniciar sessão'}
          </button>
          <button
            onClick={fetchStatus}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
          >
            Atualizar status
          </button>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      </header>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded">{feedback}</div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded shadow p-4 flex flex-col items-center">
          {sessionState === 'connected' ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <span className={`inline-flex items-center px-4 py-2 text-base font-medium rounded-full ${badgeClassName}`}>{status}</span>
              {rawStatus && <span className="text-xs text-gray-400">({rawStatus})</span>}
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} width={300} height={300} className="bg-gray-50" />
              {!qrData && <span className="text-gray-400 mt-2">QR Code indisponível</span>}
              <div className="mt-3 flex flex-col items-center gap-2 text-sm text-gray-600">
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${badgeClassName}`}>{status}</span>
                {rawStatus && <span className="text-gray-400 text-xs">({rawStatus})</span>}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded shadow p-4 space-y-4">
          {sessionState === 'connected' ? (
            <div className="py-12 text-center text-sm text-gray-600 flex flex-col items-center gap-3">
              <p className="text-base font-medium text-emerald-600">Sessão conectada</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold">Código de pareamento</h2>
                <pre className="bg-gray-100 p-3 rounded min-h-[72px] text-sm">{pairingCode}</pre>
              </div>

              <form onSubmit={handlePairCode} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número para receber o código</label>
                  <input
                    ref={phoneRef}
                    className="border rounded px-3 py-2 w-full mt-1"
                    placeholder="Ex.: 5511987654321"
                  />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
                  Solicitar código
                </button>
              </form>

              <p className="text-sm text-gray-500">
                A sessão "default" deve estar no estado <strong>SCAN_QR_CODE</strong> para que o QR seja exibido.
                Após autenticar, o status muda para <strong>WORKING</strong> (Conectado).
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default WhatsAppSetup