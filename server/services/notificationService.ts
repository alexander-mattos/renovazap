import prisma from '../../src/lib/prisma';
import { sendWhatsAppMessage } from './whatsappService';
import { forwardSend } from '../routes/baileysProxy';
import { NotificationData } from '../../src/types';

// Helper to persist a MessageLog
async function logMessageAttempt(notificationId: string, status: string, details?: string) {
  try {
    await prisma.messageLog.create({
      data: {
        notificationId,
        status,
        details,
      }
    });
  } catch (err) {
    console.error('Error writing MessageLog:', err);
  }
}

// Schedule notifications for a policy
export const scheduleNotifications = async (policyId: string): Promise<void> => {
  try {
    console.log('📅 Agendando notificações para apólice:', policyId);

    // Buscar a apólice com todos os dados necessários
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        insuranceType: true,
        insuranceProvider: true,
        user: true,
      },
    });

    if (!policy) {
      throw new Error('Apólice não encontrada');
    }

    // Buscar templates de mensagem ativos
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { daysBeforeExpiry: 'desc' }
    });

    if (templates.length === 0) {
      console.log('⚠️ Nenhum template de mensagem encontrado. Criando templates padrão...');
      await createDefaultTemplates();
      // Buscar novamente após criar
      const newTemplates = await prisma.messageTemplate.findMany({
        orderBy: { daysBeforeExpiry: 'desc' }
      });
      templates.push(...newTemplates);
    }

    // Deletar notificações antigas pendentes para esta apólice (se houver)
    await prisma.notification.deleteMany({
      where: {
        policyId: policy.id,
        status: 'pending'
      }
    });

    // Criar notificações baseadas nos templates
    const notifications: NotificationData[] = [];
    const endDate = new Date(policy.endDate);
    const today = new Date();

    console.log(`📆 Data de vencimento da apólice: ${endDate.toLocaleDateString('pt-BR')}`);

    for (const template of templates) {
      // Calcular data de envio (X dias antes do vencimento)
      const scheduledDate = new Date(endDate);
      scheduledDate.setDate(scheduledDate.getDate() - template.daysBeforeExpiry);
      scheduledDate.setHours(9, 0, 0, 0); // Enviar às 9h da manhã

      // Só criar notificação se a data for futura
      if (scheduledDate > today) {
        // Substituir variáveis no template
        let message = template.content;

        // Variáveis disponíveis para substituição
        const variables = {
          '{{nome}}': policy.policyholderName,
          '{{numero}}': policy.policyNumber,
          '{{tipo}}': policy.insuranceType.name,
          '{{data}}': endDate.toLocaleDateString('pt-BR'),
          '{{seguradora}}': policy.insuranceProvider.name,
          '{{valor}}': `R$ ${policy.premium.toFixed(2).replace('.', ',')}`,
          '{{premio}}': `R$ ${policy.premium.toFixed(2).replace('.', ',')}`,
          '{{bem}}': policy.assetType || 'Bem segurado',
          '{{detalhes}}': policy.assetDetails || '',
          '{{dias}}': template.daysBeforeExpiry.toString(),
          '{{telefone}}': policy.policyholderPhone || '',
          '{{email}}': policy.policyholderEmail || policy.user.email
        };

        // Substituir todas as variáveis
        for (const [key, value] of Object.entries(variables)) {
          message = message.replace(new RegExp(key, 'g'), value);
        }

        notifications.push({
          policyId: policy.id,
          message: message,
          scheduledFor: scheduledDate,
          status: 'pending'
        });

        console.log(`📧 Notificação agendada para ${scheduledDate.toLocaleDateString('pt-BR')}: ${template.name}`);
      } else {
        console.log(`⏭️ Pulando notificação '${template.name}' - data já passou`);
      }
    }

    // Criar notificações no banco
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });

      console.log(`✅ ${notifications.length} notificações agendadas para a apólice ${policy.policyNumber}`);
    } else {
      console.log(`⚠️ Nenhuma notificação para agendar - apólice pode estar próxima do vencimento`);
    }

    // Verificar se há notificações que devem ser enviadas imediatamente
    await checkAndSendImmediateNotifications(policy.id);

  } catch (error) {
    console.error('❌ Erro ao agendar notificações:', error);
    throw error;
  }
}

