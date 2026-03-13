import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const previousSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = previousSecret;
  });

  it('should map valid payload to request user', () => {
    const strategy = new JwtStrategy();

    const result = strategy.validate({
      sub: 'user-1',
      email: 'admin@rmparking.com',
      role: Role.SUPER_ADMIN,
    });

    expect(result).toEqual({
      userId: 'user-1',
      email: 'admin@rmparking.com',
      role: Role.SUPER_ADMIN,
    });
  });

  it('should reject payload without sub', () => {
    const strategy = new JwtStrategy();

    expect(() =>
      strategy.validate({ email: 'admin@rmparking.com', role: Role.SUPER_ADMIN }),
    ).toThrow(UnauthorizedException);
  });

  it('should reject payload without role', () => {
    const strategy = new JwtStrategy();

    expect(() =>
      strategy.validate({ sub: 'user-1', email: 'admin@rmparking.com' }),
    ).toThrow(UnauthorizedException);
  });

  it('should reject payload with unknown role', () => {
    const strategy = new JwtStrategy();

    expect(() =>
      strategy.validate({
        sub: 'user-1',
        email: 'admin@rmparking.com',
        role: 'INVALID_ROLE',
      }),
    ).toThrow(UnauthorizedException);
  });
});
