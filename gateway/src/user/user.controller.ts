import { Controller, Get, Patch, Body, UseGuards, Req, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.userService.findById(req.user.id);
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() data: any) {
    const { name, mobile, profilePicture } = data;
    return this.userService.updateUser(req.user.userId, {
      name: name,
      profilePicture: profilePicture,
      mobile: mobile,
    });
  }

  @Delete('profile')
  async deleteProfile(@Req() req: any) {
    return this.userService.deleteUser(req.user.id);
  }
}
