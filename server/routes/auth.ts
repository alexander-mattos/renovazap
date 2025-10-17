import express from 'express';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate token and refresh token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as any,
      ({ expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any)
    );
    const refreshToken = crypto.randomBytes(48).toString('hex')

    // Save refresh token
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    // Generate token and refresh token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as any,
      ({ expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any)
    );
    const refreshToken = crypto.randomBytes(48).toString('hex')
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Refresh JWT using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' })

    const user = await prisma.user.findFirst({ where: { refreshToken } })
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as any,
      ({ expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as any)
    )

    // Optionally issue a new refresh token
    const newRefreshToken = crypto.randomBytes(48).toString('hex')
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } })

    res.json({ token, refreshToken: newRefreshToken })
  } catch (err) {
    console.error('Refresh token error', err)
    res.status(500).json({ message: 'Error refreshing token' })
  }
})

export { router as authRouter };