import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MarketplaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
