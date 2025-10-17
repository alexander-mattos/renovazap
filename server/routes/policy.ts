import express from 'express';
import prisma from '../../src/lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractPolicyData } from '../services/policyExtractor';
import { scheduleNotifications } from '../services/notificationService';

const router = express.Router();

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'server/uploads');
    ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Novo endpoint: apenas extrai dados do PDF e retorna ao frontend
router.post('/extract', upload.single('policyDocument'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Arquivo PDF é obrigatório' });
    }
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const data = await extractPolicyData(fileBuffer);
    res.status(200).json({ success: true, extracted: data, filePath });
  } catch (error) {
    console.error('Erro na extração da apólice:', error);
    res.status(500).json({ success: false, message: 'Erro ao extrair dados da apólice', error });
  }
});

// Endpoint para gravação final da apólice (após conferência/edição)
router.post('/', async (req: any, res) => {
  try {
    const { policyNumber, policyholderName, policyholderPhone, policyholderEmail, startDate, endDate, premium, coverageDetails, assetType, assetDetails, documentPath, insuranceTypeId, insuranceProviderId } = req.body;
    // Pegar primeiro usuário se não tiver autenticação
    let userId = req.user?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser && firstUser.id) {
        userId = firstUser.id;
      } else {
        return res.status(401).json({ message: 'Nenhum usuário encontrado no banco de dados.' });
      }
    }
    if (!insuranceProviderId || !insuranceTypeId) {
      return res.status(400).json({ success: false, message: 'Seguradora e tipo são obrigatórios' });
    }
    if (!policyNumber) {
      return res.status(400).json({ success: false, message: 'Número da apólice é obrigatório' });
    }
    // Cria apólice no banco
    const policy = await prisma.policy.create({
      data: {
        policyNumber: policyNumber || '',
        policyholderName: policyholderName || '',
        policyholderPhone: policyholderPhone || '',
        policyholderEmail: policyholderEmail || '',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        premium: premium ? parseFloat(premium) : 0,
        coverageDetails: coverageDetails || '',
        assetType: assetType || '',
        assetDetails: assetDetails || '',
        documentPath: documentPath || '',
        insuranceType: { connect: { id: insuranceTypeId } },
        insuranceProvider: { connect: { id: insuranceProviderId } },
        user: { connect: { id: userId } },
      },
      include: {
        insuranceType: true,
        insuranceProvider: true,
      }
    });

    // 3. Agendar notificações
    await scheduleNotifications(policy.id);

    res.status(201).json({
      success: true,
      message: 'Apólice criada com sucesso',
      policy,
    });
  } catch (error) {
    console.error('Erro ao processar apólice:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar apólice', error });
  }
});


// GET - List all policies
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { page, pageSize, search, type, provider, status, sortBy, sortDir } = req.query;

    const where: any = userId ? { userId } : {};

    // Filtering
    if (search && typeof search === 'string') {
      where.OR = [
        { policyholderName: { contains: search, mode: 'insensitive' } },
        { policyNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type && typeof type === 'string') {
      where.insuranceTypeId = type;
    }

    if (provider && typeof provider === 'string') {
      where.insuranceProviderId = provider;
    }

    // status: active / expired / expiring
    if (status && typeof status === 'string') {
      const today = new Date();
      if (status === 'active') {
        where.endDate = { gt: today };
      } else if (status === 'expired') {
        where.endDate = { lt: today };
      } else if (status === 'expiring') {
        const ten = new Date();
        ten.setDate(ten.getDate() + 10);
        where.endDate = { gt: today, lte: ten };
      }
    }

    // Sorting
    const orderBy: any = {};
    if (sortBy && typeof sortBy === 'string') {
      const dir = sortDir === 'desc' ? 'desc' : 'asc';
      // Allow known fields only
      if (['endDate', 'startDate', 'premium', 'policyholderName', 'policyNumber'].includes(sortBy)) {
        orderBy[sortBy] = dir;
      } else if (sortBy === 'insuranceType') {
        orderBy['insuranceType'] = { name: dir };
      } else if (sortBy === 'insuranceProvider') {
        orderBy['insuranceProvider'] = { name: dir };
      } else {
        orderBy.endDate = 'desc';
      }
    } else {
      orderBy.endDate = 'desc';
    }

    // If pagination params are present, return paginated shape
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, parseInt((page as string) || '1', 10));
      const size = Math.max(1, Math.min(200, parseInt((pageSize as string) || '20', 10)));
      const skip = (pageNum - 1) * size;

      const [items, total] = await Promise.all([
        prisma.policy.findMany({
          where,
          include: {
            insuranceType: true,
            insuranceProvider: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy,
          skip,
          take: size
        }),
        prisma.policy.count({ where })
      ]);

      return res.json({ items, total, page: pageNum, pageSize: size });
    }

    // Fallback: return full list
    const policies = await prisma.policy.findMany({
      where,
      include: {
        insuranceType: true,
        insuranceProvider: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        endDate: 'desc',
      }
    });

    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ message: 'Error fetching policies' });
  }
});

