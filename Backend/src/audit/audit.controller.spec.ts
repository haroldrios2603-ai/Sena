import { NotFoundException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  const auditServiceMock = {
    findAll: jest.fn(),
    findById: jest.fn(),
    exportLogs: jest.fn(),
    log: jest.fn(),
  } as unknown as AuditService;

  let controller: AuditController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditController(auditServiceMock);
  });

  it('should list logs', async () => {
    (auditServiceMock.findAll as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    const result = await controller.listLogs({ page: 1, pageSize: 25 });

    expect(result).toEqual({ items: [], total: 0 });
    expect(auditServiceMock.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it('should return one log by id', async () => {
    (auditServiceMock.findById as jest.Mock).mockResolvedValue({ id: 'a1' });

    const result = await controller.getLogById('a1');

    expect(result).toEqual({ id: 'a1' });
    expect(auditServiceMock.findById).toHaveBeenCalledWith('a1');
  });

  it('should throw not found when log does not exist', async () => {
    (auditServiceMock.findById as jest.Mock).mockResolvedValue(null);

    await expect(controller.getLogById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should export logs and write response headers', async () => {
    (auditServiceMock.exportLogs as jest.Mock).mockResolvedValue({
      contentType: 'text/csv',
      body: 'id,timestamp',
      fileName: 'audit.csv',
    });

    const headers: Record<string, string> = {};
    const res = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
      send: jest.fn((body: string) => body),
    };

    const result = await controller.exportLogs(
      { format: 'csv', limit: 10 },
      { user: { userId: 'u1', email: 'admin@rmparking.com' } },
      res as unknown as Parameters<AuditController['exportLogs']>[2],
    );

    expect(result).toBe('id,timestamp');
    expect(headers['Content-Type']).toBe('text/csv');
    expect(headers['Content-Disposition']).toBe('attachment; filename="audit.csv"');
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'EXPORT',
        entity: 'audit_logs',
        result: 'SUCCESS',
      }),
    );
  });
});
