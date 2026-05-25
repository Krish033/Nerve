import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret';
    console.log('[JwtRefreshStrategy] Initialized with secret length:', refreshSecret.length);

    super({
      jwtFromRequest: (request: Request) => {
        const cookieToken = request?.cookies?.refreshToken;
        const bodyToken = request?.body?.refreshToken;
        const headerToken = request?.get('Authorization')?.replace('Bearer ', '');
        
        console.log('[JwtRefreshStrategy] Token Sources - Cookie:', !!cookieToken, '| Body:', !!bodyToken, '| Header:', !!headerToken);
        
        const token = cookieToken || bodyToken || headerToken;
        console.log('[JwtRefreshStrategy] Final token extraction:', token ? 'SUCCESS' : 'FAILED');
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.refreshToken || req.get('Authorization')?.replace('Bearer ', '');
    console.log('[JwtRefreshStrategy] Validating payload for user:', payload?.sub);
    if (!refreshToken) {
      console.log('[JwtRefreshStrategy] Refresh token missing in validate');
      throw new UnauthorizedException('Refresh token missing');
    }
    return { ...payload, refreshToken };
  }
}
