import express from 'express';
import prisma from '../../src/lib/prisma';
import { authorizeAdmin } from '../middleware/auth';

const router = express.Router();

// Get all insurance providers (ordenado por nome ascendente)
router.get('/', async (req, res) => {
  try {
    const { page, pageSize } = req.query;

    // If pagination params provided, return paginated response
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, parseInt((page as string) || '1', 10));
      const size = Math.max(1, Math.min(100, parseInt((pageSize as string) || '20', 10)));
      const skip = (pageNum - 1) * size;

      const [items, total] = await Promise.all([
        prisma.insuranceProvider.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: size,
          include: {
            _count: {
              select: { policies: true }
            }
          }
        }),
        prisma.insuranceProvider.count()
      ]);

      return res.json({ items, total, page: pageNum, pageSize: size });
    }

    // Fallback: return full list ordered by name
    const providers = await prisma.insuranceProvider.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { policies: true }
        }
      }
    });
    res.json(providers);
  } catch (error) {
    console.error('Error fetching insurance providers:', error);
    res.status(500).json({ message: 'Error fetching insurance providers' });
  }
});

  // GET - statistics: count of policies per provider
  // Supports query params: top (number) to return top-N by count, or page & pageSize for pagination
  router.get('/stats', async (req, res) => {
    try {
      const { top, page, pageSize } = req.query;

      // Fetch all providers with counts, then sort/page in JS to avoid Prisma orderBy by relation count typing
      const providersWithCount = await prisma.insuranceProvider.findMany({
        include: { _count: { select: { policies: true } } }
      });

      // Build items with counts
      const allItems = providersWithCount.map(p => ({ id: p.id, name: p.name, count: p._count?.policies || 0 }));

      // If page or pageSize provided, return paginated response ordered by count desc
      if (page !== undefined || pageSize !== undefined) {
        const pageNum = Math.max(1, parseInt((page as string) || '1', 10));
        const size = Math.max(1, Math.min(200, parseInt((pageSize as string) || '20', 10)));
        const sorted = allItems.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const total = sorted.length;
        const paged = sorted.slice((pageNum - 1) * size, (pageNum - 1) * size + size);
        return res.json({ items: paged, total, page: pageNum, pageSize: size });
      }

      // If top provided, return top N ordered by count
      if (top !== undefined) {
        const t = Math.max(1, Math.min(200, parseInt((top as string) || '10', 10)));
        const sorted = allItems.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const items = sorted.slice(0, t);
        return res.json({ items });
      }

      // Fallback: return full list ordered by name including counts
      const fallback = allItems.sort((a, b) => a.name.localeCompare(b.name));
      res.json({ items: fallback });
    } catch (error) {
      console.error('Error fetching provider stats:', error);
      res.status(500).json({ message: 'Error fetching provider stats' });
    }
  });

// GET - Buscar seguradora por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: { policies: true }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Seguradora não encontrada' });
    }

    res.json(provider);
  } catch (error) {
    console.error('Erro ao buscar seguradora:', error);
    res.status(500).json({ error: 'Erro ao buscar seguradora' });
  }
});

// Create a new insurance provider
router.post('/', authorizeAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Verificar se já existe
    const existing = await prisma.insuranceProvider.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Seguradora já existe' });
    }

    const provider = await prisma.insuranceProvider.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      },
    });

    res.status(201).json({
      message: 'Insurance provider created successfully',
      provider,
    });
  } catch (error) {
    console.error('Error creating insurance provider:', error);
    res.status(500).json({ message: 'Error creating insurance provider' });
  }
});

// Update insurance provider
router.put('/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se existe
    const existing = await prisma.insuranceProvider.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Seguradora não encontrada' });
    }

    // Verificar duplicação de nome
    const duplicate = await prisma.insuranceProvider.findFirst({
      where: {
        name: name.trim(),
        NOT: { id }
      }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Já existe outra seguradora com este nome' });
    }

    const provider = await prisma.insuranceProvider.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    res.json({
      message: 'Insurance provider updated successfully',
      provider,
    });
  } catch (error) {
    console.error('Error updating insurance provider:', error);
    res.status(500).json({ message: 'Error updating insurance provider' });
  }
});

// Delete insurance provider
router.delete('/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tem apólices vinculadas
    const policiesCount = await prisma.policy.count({
      where: { insuranceProviderId: id }
    });

    if (policiesCount > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir seguradora com apólices vinculadas' 
      });
    }

    // Check if provider is in use
    const policies = await prisma.policy.findFirst({
      where: { insuranceProviderId: id },
    });

    if (policies) {
      return res.status(400).json({
        message: 'Cannot delete insurance provider that is in use by policies'
      });
    }

    await prisma.insuranceProvider.delete({
      where: { id },
    });

    res.json({ message: 'Insurance provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance provider:', error);
    res.status(500).json({ message: 'Error deleting insurance provider' });
  }
});

export { router as insuranceProviderRouter };