// Função para criar templates padrão se não existirem
async function createDefaultTemplates() {
  const defaultTemplates = [
    {
      name: 'Primeiro Aviso - 60 dias',
      content: '🔔 Olá {{nome}}! Este é um lembrete de que sua apólice {{numero}} de {{tipo}} vence em {{dias}} dias ({{data}}). Entre em contato para renovar e manter sua proteção! 📞',
      daysBeforeExpiry: 60
    },
    {
      name: 'Lembrete - 30 dias',
      content: '⏰ Atenção {{nome}}! Sua apólice {{numero}} do(a) {{seguradora}} vence em 30 dias ({{data}}). Não deixe para última hora! Renove agora e evite ficar desprotegido. 💰 Valor: {{valor}}',
      daysBeforeExpiry: 30
    },
    {
      name: 'Aviso Importante - 15 dias',
      content: '🚨 IMPORTANTE {{nome}}! Faltam apenas 15 dias para o vencimento da sua apólice {{numero}}. {{tipo}} - {{bem}}. Entre em contato urgente para renovar! ⏱️',
      daysBeforeExpiry: 15
    },
    {
      name: 'Urgente - 7 dias',
      content: '🆘 URGENTE {{nome}}! Sua apólice {{numero}} vence em apenas 7 DIAS! Não fique sem proteção. Renove AGORA sua apólice de {{tipo}} da {{seguradora}}! 📱',
      daysBeforeExpiry: 7
    },
    {
      name: 'Último Aviso - 1 dia',
      content: '🚨🚨 ÚLTIMO AVISO {{nome}}! Sua apólice {{numero}} vence AMANHÃ ({{data}})! Esta é sua última chance de renovar sem ficar desprotegido. LIGUE AGORA! 📞🚨🚨',
      daysBeforeExpiry: 1
    }
  ];

  for (const template of defaultTemplates) {
    await prisma.messageTemplate.create({
      data: template
    });
  }

  console.log('✅ Templates padrão criados com sucesso');
}

// Função para verificar e enviar notificações imediatas
async function checkAndSendImmediateNotifications(policyId: string) {
  const now = new Date();
  const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos no futuro

  const immediateNotifications = await prisma.notification.findMany({
    where: {
      policyId: policyId,
      status: 'pending',
      scheduledFor: {
        lte: in5Minutes
      }
    },
    include: {
      policy: {
        include: {
          user: true
        }
      }
    }
  });

  if (immediateNotifications.length > 0) {
    console.log(`📨 Encontradas ${immediateNotifications.length} notificações para envio imediato`);
    for (const notification of immediateNotifications) {
      await sendNotification(notification);
    }
  }
}

// Função para enviar notificações pendentes (chamada pelo cron)
export async function sendPendingNotifications(): Promise<void> {
  try {
    console.log('🔍 Verificando notificações pendentes...');

    const now = new Date();
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now
        }
      },
      include: {
        policy: {
          include: {
            user: true,
            insuranceType: true,
            insuranceProvider: true
          }
        }
      }
    });

    console.log(`📬 ${pendingNotifications.length} notificações pendentes encontradas`);

    for (const notification of pendingNotifications) {
      await sendNotification(notification);
      // Aguardar um pouco entre envios para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Erro ao processar notificações pendentes:', error);
    throw error;
  }
}

