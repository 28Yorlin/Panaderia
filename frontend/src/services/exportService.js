import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Exporta datos a PDF
 * @param {string} title Título del documento
 * @param {string[]} headers Cabeceras de la tabla
 * @param {any[]} data Filas de datos
 * @param {string} fileName Nombre del archivo
 */
export const exportToPDF = (title, headers, data, fileName = 'reporte.pdf') => {
  const doc = new jsPDF();
  
  // Banner de encabezado (Fondo oscuro)
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('EL RINCÓN PANADERO', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'normal');
  doc.text('SISTEMA DE GESTIÓN E INTELIGENCIA', 14, 28);
  
  // Título del reporte
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 48);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 55);
 
  // Generar Tabla
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: { 
      fillColor: [99, 102, 241], // Indigo 500
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 10, 
      cellPadding: 4,
      valign: 'middle'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });
 
  doc.save(fileName);
};

/**
 * Exporta datos a Excel
 * @param {any[]} data Arreglo de objetos
 * @param {string} fileName Nombre del archivo
 */
export const exportToExcel = (data, fileName = 'reporte.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, fileName);
};
