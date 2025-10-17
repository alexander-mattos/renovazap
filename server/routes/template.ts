import express from 'express';
import prisma from '../../src/lib/prisma';

const router = express.Router();

// Get all message templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Error fetching templates' });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Error fetching template' });
  }
});

// Create a new template
router.post('/', async (req, res) => {
  try {
    const { name, content, daysBeforeExpiry } = req.body;

    if (!name || !content || daysBeforeExpiry === undefined) {
      return res.status(400).json({ 
        message: 'Name, content, and daysBeforeExpiry are required' 
      });
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        content,
        daysBeforeExpiry: parseInt(daysBeforeExpiry),
      },
    });

    res.status(201).json({
      message: 'Template created successfully',
      template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Error creating template' });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, daysBeforeExpiry } = req.body;

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name,
        content,
        daysBeforeExpiry: parseInt(daysBeforeExpiry),
      },
    });

    res.json({
      message: 'Template updated successfully',
      template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Error updating template' });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.messageTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Error deleting template' });
  }
});

export { router as templateRouter };