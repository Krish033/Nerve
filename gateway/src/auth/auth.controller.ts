import { Controller, Post, Body, Res, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto.idToken, loginDto.rememberMe, req);

    // Set refreshToken in cookie if available (not required for MFA/Verification steps)
    if (result.refreshToken) {
      // Session hint for client logic (Optimistic UI)
      res.cookie('session_hint', 'active', {
        httpOnly: false, // Must be readable by client
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return {
      ...result,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    
    const result = await this.authService.refreshTokens(userId, refreshToken, req);
    
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      });
    }

    return {
      ...result,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.sub);
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    res.clearCookie('session_hint', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Post('mfa/verify')
  async verifyMfa(@Body() body: { userId: string; token: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyMfa(body.userId, body.token, req);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return {
      ...result,
    };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@Req() req: any) {
    return this.authService.setupTwoFactor(req.user.sub);
  }

  @Post('mfa/setup-verify')
  @UseGuards(JwtAuthGuard)
  async verifySetupMfa(@Req() req: any, @Body() body: { token: string }) {
    return this.authService.verifyTwoFactorSetup(req.user.sub, body.token);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@Req() req: any) {
    return this.authService.disableTwoFactor(req.user.sub);
  }
}
