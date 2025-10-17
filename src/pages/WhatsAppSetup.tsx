import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

const WhatsAppSetup: React.FC = () => {
  const [token, setToken] = useState<string>(() => localStorage.getItem('uiToken') || '')
  const [connectMsg, setConnectMsg] = useState<string>('')
  const [connStatus, setConnStatus] = useState<string>('-')
  const [pairingCode, setPairingCode] = useState<string>('-')
  const [qrData, setQrData] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>('')
  const [loadingConnect, setLoadingConnect] = useState<boolean>(false)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pollRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState<boolean>(false)

  // Fetch status from server
  async function fetchStatus() {
    try {
      const baileysToken = localStorage.getItem('uiToken')
      const jwtToken = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (jwtToken) headers['Authorization'] = 'Bearer ' + jwtToken
      if (baileysToken) headers['x-baileys-token'] = baileysToken
      const res = await fetch('/status', { headers: Object.keys(headers).length ? headers : undefined })
      const j = await res.json()
      const connectionStatus = j.connection?.connection || '-'
      setConnStatus(connectionStatus)
      if (String(connectionStatus).toLowerCase() === 'open') {
        setIsOpen(true)
        // stop polling
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }
      setPairingCode(j.pairingCode || '-')
      if (j.qr) {
        setQrData(j.qr)
      } else {
        setQrData(null)
      }
    } catch (e) {
      setConnStatus('error')
    }
  }

  // Poll every 1s until connection opens
  useEffect(() => {
    fetchStatus()
    if (!isOpen) {
      const id = setInterval(fetchStatus, 1000)
      // store numeric id
      // window.setInterval returns number in browsers
      pollRef.current = id as unknown as number
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    // if already open, no polling
    return
  }, [isOpen])

  // Render QR when qrData changes
  useEffect(() => {
    if (!qrData) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    QRCode.toCanvas(canvas, qrData, { width: 300, margin: 1 }).catch((err) => {
      console.error('qr error', err)
    })
  }, [qrData])

  function saveToken() {
    const t = String(token || '').trim()
    if (!t) return alert('enter token')
    localStorage.setItem('uiToken', t)
    setToken(t)
    alert('token saved')
  }

  async function handleConnect() {
    setConnectMsg('')
    setLoadingConnect(true)
    try {
      const baileysToken = localStorage.getItem('uiToken')
      const jwtToken = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (jwtToken) headers['Authorization'] = 'Bearer ' + jwtToken
      if (baileysToken) headers['x-baileys-token'] = baileysToken
      const res = await fetch('/connect', { method: 'POST', headers })
      const j = await res.json()
      if (res.ok) {
        setConnectMsg(j.message || 'Conectando...')
      } else {
        setConnectMsg(j.error || 'erro')
      }
    } catch (e) {
      setConnectMsg('network error')
    } finally {
      setLoadingConnect(false)
    }
  }

  async function handlePair(ev?: React.FormEvent) {
    ev?.preventDefault()
    setMsg('')
    const phone = phoneRef.current?.value.trim() || ''
    if (!phone) {
      setMsg('enter phone')
      return
    }
    try {
      const baileysToken = localStorage.getItem('uiToken')
      const jwtToken = localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (jwtToken) headers['Authorization'] = 'Bearer ' + jwtToken
      if (baileysToken) headers['x-baileys-token'] = baileysToken
      const res = await fetch('/pair-code', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone }),
      })
      const j = await res.json()
      if (res.ok) {
        setMsg('Pairing code requested. Check the displayed code.')
      } else {
        setMsg(j.error || 'error')
      }
    } catch (err) {
      setMsg('network error')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">WhatsApp Connector</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="flex items-center gap-3">
          <span className="text-sm">Token:</span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="paste admin token"
            className="border rounded px-3 py-2 w-72"
          />
        </label>
        <button onClick={saveToken} className="bg-sky-600 text-white px-4 py-2 rounded">Salvar Token</button>
        <button onClick={handleConnect} disabled={loadingConnect} className="bg-emerald-600 text-white px-4 py-2 rounded">
          {loadingConnect ? 'Conectando...' : 'Conectar WhatsApp'}
        </button>
        <span className="ml-2 text-sm text-green-600">{connectMsg}</span>
      </div>

      <div className="flex gap-8 items-start">
        <div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <canvas ref={canvasRef} width={300} height={300} className="bg-gray-50" />
            {!qrData && <div className="text-gray-400 mt-2">QR not available</div>}
            <div className="mt-3 text-sm text-gray-600">connection: {connStatus}</div>
          </div>
        </div>

        <div className="w-80">
          <div className="mb-2"><strong>Pairing code:</strong></div>
          <pre className="bg-gray-100 p-3 rounded min-h-[72px]">{pairingCode}</pre>

          <form onSubmit={handlePair} className="mt-4">
            <label className="block text-sm">Phone (for pairing code)</label>
            <input ref={phoneRef} className="border rounded px-3 py-2 w-full mt-1" placeholder="+55119XXXXYYYY" />
            <div className="mt-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Request Pairing Code</button>
            </div>
          </form>

          <div className="text-green-600 mt-3">{msg}</div>
        </div>
      </div>
    </div>
  )
}

export default WhatsAppSetup