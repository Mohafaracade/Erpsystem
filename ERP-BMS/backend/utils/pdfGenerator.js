const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({ margin: 50 });
  }

  generateInvoice(invoice, customer, items, filePath) {
    const writeStream = fs.createWriteStream(filePath);
    this.doc.pipe(writeStream);

    // Header
    this.generateHeader();
    
    // Customer Information
    this.generateCustomerInfo(customer);
    
    // Invoice Information
    this.generateInvoiceInfo(invoice);
    
    // Items Table
    this.generateItemsTable(items, invoice);
    
    // Totals
    this.generateTotals(invoice);
    
    // Footer
    this.generateFooter();
    
    this.doc.end();
    
    return filePath;
  }

  generateHeader() {
    this.doc
      .fontSize(20)
      .text('INVOICE', { align: 'center' })
      .moveDown();
  }

  generateCustomerInfo(customer) {
    this.doc
      .fontSize(12)
      .text('Bill To:', { underline: true })
      .moveDown(0.5);
    
    this.doc
      .fontSize(10)
      .text(customer.fullName);
    
    if (customer.businessName) {
      this.doc.text(customer.businessName);
    }
    
    if (customer.address?.street) {
      this.doc.text(customer.address.street);
    }
    
    if (customer.address?.city) {
      const cityLine = [];
      if (customer.address.city) cityLine.push(customer.address.city);
      if (customer.address.state) cityLine.push(customer.address.state);
      if (customer.address.postalCode) cityLine.push(customer.address.postalCode);
      this.doc.text(cityLine.join(', '));
    }
    
    if (customer.address?.country) {
      this.doc.text(customer.address.country);
    }
    
    this.doc
      .text(`Phone: ${customer.phone}`);
    
    if (customer.email) {
      this.doc.text(`Email: ${customer.email}`);
    }
    
    this.doc.moveDown();
  }

  generateInvoiceInfo(invoice) {
    const leftColumn = 350;
    
    this.doc
      .fontSize(10)
      .text(`Invoice Number: ${invoice.invoiceNumber}`, leftColumn, 100)
      .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, leftColumn)
      .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, leftColumn)
      .text(`Status: ${invoice.status.toUpperCase()}`, leftColumn)
      .moveDown();
  }

  generateItemsTable(items, invoice) {
    const tableTop = 200;
    const itemCodeX = 50;
    const descriptionX = 100;
    const quantityX = 350;
    const rateX = 400;
    const amountX = 460;

    // Table Header
    this.doc
      .fontSize(10)
      .text('Item', itemCodeX, tableTop, { bold: true })
      .text('Description', descriptionX, tableTop)
      .text('Qty', quantityX, tableTop)
      .text('Rate', rateX, tableTop)
      .text('Amount', amountX, tableTop)
      .moveDown();

    // Table Rows
    let y = tableTop + 20;
    
    items.forEach((item, i) => {
      this.doc
        .fontSize(9)
        .text(item.itemDetails?.name || 'N/A', itemCodeX, y)
        .text(item.itemDetails?.description?.substring(0, 50) || '-', descriptionX, y)
        .text(item.quantity.toString(), quantityX, y)
        .text(`$${item.rate.toFixed(2)}`, rateX, y)
        .text(`$${item.amount.toFixed(2)}`, amountX, y);
      
      y += 20;
      
      // Add page if needed
      if (y > 700) {
        this.doc.addPage();
        y = 50;
      }
    });

    // Horizontal line
    this.doc
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }

  generateTotals(invoice) {
    const totalsTop = 500;
    
    this.doc
      .fontSize(10)
      .text('Subtotal:', 400, totalsTop)
      .text(`$${invoice.subTotal.toFixed(2)}`, 460, totalsTop)
      .text('Discount:', 400, totalsTop + 20)
      .text(`$${invoice.discount.toFixed(2)}`, 460, totalsTop + 20)
      .text('Shipping:', 400, totalsTop + 40)
      .text(`$${invoice.shippingCharges.toFixed(2)}`, 460, totalsTop + 40)
      .text('Tax:', 400, totalsTop + 60)
      .text(`$${invoice.taxTotal.toFixed(2)}`, 460, totalsTop + 60)
      .fontSize(12)
      .text('TOTAL:', 400, totalsTop + 90, { bold: true })
      .text(`$${invoice.total.toFixed(2)}`, 460, totalsTop + 90, { bold: true });
  }

  generateFooter() {
    this.doc
      .fontSize(8)
      .text('Thank you for your business!', 50, 750, { align: 'center' })
      .text('Invoice generated on ' + new Date().toLocaleDateString(), 50, 765, { align: 'center' });
  }
}

module.exports = PDFGenerator;