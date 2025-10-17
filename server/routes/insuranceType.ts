import express from 'express';
import prisma from '../../src/lib/prisma';
import { authorizeAdmin } from '../middleware/auth';

const router = express.Router();

// Get all insurance types (ordenado por nome ascendente)
router.get('/', async (req, res) => {
  try {
    const { page, pageSize } = req.query;

    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, parseInt((page as string) || '1', 10));
      const size = Math.max(1, Math.min(100, parseInt((pageSize as string) || '20', 10)));
      const skip = (pageNum - 1) * size;

      const [items, total] = await Promise.all([
        prisma.insuranceType.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: size,
          include: {
            _count: {
              select: { policies: true }
            }
          }
        }),
        prisma.insuranceType.count()
      ]);

      return res.json({ items, total, page: pageNum, pageSize: size });
    }

    const types = await prisma.insuranceType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { policies: true }
        }
      }
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching insurance types:', error);
    res.status(500).json({ message: 'Error fetching insurance types' });
  }
});

  // GET - statistics: count of policies per type
  // Supports query params: top (number) to return top-N by count, or page & pageSize for pagination
  router.get('/stats', async (req, res) => {
    try {
      const { top, page, pageSize } = req.query;

      const typesWithCount = await prisma.insuranceType.findMany({
        include: { _count: { select: { policies: true } } }
      });

      const allItems = typesWithCount.map(t => ({ id: t.id, name: t.name, count: t._count?.policies || 0 }));

      if (page !== undefined || pageSize !== undefined) {
        const pageNum = Math.max(1, parseInt((page as string) || '1', 10));
        const size = Math.max(1, Math.min(200, parseInt((pageSize as string) || '20', 10)));
        const sorted = allItems.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const total = sorted.length;
        const paged = sorted.slice((pageNum - 1) * size, (pageNum - 1) * size + size);
        return res.json({ items: paged, total, page: pageNum, pageSize: size });
      }

      if (top !== undefined) {
        const t = Math.max(1, Math.min(200, parseInt((top as string) || '10', 10)));
        const sorted = allItems.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const items = sorted.slice(0, t);
        return res.json({ items });
      }

      const fallback = allItems.sort((a, b) => a.name.localeCompare(b.name));
      res.json({ items: fallback });
    } catch (error) {
      console.error('Error fetching type stats:', error);
      res.status(500).json({ message: 'Error fetching type stats' });
    }
  });

// GET - Buscar tipo de seguro por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const type = await prisma.insuranceType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { policies: true }
        }
      }
    });

    if (!type) {
      return res.status(404).json({ error: 'Tipo de seguro não encontrado' });
    }

    res.json(type);
  } catch (error) {
    console.error('Erro ao buscar tipo de seguro:', error);
    res.status(500).json({ error: 'Erro ao buscar tipo de seguro' });
  }
});

// Create a new insurance type
router.post('/', authorizeAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Verificar se já existe
    const existing = await prisma.insuranceType.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Tipo de seguro já existe' });
    }

    const type = await prisma.insuranceType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      },
    });

    res.status(201).json({
      message: 'Insurance type created successfully',
      type,
    });
  } catch (error) {
    console.error('Error creating insurance type:', error);
    res.status(500).json({ message: 'Error creating insurance type' });
  }
});

// Update insurance type
router.put('/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se existe
    const existing = await prisma.insuranceType.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Tipo de seguro não encontrado' });
    }

    // Verificar duplicação de nome
    const duplicate = await prisma.insuranceType.findFirst({
      where: {
        name: name.trim(),
        NOT: { id }
      }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Já existe outro tipo de seguro com este nome' });
    }

    const type = await prisma.insuranceType.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    res.json({
      message: 'Insurance type updated successfully',
      type,
    });
  } catch (error) {
    console.error('Error updating insurance type:', error);
    res.status(500).json({ message: 'Error updating insurance type' });
  }
});

// Delete insurance type
router.delete('/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tem apólices vinculadas
    const policiesCount = await prisma.policy.count({
      where: { insuranceTypeId: id }
    });

    if (policiesCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir tipo de seguro com apólices vinculadas'
      });
    }

    // Check if type is in use
    const policies = await prisma.policy.findFirst({
      where: { insuranceTypeId: id },
    });

    if (policies) {
      return res.status(400).json({
        message: 'Cannot delete insurance type that is in use by policies'
      });
    }

    await prisma.insuranceType.delete({
      where: { id },
    });

    res.json({ message: 'Insurance type deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance type:', error);
    res.status(500).json({ message: 'Error deleting insurance type' });
  }
});

export { router as insuranceTypeRouter };