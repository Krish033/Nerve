import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  const prisma = {
    blog: { findMany: jest.fn() },
    notification: { findMany: jest.fn() },
    setting: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    activityLog: { findMany: jest.fn() },
    errorLog: { findMany: jest.fn() },
    accessLog: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
