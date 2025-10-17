import express from 'express';
import prisma from '../../src/lib/prisma';
import { authorizeAdmin } from '../middleware/auth';

const router = express.Router();

// Get all message templates
router.get('/', async (req, res) => {
    try {
        const templates = await prisma.messageTemplate.findMany();
        res.json(templates);
    } catch (error) {
        console.error('Error fetching message templates:', error);
        res.status(500).json({ message: 'Error fetching message templates' });
    }
});

// GET - Buscar modelo de mensagem por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const template = await prisma.messageTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return res.status(404).json({ error: 'Modelo de mensagem não encontrado' });
        }

        res.json(template);
    } catch (error) {
        console.error('Erro ao buscar modelo de mensagem:', error);
        res.status(500).json({ error: 'Erro ao buscar modelo de mensagem' });
    }
});

// Create a new message template
router.post('/', authorizeAdmin, async (req, res) => {
    try {
        const { name, content } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Verificar se já existe
        const existing = await prisma.messageTemplate.findFirst({
            where: { name: name.trim() }
        });

        if (existing) {
            return res.status(400).json({ error: 'Modelo de mensagem já existe' });
        }

        const template = await prisma.messageTemplate.create({
            data: {
                name: name.trim(),
                content: content?.trim() || null,
                daysBeforeExpiry: 0
            },
        });

        res.status(201).json({
            message: 'Modelo de mensagem criado com sucesso',
            template,
        });
    } catch (error) {
        console.error('Error creating message template:', error);
        res.status(500).json({ message: 'Error creating message template' });
    }
});

// Update message template
router.put('/:id', authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, content } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        // Verificar se existe
        const existing = await prisma.messageTemplate.findFirst({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Modelo de mensagem não encontrado' });
        }

        // Verificar duplicação de nome
        const duplicate = await prisma.messageTemplate.findFirst({
            where: {
                name: name.trim(),
                NOT: { id }
            }
        });

        if (duplicate) {
            return res.status(400).json({ error: 'Já existe outro modelo de mensagem com este nome' });
        }

        const template = await prisma.messageTemplate.update({
            where: { id },
            data: {
                name: name.trim(),
                content: content?.trim() || null,
            },
        });

        res.json({
            message: 'Modelo de mensagem atualizado com sucesso',
            template,
        });
    } catch (error) {
        console.error('Error updating message template:', error);
        res.status(500).json({ message: 'Error updating message template' });
    }
});

// Delete message template
router.delete('/:id', authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.messageTemplate.delete({
            where: { id },
        });

        res.json({ message: 'Modelo de mensagem excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting message template:', error);
        res.status(500).json({ message: 'Error deleting message template' });
    }
});

export { router as messageTemplatesRouter };