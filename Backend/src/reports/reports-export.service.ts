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
  private readonly reportBrandTitle = 'RM Parking';
  private readonly reportBrandSubtitle = 'Gestión de espacios';

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
    worksheet.addRow([this.reportBrandTitle]);
    worksheet.addRow([this.reportBrandSubtitle]);
    worksheet.addRow([title]);
    worksheet.addRow([]);

    if (headers.length > 0) {
      worksheet.addRow(headers);
      for (const row of rows) {
        worksheet.addRow(headers.map((header) => this.toCellValue(row[header])));
      }

      const headerRow = worksheet.getRow(5);
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

      doc.fontSize(16).text(this.reportBrandTitle, { underline: true });
      doc.fontSize(10).fillColor('#4B5563').text(this.reportBrandSubtitle);
      doc.moveDown(0.5);
      doc.fillColor('#111827').fontSize(12).text(title);
      doc.moveDown(0.8);

      const headers = this.getHeaders(rows);
      if (headers.length === 0) {
        doc.fontSize(11).text('Sin registros para exportar.');
        doc.end();
        return;
      }

      const headerLabels = headers.map((header) => this.formatHeaderLabel(header));
      const cellValuesByHeader = headers.map((header) =>
        rows.map((row) => this.toCellValue(row[header])),
      );

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const usableWidth = right - left;
      const maxY = doc.page.height - doc.page.margins.bottom;
      const columnWidths = this.resolvePdfColumnWidths(
        headers,
        headerLabels,
        cellValuesByHeader,
        usableWidth,
      );

      const drawHeaderRow = () => {
        const headerY = doc.y;
        doc.fontSize(9).fillColor('#111827');
        let maxHeaderHeight = 0;
        headerLabels.forEach((headerLabel, index) => {
          const x = left + this.sumWidths(columnWidths, index);
          const width = columnWidths[index] - 6;
          const height = doc.heightOfString(headerLabel, { width });
          maxHeaderHeight = Math.max(maxHeaderHeight, height);
          doc.text(headerLabel, x, headerY, {
            width,
            align: 'left',
          });
        });
        doc.y = headerY + maxHeaderHeight + 8;
      };

      drawHeaderRow();

      rows.forEach((row) => {
        const cellValues = headers.map((header) => this.toCellValue(row[header]));
        const rowHeight = Math.max(
          ...cellValues.map((value, index) => {
            const width = columnWidths[index] - 6;
            return doc.heightOfString(value, { width });
          }),
        );

        // ES: Si no cabe la fila completa, creamos una nueva pagina y repetimos encabezados.
        if (doc.y + rowHeight > maxY) {
          doc.addPage({ margin: 36, size: 'A4' });
          drawHeaderRow();
        }

        const effectiveRowY = doc.y;
        doc.fontSize(8).fillColor('#1F2937');
        cellValues.forEach((value, index) => {
          const x = left + this.sumWidths(columnWidths, index);
          doc.text(value, x, effectiveRowY, {
            width: columnWidths[index] - 6,
            align: 'left',
          });
        });

        doc.y = effectiveRowY + rowHeight + 6;
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
              children: [new TextRun({ text: this.reportBrandTitle, bold: true, size: 30 })],
            }),
            new Paragraph({
              children: [new TextRun({ text: this.reportBrandSubtitle, size: 20 })],
            }),
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 24 })],
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

  // ES: Ajusta anchos segun encabezado y contenido para evitar mezcla visual entre columnas.
  private resolvePdfColumnWidths(
    headers: string[],
    headerLabels: string[],
    cellValuesByHeader: string[][],
    usableWidth: number,
  ): number[] {
    const minWidth = 58;
    const maxWidth = 220;

    const desired = headers.map((header, index) => {
      const label = headerLabels[index];
      const sampleValues = (cellValuesByHeader[index] ?? []).slice(0, 30);
      const maxValueLength = sampleValues.reduce((acc, value) => Math.max(acc, value.length), 0);
      const baseByLabel = label.length * 5.8;
      const baseByValue = maxValueLength * 4.2;
      const weighted = Math.max(baseByLabel, baseByValue) * this.resolvePdfColumnWeight(header);
      return Math.min(maxWidth, Math.max(minWidth, weighted));
    });

    const totalDesired = desired.reduce((acc, item) => acc + item, 0);
    if (totalDesired <= usableWidth) {
      const extra = (usableWidth - totalDesired) / desired.length;
      return desired.map((value) => value + extra);
    }

    const flexible = desired.map((value) => value - minWidth);
    const totalFlexible = flexible.reduce((acc, item) => acc + item, 0);
    const usableFlexible = Math.max(0, usableWidth - minWidth * desired.length);

    if (totalFlexible === 0) {
      return desired.map(() => usableWidth / desired.length);
    }

    return flexible.map((value) => minWidth + (value / totalFlexible) * usableFlexible);
  }

  private resolvePdfColumnWeight(header: string): number {
    const normalized = header.toLowerCase();

    if (normalized.includes('descripcion')) return 1.25;
    if (normalized.includes('correo')) return 1.2;
    if (normalized.includes('nombre') || normalized.includes('cliente')) return 1.15;
    if (normalized.includes('documento')) return 1.12;
    if (normalized.includes('parqueadero')) return 1.1;
    if (normalized.includes('ingreso') || normalized.includes('salida') || normalized.includes('fecha')) return 1.08;
    if (normalized.includes('mensualidad') || normalized.includes('monto') || normalized.includes('valor') || normalized.includes('total')) return 1.06;
    if (normalized.includes('referencia')) return 1.05;
    if (normalized.includes('horas')) return 1.03;
    if (normalized.includes('estado')) return 1.02;
    if (normalized.includes('rol')) return 1;
    if (normalized.includes('tipo') || normalized.includes('periodo') || normalized.includes('etiqueta')) return 1;

    return 1;
  }

  private formatHeaderLabel(header: string): string {
    return header
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }

  private sumWidths(widths: number[], endIndexExclusive: number): number {
    let total = 0;
    for (let i = 0; i < endIndexExclusive; i += 1) {
      total += widths[i];
    }
    return total;
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
