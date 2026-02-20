import { PrismaClient } from '@exim/db';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export const createPrismaMock = (): DeepMockProxy<PrismaClient> => mockDeep<PrismaClient>();

export type PrismaMock = DeepMockProxy<PrismaClient>;