// PUT - Update policy
router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    // Build sanitized update object
    const {
      policyNumber,
      policyholderName,
      policyholderPhone,
      policyholderEmail,
      startDate,
      endDate,
      premium,
      coverageDetails,
      assetType,
      assetDetails,
      documentPath,
      insuranceProviderId,
      insuranceTypeId,
    } = req.body || {};

    const updateData: any = {};
    if (policyNumber !== undefined) updateData.policyNumber = policyNumber;
    if (policyholderName !== undefined) updateData.policyholderName = policyholderName;
    if (policyholderPhone !== undefined) updateData.policyholderPhone = policyholderPhone;
    if (policyholderEmail !== undefined) updateData.policyholderEmail = policyholderEmail;
    if (startDate) {
      const sd = new Date(startDate);
      updateData.startDate = isNaN(sd.getTime()) ? undefined : sd;
    }
    if (endDate) {
      const ed = new Date(endDate);
      updateData.endDate = isNaN(ed.getTime()) ? undefined : ed;
    }
    if (premium !== undefined) updateData.premium = parseFloat(premium) || 0;
    if (coverageDetails !== undefined) updateData.coverageDetails = coverageDetails;
    if (assetType !== undefined) updateData.assetType = assetType;
    if (assetDetails !== undefined) updateData.assetDetails = assetDetails;
    if (documentPath !== undefined) updateData.documentPath = documentPath;
    if (insuranceTypeId) updateData.insuranceType = { connect: { id: insuranceTypeId } };
    if (insuranceProviderId) updateData.insuranceProvider = { connect: { id: insuranceProviderId } };

    const policy = await prisma.policy.update({
      where: { id },
      data: updateData,
      include: {
        insuranceType: true,
        insuranceProvider: true,
      }
    });

    res.json({
      message: 'Policy updated successfully',
      policy,
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ message: 'Error updating policy' });
  }
});

// PUT - Mark/unmark renewal for a policy
router.put('/:id/renew', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { renewed, renewalDate } = req.body || {};

    if (typeof renewed !== 'boolean') {
      return res.status(400).json({ message: 'Field "renewed" must be boolean' });
    }

    // When marking as renewed: set renewalDate (from body or now) and remove pending notifications and their logs
    if (renewed) {
      const date = renewalDate ? new Date(renewalDate) : new Date();

      // Find pending notifications for this policy
      const pending = await prisma.notification.findMany({ where: { policyId: id, status: 'pending' }, select: { id: true } });
      const pendingIds = pending.map((p) => p.id);

      await prisma.$transaction(async (tx) => {
        if (pendingIds.length > 0) {
          // Delete message logs for those notifications first
          await tx.messageLog.deleteMany({ where: { notificationId: { in: pendingIds } } });
          // Delete the pending notifications
          await tx.notification.deleteMany({ where: { id: { in: pendingIds } } });
        }

        // Update policy
        await tx.policy.update({ where: { id }, data: { renewed: true, renewalDate: date } });
      });

      const policy = await prisma.policy.findUnique({ where: { id } });
      return res.json({ message: 'Policy marked as renewed; pending notifications removed', policy });
    }

    // If unmarking renewal, simply clear the flags
    const policy = await prisma.policy.update({ where: { id }, data: { renewed: false, renewalDate: null } });
    res.json({ message: 'Policy renewal removed', policy });
  } catch (error) {
    console.error('Error updating policy renewal:', error);
    res.status(500).json({ message: 'Error updating policy renewal' });
  }
});

// GET - Renewal rate (percentage)
router.get('/_stats/renewal-rate', async (req: any, res) => {
  try {
    // Compute start and end of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setMilliseconds(endOfMonth.getMilliseconds() - 1);

    const where: any = {
      endDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [total, renewedCount] = await Promise.all([
      prisma.policy.count({ where }),
      prisma.policy.count({ where: { ...where, renewed: true } }),
    ]);

    const rate = total === 0 ? 0 : Math.round((renewedCount / total) * 100);

    res.json({ total, renewedCount, renewalRate: rate, month: startOfMonth.toISOString().slice(0,7) });
  } catch (error) {
    console.error('Error computing renewal rate:', error);
    res.status(500).json({ message: 'Error computing renewal rate' });
  }
});

// GET - Get single policy
router.get('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        insuranceType: true,
        insuranceProvider: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notifications: true,
      },
    });

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ message: 'Error fetching policy' });
  }
});

// DELETE - Delete policy
router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    const policy = await prisma.policy.findUnique({
      where: { id },
    });

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    // Delete notifications first
    await prisma.notification.deleteMany({
      where: { policyId: id },
    });

    // Delete policy
    await prisma.policy.delete({
      where: { id },
    });

    // Delete file if exists
    if (policy.documentPath && fs.existsSync(policy.documentPath)) {
      fs.unlinkSync(policy.documentPath);
    }

    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ message: 'Error deleting policy' });
  }
});

// GET - Expiring policies
router.get('/expiring/:days', async (req: any, res) => {
  try {
    const days = parseInt(req.params.days);
    const userId = req.user?.id;
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + days);

    const policies = await prisma.policy.findMany({
      where: {
        ...(userId && { userId }),
        endDate: {
          gte: today,
          lte: targetDate,
        },
      },
      include: {
        insuranceType: true,
        insuranceProvider: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        endDate: 'asc'
      }
    });

    res.json(policies);
  } catch (error) {
    console.error('Error fetching expiring policies:', error);
    res.status(500).json({ message: 'Error fetching expiring policies' });
  }
});

export { router as policyRouter };