// Função para enviar uma notificação individual
async function sendNotification(notification: any): Promise<void> {
  try {
    console.log(`📤 Enviando notificação ${notification.id} para ${notification.policy.user.name}`);

    // Determinar número de telefone
    let phoneNumber = notification.policy.policyholderPhone || notification.policy.user.phone;

    if (!phoneNumber) {
      console.error(`❌ Telefone não encontrado para notificação ${notification.id}`);
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'failed',
          sentAt: new Date()
        }
      });
      return;
    }

    // Formatar número para WhatsApp (adicionar código do país se necessário)
    phoneNumber = formatPhoneForWhatsApp(phoneNumber);

  // Enviar mensagem via WhatsApp socket local
  // Use uma sessão conectada do DB (se existir) em vez de depender de notification.session
  const activeSession = await prisma.whatsAppSession.findFirst({ where: { status: 'connected' } });
  const sent = activeSession ? await sendWhatsAppMessage(activeSession.id, phoneNumber, notification.message) : false;

    if (sent) {
      // Marcar como enviada
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      });

      // Log success
      await logMessageAttempt(notification.id, 'sent', 'Sent via WhatsApp socket');

      console.log(`✅ Notificação ${notification.id} enviada com sucesso`);
    } else {
      // Local socket failed — tentar fallback via proxy (external Baileys API)
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber.replace(/[^\d]/g, '')}@s.whatsapp.net`;
      const body = { jid, message: notification.message };
      const baileyToken = process.env.BAILEYS_TOKEN;

      // Try with retries/backoff
      const maxAttempts = 3;
      let attempt = 0;
      let proxySuccess = false;
      let lastError: any = null;

      while (attempt < maxAttempts && !proxySuccess) {
        attempt++;
        try {
          const tokenHeader = baileyToken ? (baileyToken.startsWith('Bearer ') ? baileyToken : `Bearer ${baileyToken}`) : undefined;
          const r = await forwardSend(body, tokenHeader, 20000 + attempt * 2000);
          // consider success when external API returns 200 and ok:true or status 200
          if (r && (r.status === 200 || r.status === 201)) {
            proxySuccess = true;
            await prisma.notification.update({ where: { id: notification.id }, data: { status: 'sent', sentAt: new Date() } });
            await logMessageAttempt(notification.id, 'sent', `Sent via proxy on attempt ${attempt}: ${JSON.stringify(r.data).slice(0,200)}`);
            console.log(`✅ Notificação ${notification.id} enviada via proxy (attempt ${attempt})`);
            break;
          } else {
            lastError = r && r.data ? r.data : `Unexpected response status ${r?.status}`;
            await logMessageAttempt(notification.id, 'failed', `Proxy attempt ${attempt} returned ${r?.status}`);
          }
        } catch (err: any) {
          lastError = err;
          console.error(`Proxy send attempt ${attempt} error:`, err?.message || err);
          await logMessageAttempt(notification.id, 'failed', `Proxy attempt ${attempt} error: ${err?.message || JSON.stringify(err)}`);
        }

        // backoff
        if (!proxySuccess && attempt < maxAttempts) {
          const waitMs = 1000 * attempt;
          await new Promise(res => setTimeout(res, waitMs));
        }
      }

      if (!proxySuccess) {
        // Mark as failed after retries
        await prisma.notification.update({ where: { id: notification.id }, data: { status: 'failed', sentAt: new Date() } });
        await logMessageAttempt(notification.id, 'failed', `All proxy attempts failed. Last error: ${String(lastError)}`);
        console.error(`❌ Falha ao enviar notificação ${notification.id} após ${maxAttempts} tentativas.`, lastError);
      }
    }

  } catch (error) {
    console.error(`❌ Erro ao enviar notificação ${notification.id}:`, error);

    // Marcar como falha
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'failed',
        sentAt: new Date()
      }
    });
  }
}

// Função para formatar número de telefone para WhatsApp
function formatPhoneForWhatsApp(phone: string): string {
  // Remover todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');

  // Se não tem código do país, adicionar 55 (Brasil)
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  // Se tem 12 ou 13 dígitos (com código do país), está ok
  if (cleaned.length === 12 || cleaned.length === 13) {
    return cleaned;
  }

  // Se chegou aqui, há algo errado com o número
  console.warn(`⚠️ Número de telefone em formato inválido: ${phone}`);
  return cleaned;
}

// Função para reagendar notificações (quando apólice é atualizada)
export async function rescheduleNotifications(policyId: string): Promise<void> {
  try {
    console.log('🔄 Reagendando notificações para apólice:', policyId);

    // Deletar notificações pendentes existentes
    const deleted = await prisma.notification.deleteMany({
      where: {
        policyId: policyId,
        status: 'pending'
      }
    });

    console.log(`🗑️ ${deleted.count} notificações pendentes removidas`);

    // Reagendar novas notificações
    await scheduleNotifications(policyId);

  } catch (error) {
    console.error('❌ Erro ao reagendar notificações:', error);
    throw error;
  }
}

// Função para obter histórico de notificações
export async function getNotificationHistory(policyId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
      include: {
        policy: {
          select: {
            policyNumber: true,
            policyholderName: true
          }
        }
      }
    });

    return notifications;
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de notificações:', error);
    throw error;
  }
}

// Função para obter estatísticas de notificações
export async function getNotificationStats() {
  try {
    const [total, pending, sent, failed] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'pending' } }),
      prisma.notification.count({ where: { status: 'sent' } }),
      prisma.notification.count({ where: { status: 'failed' } })
    ]);

    return {
      total,
      pending,
      sent,
      failed,
      successRate: total > 0 ? (sent / total * 100).toFixed(2) + '%' : '0%'
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    throw error;
  }
}

// Função para reenviar notificação falha
export async function resendFailedNotification(notificationId: string): Promise<void> {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        policy: {
          include: {
            user: true
          }
        }
      }
    });

    if (!notification) {
      throw new Error('Notificação não encontrada');
    }

    if (notification.status !== 'failed') {
      throw new Error('Apenas notificações com falha podem ser reenviadas');
    }

    // Resetar status para pendente
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'pending',
        sentAt: null
      }
    });

    // Tentar enviar novamente
    await sendNotification(notification);

  } catch (error) {
    console.error('❌ Erro ao reenviar notificação:', error);
    throw error;
  }
}

// Send a notification immediately (regardless of current status)
export async function sendNotificationNow(notificationId: string): Promise<void> {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        policy: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!notification) throw new Error('Notificação não encontrada');

    // Call internal sendNotification which expects the notification object with policy.user
    await sendNotification(notification as any);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação agora:', error);
    throw error;
  }
}

// Process pending notifications
export const processPendingNotifications = async (): Promise<void> => {
  try {
    // Get active WhatsApp session
    const session = await prisma.whatsAppSession.findFirst({
      where: { status: 'connected' },
    });

    // Get notifications scheduled for today or earlier
    const now = new Date();
    const notifications = await prisma.notification.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        policy: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`Processing ${notifications.length} pending notifications`);

    for (const notification of notifications) {
      try {
        // Determine phone number (prefer policyholderPhone, otherwise derive from user's email)
        let phoneNumber = notification.policy.policyholderPhone || (notification.policy.user.email ? (notification.policy.user.email.replace('@', '').replace(/\./g, '') + '@c.us') : '');

        // Format JID for WhatsApp
        const jid = phoneNumber.includes('@') ? phoneNumber : `${formatPhoneForWhatsApp(phoneNumber)}@s.whatsapp.net`;

        let success = false;

        if (session) {
          // Send using local socket
          success = await sendWhatsAppMessage(session.id, jid, notification.message);
        } else {
          // Fallback: send via the server proxy helper
          const BAILEYS_TOKEN = process.env.BAILEYS_TOKEN;

          if (!BAILEYS_TOKEN) {
            console.warn('No BAILEYS_TOKEN provided; cannot send via external API');
            success = false;
          } else {
            const body = { jid, message: notification.message };
            const tokenHeader = BAILEYS_TOKEN.startsWith('Bearer ') ? BAILEYS_TOKEN : `Bearer ${BAILEYS_TOKEN}`;

            // Retry loop with exponential/backoff delays
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              try {
                const timeoutMs = attempt === 1 ? 20000 : 30000; // longer timeout for retries
                const res = await forwardSend(body, tokenHeader, timeoutMs);
                success = res.status >= 200 && res.status < 300;
                await logMessageAttempt(notification.id, success ? 'sent' : 'failed', `External API status ${res.status} - ${JSON.stringify(res.data)}`);
                if (success) break;
              } catch (err: any) {
                const respBody = err?.response?.data ? JSON.stringify(err.response.data) : undefined;
                console.error(`Attempt ${attempt} - Error calling external Baileys proxy helper:`, err?.message || err, respBody ? `response: ${respBody}` : '');
                await logMessageAttempt(notification.id, 'failed', `Attempt ${attempt} - External API error: ${err?.message || String(err)} ${respBody ? ' - response: ' + respBody : ''}`);
                success = false;
                if (attempt < maxAttempts) {
                  const backoff = attempt * 1500;
                  await new Promise(r => setTimeout(r, backoff));
                }
              }
            }
          }
        }

        // Update notification status
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: success ? 'sent' : 'failed',
            sentAt: success ? now : undefined,
          },
        });

        // If sent using socket, log that as well
        if (session && success) {
          await logMessageAttempt(notification.id, 'sent', 'Sent via WhatsApp socket');
        } else if (session && !success) {
          await logMessageAttempt(notification.id, 'failed', 'sendWhatsAppMessage returned false');
        }

        // Avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error sending notification ${notification.id}:`, error);

        // Mark as failed
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'failed',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  }
};

  // Testable variant that accepts a sender function (useful for E2E tests without real WhatsApp)
  export const processPendingNotificationsWithSender = async (sender: (sessionId: string, phone: string, message: string) => Promise<boolean>): Promise<void> => {
    try {
      // Get active WhatsApp session
      const session = await prisma.whatsAppSession.findFirst({
        where: { status: 'connected' },
      });

      if (!session) {
        console.log('No active WhatsApp session found for sending notifications');
        return;
      }

      // Get notifications scheduled for today or earlier
      const now = new Date();
      const notifications = await prisma.notification.findMany({
        where: {
          status: 'pending',
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          policy: {
            include: {
              user: true,
            },
          },
        },
      });

      console.log(`Processing ${notifications.length} pending notifications (test sender)`);

      for (const notification of notifications) {
        try {
          const phoneNumber = notification.policy.user.email.replace('@', '').replace(/\./g, '') + '@c.us';

          const success = await sender(session.id, phoneNumber, notification.message);

          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: success ? 'sent' : 'failed',
              sentAt: success ? now : undefined,
            },
          });

          // Log attempt
          await logMessageAttempt(notification.id, success ? 'sent' : 'failed', success ? 'stubbed sender' : 'stubbed sender failed');

          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error sending notification ${notification.id}:`, error);
          await prisma.notification.update({ where: { id: notification.id }, data: { status: 'failed' } });
        }
      }
    } catch (error) {
      console.error('Error processing notifications (with sender):', error);
      throw error;
    }
  };

  // List notifications (optionally filter by status or policyId).
  // If paging is provided, returns { items, total, page, pageSize }
  export async function listNotifications(
    filter?: { status?: string; policyId?: string },
    paging?: { page?: number | undefined; pageSize?: number | undefined }
  ) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.policyId) where.policyId = filter.policyId;

    // If paging provided, return paginated result
    if (paging?.page !== undefined || paging?.pageSize !== undefined) {
      const page = paging?.page && paging.page > 0 ? paging.page : 1;
      const pageSize = paging?.pageSize && paging.pageSize > 0 ? paging.pageSize : 20;
      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { scheduledFor: 'asc' }, skip, take: pageSize, include: { policy: { select: { policyNumber: true, policyholderName: true } } } }),
        prisma.notification.count({ where })
      ]);

      return { items, total, page, pageSize };
    }

    // Fallback: return full list ordered by scheduledFor
    return prisma.notification.findMany({ where, orderBy: { scheduledFor: 'asc' }, include: { policy: { select: { policyNumber: true, policyholderName: true } } } });
  }

  // Update notification
  export async function updateNotification(id: string, data: any) {
    // allow updating message, scheduledFor, status
    const updateData: any = {};
    if (data.message !== undefined) updateData.message = data.message;
    if (data.scheduledFor !== undefined) updateData.scheduledFor = new Date(data.scheduledFor);
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.notification.update({ where: { id }, data: updateData });
  }

  // Delete notification
  export async function deleteNotification(id: string) {
    return prisma.notification.delete({ where: { id } });
  }