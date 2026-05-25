import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'default-access-secret',
    });
  }

  async validate(payload: any) {
    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sid },
      });

      if (!session || !session.isActive) {
        throw new UnauthorizedException('Session has been terminated');
      }
    }

    return { ...payload, userId: payload.sub, id: payload.sub };
  }
}
