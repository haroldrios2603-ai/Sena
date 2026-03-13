import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExportAuditLogsDto } from './export-audit-logs.dto';
import { QueryAuditLogsDto } from './query-audit-logs.dto';

describe('Audit DTOs', () => {
  it('should validate query dto with valid payload', async () => {
    const dto = plainToInstance(QueryAuditLogsDto, {
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-02T00:00:00.000Z',
      userId: 'u1',
      userEmail: 'admin@rmparking.com',
      operation: 'CREATE',
      entity: 'users',
      recordId: 'r1',
      result: 'SUCCESS',
      page: 1,
      pageSize: 25,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail query dto with invalid values', async () => {
    const dto = plainToInstance(QueryAuditLogsDto, {
      from: 'invalid-date',
      operation: 'BAD_OP',
      result: 'BAD_RESULT',
      page: 0,
      pageSize: 999,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate export dto defaults and bounds', async () => {
    const dto = plainToInstance(ExportAuditLogsDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.format).toBe('csv');
    expect(dto.limit).toBe(1000);
  });

  it('should fail export dto with invalid options', async () => {
    const dto = plainToInstance(ExportAuditLogsDto, {
      format: 'xml',
      limit: 5001,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
