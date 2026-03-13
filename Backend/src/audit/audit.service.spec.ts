import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let loggerErrorSpy: jest.SpyInstance;
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;

  const prismaMock: any = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    loggerErrorSpy = jest
      .spyOn(
        (service as unknown as {
          logger: { error: (...args: unknown[]) => void };
        }).logger,
        'error',
      )
      .mockImplementation(() => undefined);

    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(((handler: TimerHandler) => {
        handler as unknown;
        return 123 as unknown as NodeJS.Timeout;
      }) as typeof setInterval);

    clearIntervalSpy = jest
      .spyOn(global, 'clearInterval')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should redact sensitive fields', () => {
    const sanitized = service.sanitizePayload({
      email: 'user@rmparking.com',
      password: '123456',
      nested: { token: 'abc', keep: 'ok' },
    }) as Record<string, unknown>;

    expect(sanitized.password).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).token).toBe(
      '[REDACTED]',
    );
    expect((sanitized.nested as Record<string, unknown>).keep).toBe('ok');
  });

  it('should sanitize arrays and undefined payload', () => {
    const sanitizedArray = service.sanitizePayload([
      { token: 'x' },
      { value: 1 },
    ]) as Array<Record<string, unknown>>;
    const sanitizedUndefined = service.sanitizePayload(undefined);

    expect(sanitizedArray[0].token).toBe('[REDACTED]');
    expect(sanitizedArray[1].value).toBe(1);
    expect(sanitizedUndefined).toBeUndefined();
  });

  it('should build request context safely', () => {
    const context = service.buildContextFromRequest({
      user: { userId: 'u1', email: 'a@b.com' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      originalUrl: '/users',
      method: 'GET',
      params: { id: '1' },
      query: { page: '1' },
      _auditStartMs: Date.now() - 100,
    });

    expect(context.userId).toBe('u1');
    expect(context.userEmail).toBe('a@b.com');
    expect(context.endpoint).toBe('/users');
    expect(context.method).toBe('GET');
    expect(typeof context.responseTimeMs).toBe('number');
  });

  it('should build request context with extra override and missing user-agent', () => {
    const context = service.buildContextFromRequest(
      {
        ip: '127.0.0.2',
        headers: { other: 'header' },
      },
      { method: 'POST', userEmail: 'override@example.com' },
    );

    expect(context.userAgent).toBeUndefined();
    expect(context.method).toBe('POST');
    expect(context.userEmail).toBe('override@example.com');
  });

  it('should enqueue log and persist sanitized data', async () => {
    prismaMock.auditLog.create = jest.fn().mockResolvedValue({ id: 'a1' });

    service.log({
      operation: 'VIEW' as any,
      entity: 'users',
      result: 'SUCCESS' as any,
      metadata: { token: 'secret' },
      context: {
        requestParams: { authorization: 'token' },
        responseTimeMs: 20,
      },
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    const firstCallArg = (prismaMock.auditLog.create as jest.Mock).mock.calls[0][0].data as {
      metadata: Record<string, unknown>;
      requestParams: Record<string, unknown>;
      responseTimeMs: number;
    };
    expect(firstCallArg.metadata.token).toBe('[REDACTED]');
    expect(firstCallArg.requestParams.authorization).toBe('[REDACTED]');
    expect(firstCallArg.responseTimeMs).toBe(20);
  });

  it('should not throw when async log persistence fails', async () => {
    prismaMock.auditLog.create = jest.fn().mockRejectedValue(new Error('db down'));

    service.log({
      operation: 'UPDATE' as any,
      entity: 'users',
      result: 'ERROR' as any,
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('should paginate and filter logs', async () => {
    const rows = [{ id: '1' }, { id: '2' }];
    prismaMock.$transaction = jest.fn().mockResolvedValue([rows, 3]);

    const result = await service.findAll({
      page: 2,
      pageSize: 2,
      userEmail: 'admin',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-31T23:59:59.000Z',
      operation: 'VIEW' as any,
      entity: 'users',
      recordId: 'r1',
      result: 'SUCCESS' as any,
      userId: 'u1',
    });

    expect(result).toEqual({
      items: rows,
      total: 3,
      page: 2,
      pageSize: 2,
      totalPages: 2,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should return minimum one totalPage when empty', async () => {
    prismaMock.$transaction = jest.fn().mockResolvedValue([[], 0]);

    const result = await service.findAll({});

    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it('should find a log by id', async () => {
    prismaMock.auditLog.findUnique = jest.fn().mockResolvedValue({ id: 'a1' });

    const result = await service.findById('a1');

    expect(result).toEqual({ id: 'a1' });
    expect(prismaMock.auditLog.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
  });

  it('should export json logs', async () => {
    const row = {
      id: 'a1',
      timestamp: new Date('2026-03-13T00:00:00.000Z'),
      userId: 'u1',
      userEmail: 'admin@rmparking.com',
      ipAddress: '127.0.0.1',
      operation: 'VIEW' as any,
      entity: 'users',
      recordId: 'r1',
      result: 'SUCCESS' as any,
      endpoint: '/users',
      method: 'GET',
      responseTimeMs: 10,
      errorCode: null,
      errorMessage: null,
    };
    prismaMock.auditLog.findMany = jest.fn().mockResolvedValue([row]);

    const result = await service.exportLogs({ format: 'json', limit: 1 });

    expect(result.contentType).toBe('application/json');
    expect(result.body).toContain('admin@rmparking.com');
    expect(result.fileName).toContain('audit-logs-');
  });

  it('should export csv logs escaping quotes', async () => {
    const row = {
      id: 'a"1',
      timestamp: new Date('2026-03-13T00:00:00.000Z'),
      userId: 'u1',
      userEmail: 'a"@b.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      operation: 'VIEW' as any,
      entity: 'users',
      recordId: 'r1',
      result: 'SUCCESS' as any,
      endpoint: '/users',
      method: 'GET',
      responseTimeMs: 10,
      errorCode: null,
      errorMessage: null,
      requestParams: { query: { page: '1' } },
      previousValues: { role: 'OPERATOR' },
      newValues: { role: 'ADMIN_PARKING' },
      metadata: { source: 'test' },
    };
    prismaMock.auditLog.findMany = jest.fn().mockResolvedValue([row]);

    const result = await service.exportLogs({ format: 'csv', limit: 1 });

    expect(result.contentType).toBe('text/csv');
    expect(result.body).toContain('FechaHora,UsuarioCorreo,Operacion,Entidad,Resultado,ResumenEvento');
    expect(result.body).toContain('"a""1"');
    expect(result.body).toContain('"a""@b.com"');
    expect(result.body).toContain('"Consulta de informacion sobre users por a""@b.com en /users, con resultado exitoso."');
    expect(result.body).toContain('"{""query"":{""page"":""1""}}"');
    expect(result.body.startsWith('\uFEFF')).toBe(true);
    expect(result.fileName).toContain('.csv');
  });

  it('should schedule retention cleanup and clear interval on destroy', () => {
    process.env.AUDIT_RETENTION_DAYS = '30';
    process.env.AUDIT_RETENTION_CHECK_HOURS = '2';

    service.onModuleInit();
    const callback = setIntervalSpy.mock.calls[0][0] as () => void;
    callback();
    service.onModuleDestroy();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
  });

  it('should destroy safely when timer was never initialized', () => {
    service.onModuleDestroy();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it('should not schedule retention when days is zero', () => {
    process.env.AUDIT_RETENTION_DAYS = '0';

    service.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('should purge old logs and register retention event', async () => {
    prismaMock.auditLog.deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    prismaMock.auditLog.create = jest.fn().mockResolvedValue({ id: 'log-1' });

    await (
      service as unknown as { purgeOlderThanDays: (days: number) => Promise<void> }
    ).purgeOlderThanDays(1);
    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaMock.auditLog.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('should log purge errors', async () => {
    prismaMock.auditLog.deleteMany = jest
      .fn()
      .mockRejectedValue(new Error('delete failed'));

    await (
      service as unknown as { purgeOlderThanDays: (days: number) => Promise<void> }
    ).purgeOlderThanDays(1);

    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('should skip retention log when nothing deleted', async () => {
    prismaMock.auditLog.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaMock.auditLog.create = jest.fn();

    await (
      service as unknown as { purgeOlderThanDays: (days: number) => Promise<void> }
    ).purgeOlderThanDays(1);
    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});
