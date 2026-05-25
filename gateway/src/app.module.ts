import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SettingsModule } from './settings/settings.module';
import { BlogsModule } from './blogs/blogs.module';
import { AdsModule } from './ads/ads.module';
import { NotificationModule } from './notification/notification.module';
import { SearchModule } from './search/search.module';
import { LogsModule } from './logs/logs.module';
// import { LoggingInterceptor } from './logs/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    UserModule,
    SettingsModule,
    BlogsModule,
    AdsModule,
    NotificationModule,
    SearchModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
  ],
})
export class AppModule {}
