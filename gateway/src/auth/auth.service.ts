import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { TwoFactorService } from './two-factor.service';
import { UAParser } from 'ua-parser-js';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private prisma: PrismaService,
  ) {}

  async login(idToken: string, rememberMe: boolean = false, req?: Request) {
    try {
      // 1. Verify Firebase Token
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);
      
      // 2. Find if user exists to optimize
      let user = await this.userService.findByFirebaseUid(decodedToken.uid);

      // Check for email verification if mandatory
      if (!decodedToken.email_verified) {
        return {
          emailVerificationRequired: true,
          email: decodedToken.email,
          userId: user?.id,
        };
      }
      
      let tokens;

      if (user) {
        // 3a. Check if MFA is required (Only enforce 2FA for password logins, bypass for Google/OAuth)
        const isPasswordLogin = decodedToken.firebase?.sign_in_provider === 'password';
        if (user.isTwoFactorEnabled && isPasswordLogin) {
          return {
            mfaRequired: true,
            mfaType: user.twoFactorType || 'TOTP',
            userId: user.id,
          };
        }

        // 3b. Generate Tokens for existing user (No MFA)
      const sessionId = crypto.randomUUID();
      tokens = await this.getTokens(user.id, user.email, rememberMe, sessionId);
      const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
      const hashedRefreshToken = await bcrypt.hash(tokenHash, 10);
      
      user = await this.userService.upsertUser({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || 'User',
        profilePicture: decodedToken.picture,
        refreshToken: hashedRefreshToken,
        isEmailVerified: decodedToken.email_verified || false,
      });

      if (req) {
        await this.createSession(user.id, tokens.refreshToken, req, sessionId);
      }

      return {
        user,
        ...tokens,
      };
    } else {
      // 4. New user
      user = await this.userService.upsertUser({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || 'User',
        profilePicture: decodedToken.picture,
        isEmailVerified: decodedToken.email_verified || false,
      });
      const sessionId = crypto.randomUUID();
      tokens = await this.getTokens(user.id, user.email, rememberMe, sessionId);
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
      
      if (req) {
        await this.createSession(user.id, tokens.refreshToken, req, sessionId);
      }
      
      return {
        user,
        ...tokens,
      };
    }
    } catch (error: any) {
      const logPath = path.join(process.cwd(), 'auth-errors.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - [LOGIN] ${error.stack}\n`);
      console.error('AuthService Login Error:', error.message || error);
      throw new UnauthorizedException(`Authentication failed: ${error.message || 'Verification failed'}`);
    }
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string, req?: Request) {
    try {
      const user = await this.userService.findById(userId);
      if (!user || user.refreshToken === null) {
        throw new ForbiddenException('Access Denied');
      }

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const refreshTokenMatches = await bcrypt.compare(tokenHash, user.refreshToken);
      
      if (!refreshTokenMatches) {
        throw new ForbiddenException('Access Denied');
      }

      const payload = (this.jwtService.decode(refreshToken) as any);
      const sessionId = payload?.sid || crypto.randomUUID();
      const tokens = await this.getTokens(user.id, user.email, true, sessionId); 
      
      const newTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
      const hashedRefreshToken = await bcrypt.hash(newTokenHash, 10);
      
      await this.userService.updateRefreshToken(user.id, hashedRefreshToken);
      
      if (req) {
        await this.updateSession(refreshToken, tokens.refreshToken, req, sessionId);
      }
      
      return {
        user,
        ...tokens,
      };
    } catch (error: any) {
      const logPath = path.join(process.cwd(), 'auth-errors.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - [REFRESH] ${error.stack}\n`);
      throw error;
    }
  }

  async verifyMfa(userId: string, token: string, req?: Request) {
    try {
      const user = await this.userService.findById(userId);
      if (!user || !user.twoFactorSecret) {
        throw new UnauthorizedException('Invalid MFA request');
      }

      const isValid = await this.twoFactorService.verifyToken(token, user.twoFactorSecret);
      if (!isValid) {
        throw new UnauthorizedException('Invalid security code');
      }

      // Generate tokens after successful MFA
      const sessionId = crypto.randomUUID();
      const tokens = await this.getTokens(user.id, user.email, true, sessionId);
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      if (req) {
        await this.createSession(user.id, tokens.refreshToken, req, sessionId);
      }

      return {
        user,
        ...tokens,
      };
    } catch (error: any) {
      const logPath = path.join(process.cwd(), 'auth-errors.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - [MFA_VERIFY] ${error.stack}\n`);
      throw error;
    }
  }

  async setupTwoFactor(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const { secret, otpauthUrl } = this.twoFactorService.generateSecret(user.email);
    const qrCode = await this.twoFactorService.generateQrCodeDataUrl(otpauthUrl);

    // Temporarily store secret but don't enable yet
    await this.userService.updateUser(userId, { twoFactorSecret: secret });

    return {
      qrCode,
      secret,
    };
  }

  async verifyTwoFactorSetup(userId: string, token: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('MFA not initiated');
    }

    const isValid = await this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.userService.updateUser(userId, {
      isTwoFactorEnabled: true,
      twoFactorType: 'TOTP',
    });

    return { success: true };
  }

  async disableTwoFactor(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    await this.userService.updateUser(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorType: null,
    });

    return await this.userService.findById(userId);
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    // Hash with SHA-256 first to bypass bcrypt's 72-byte limit for long JWTs
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const hash = await bcrypt.hash(tokenHash, 10);
    await this.userService.updateRefreshToken(userId, hash);
  }

  private async getTokens(userId: string, email: string, rememberMe: boolean, sessionId?: string) {
    const [accessSecret, refreshSecret] = await Promise.all([
      this.configService.get<string>('JWT_ACCESS_SECRET'),
      this.configService.get<string>('JWT_REFRESH_SECRET'),
    ]);


    const payload = { sub: userId, email, sid: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        payload,
        { secret: accessSecret, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        payload,
        { 
          secret: refreshSecret, 
          expiresIn: rememberMe ? '30d' : '1d' 
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(userId: string, token: string, req: Request, sessionId: string) {
    const ua = new UAParser(req.headers['user-agent']).getResult();
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        token,
        ip,
        device: ua.device.model || ua.os.name || 'Unknown Device',
        os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
        browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
        location: 'Unknown',
        isActive: true,
      },
    });
  }

  private async updateSession(oldToken: string, newToken: string, req: Request, sessionId: string) {
    const ua = new UAParser(req.headers['user-agent']).getResult();
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    // Try to find the session by old token or ID
    const session = await this.prisma.session.findFirst({
      where: { 
        OR: [
          { id: sessionId },
          { token: oldToken }
        ]
      },
    });

    if (session) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          token: newToken,
          lastActive: new Date(),
          ip,
          isActive: true, // Reactivate if it was inactive (though refresh usually happens on active)
        },
      });
    } else {
      // If session not found, create a new one
      const userId = await this.jwtService.decode(newToken)['sub'];
      if (userId) {
        await this.createSession(userId, newToken, req, sessionId);
      }
    }
  }
}
