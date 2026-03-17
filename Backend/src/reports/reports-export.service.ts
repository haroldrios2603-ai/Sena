import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export type ExportFormat = 'excel' | 'pdf' | 'word';

@Injectable()
export class ReportsExportService {
  async buildFile(
    format: ExportFormat,
    title: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ contentType: string; body: Buffer; extension: string }> {
    if (format === 'excel') {
      const body = await this.buildExcel(title, rows);
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body,
        extension: 'xlsx',
      };
    }

    if (format === 'pdf') {
      const body = await this.buildPdf(title, rows);
      return {
        contentType: 'application/pdf',
        body,
        extension: 'pdf',
      };
    }

    const body = await this.buildWord(title, rows);
    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body,
      extension: 'docx',
    };
  }

  private async buildExcel(
    title: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    const headers = this.getHeaders(rows);
    worksheet.addRow([title]);
    worksheet.addRow([]);

    if (headers.length > 0) {
      worksheet.addRow(headers);
      for (const row of rows) {
        worksheet.addRow(headers.map((header) => this.toCellValue(row[header])));
      }

      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true };

      headers.forEach((header, idx) => {
        const maxDataLength = Math.max(
          header.length,
          ...rows.map((row) => String(this.toCellValue(row[header])).length),
        );
        worksheet.getColumn(idx + 1).width = Math.min(45, Math.max(14, maxDataLength + 2));
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildPdf(
    title: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(16).text(title, { underline: true });
      doc.moveDown(1);

      const headers = this.getHeaders(rows);
      if (headers.length === 0) {
        doc.fontSize(11).text('Sin registros para exportar.');
        doc.end();
        return;
      }

      doc.fontSize(9).text(headers.join(' | '));
      doc.moveDown(0.5);

      rows.forEach((row) => {
        const line = headers
          .map((header) => `${header}: ${this.toCellValue(row[header])}`)
          .join(' | ');
        doc.text(line);
        doc.moveDown(0.3);
      });

      doc.end();
    });
  }

  private async buildWord(
    title: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const headers = this.getHeaders(rows);

    const tableRows: TableRow[] = [];
    if (headers.length > 0) {
      tableRows.push(
        new TableRow({
          children: headers.map(
            (header) =>
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: header, bold: true })] }),
                ],
              }),
          ),
        }),
      );

      for (const row of rows) {
        tableRows.push(
          new TableRow({
            children: headers.map(
              (header) =>
                new TableCell({
                  children: [new Paragraph(String(this.toCellValue(row[header])))],
                }),
            ),
          }),
        );
      }
    }

    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 30 })],
            }),
            new Paragraph(''),
            ...(headers.length
              ? [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                  }),
                ]
              : [new Paragraph('Sin registros para exportar.')]),
          ],
        },
      ],
    });

    return Packer.toBuffer(document);
  }

  private getHeaders(rows: Array<Record<string, unknown>>) {
    if (!rows.length) {
      return [];
    }
    return Object.keys(rows[0]);
  }

  private toCellValue(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
