import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async upsertUser(data: {
    firebaseUid: string;
    email: string;
    name: string;
    profilePicture?: string;
    mobile?: string;
    refreshToken?: string | null;
    isEmailVerified?: boolean;
    isTwoFactorEnabled?: boolean;
    twoFactorSecret?: string;
    twoFactorType?: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { firebaseUid: data.firebaseUid },
      update: {
        email: data.email,
        name: data.name,
        profilePicture: data.profilePicture,
        mobile: data.mobile,
        refreshToken: data.refreshToken,
        isEmailVerified: data.isEmailVerified,
        isTwoFactorEnabled: data.isTwoFactorEnabled,
        twoFactorSecret: data.twoFactorSecret,
        twoFactorType: data.twoFactorType,
        lastLogin: new Date(),
      },
      create: {
        firebaseUid: data.firebaseUid,
        email: data.email,
        name: data.name,
        profilePicture: data.profilePicture,
        mobile: data.mobile,
        refreshToken: data.refreshToken,
        isEmailVerified: data.isEmailVerified || false,
        isTwoFactorEnabled: data.isTwoFactorEnabled || false,
        twoFactorSecret: data.twoFactorSecret,
        twoFactorType: data.twoFactorType,
        lastLogin: new Date(),
      },
    });
  }

  async updateRefreshToken(userId: string, hashedToken: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  async deleteUser(userId: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
