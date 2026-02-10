const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { generateInvoiceNumber } = require('../utils/generateId');
const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notificationController');
const mongoose = require('mongoose');
const { addCompanyFilter, validateCompanyOwnership } = require('../middleware/companyScope');


// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getAllInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-invoiceDate',
      search,
      status,
      customerId,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = req.query;

    // Build query
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by customer
    if (customerId) {
      query.customer = customerId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      query.total = {};
      if (minAmount) {
        query.total.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        query.total.$lte = parseFloat(maxAmount);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Add company filter
    const companyFilteredQuery = addCompanyFilter(query, req);

    // Execute query with pagination
    const invoices = await Invoice.find(companyFilteredQuery)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'fullName phone customerType')
      .populate('createdBy', 'name');

    // Get total count
    const total = await Invoice.countDocuments(companyFilteredQuery);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Invoices retrieved successfully', invoices, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get unpaid invoices for a customer
// @route   GET /api/invoices/unpaid
// @access  Private
exports.getUnpaidInvoicesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return errorResponse(res, 'customerId is required', 400);
    }

    // Validate customer belongs to company
    const customer = await Customer.findOne({
      _id: customerId,
      ...addCompanyFilter({}, req)
    });
    
    if (!customer) {
      return errorResponse(res, 'Customer not found or access denied', 404);
    }

    const invoices = await Invoice.find({
      customer: customerId,
      status: { $nin: ['paid', 'cancelled'] },
      balanceDue: { $gt: 0 },
      receipt: null,
      ...addCompanyFilter({}, req)
    })
      .sort('-invoiceDate')
      .populate('customer', 'fullName phone customerType');

    successResponse(res, 'Unpaid invoices retrieved successfully', invoices);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Invoice, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    })
      .populate('customer', 'fullName phone customerType')
      .populate('createdBy', 'name')
      .populate('items.item', 'name description type sellingPrice');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    successResponse(res, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Check for duplicate invoices
// @route   POST /api/invoices/check-duplicate
// @access  Private
exports.checkDuplicateInvoice = async (req, res) => {
  try {
    const { customer, invoiceDate, dueDate, total } = req.body;

    // Validate required fields
    if (!customer || !invoiceDate || !dueDate || total === undefined) {
      return errorResponse(res, 'Customer, invoice date, due date, and total are required', 400);
    }

    // Parse dates to check for same day
    const invoiceDateObj = new Date(invoiceDate);
    const dueDateObj = new Date(dueDate);

    // Create date range for the same day (00:00:00 to 23:59:59)
    const invoiceDateStart = new Date(invoiceDateObj.setHours(0, 0, 0, 0));
    const invoiceDateEnd = new Date(invoiceDateObj.setHours(23, 59, 59, 999));

    const dueDateStart = new Date(dueDateObj.setHours(0, 0, 0, 0));
    const dueDateEnd = new Date(dueDateObj.setHours(23, 59, 59, 999));

    // Query for potential duplicates (within same company)
    const duplicates = await Invoice.find({
      customer: customer,
      invoiceDate: {
        $gte: invoiceDateStart,
        $lte: invoiceDateEnd
      },
      dueDate: {
        $gte: dueDateStart,
        $lte: dueDateEnd
      },
      total: parseFloat(total),
      status: { $ne: 'cancelled' }, // Exclude cancelled invoices
      ...addCompanyFilter({}, req)
    })
      .populate('customer', 'fullName phone')
      .select('invoiceNumber invoiceDate dueDate total status customerDetails')
      .limit(5); // Limit to 5 matches for performance

    if (duplicates.length > 0) {
      return successResponse(res, 'Duplicate invoices found', {
        isDuplicate: true,
        matchingInvoices: duplicates,
        count: duplicates.length
      });
    }

    successResponse(res, 'No duplicates found', {
      isDuplicate: false,
      matchingInvoices: [],
      count: 0
    });
  } catch (error) {
    console.error('[checkDuplicateInvoice] Error:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const {
      customer,
      invoiceDate,
      dueDate,
      terms,
      items,
      discount,
      shippingCharges,
      notes,
      status = 'draft'
    } = req.body;

    // Validate customer exists and belongs to company
    const customerDoc = await Customer.findOne({
      _id: customer,
      ...addCompanyFilter({}, req)
    });
    if (!customerDoc) {
      return errorResponse(res, 'Customer not found or access denied', 404);
    }

    // Validate items batch-wise to prevent N+1 queries
    const itemIds = items.map(i => i.item);
    if (!itemIds.length) {
      return errorResponse(res, 'At least one item is required', 400);
    }

    // ✅ FIX: Add company filter to prevent cross-company item access
    const itemDocs = await Item.find({ 
      _id: { $in: itemIds },
      ...addCompanyFilter({}, req)
    });
    const itemMap = new Map(itemDocs.map(i => [i._id.toString(), i]));

    const processedItems = [];
    let subTotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const itemDoc = itemMap.get(item.item);

      if (!itemDoc) {
        return errorResponse(res, `Item ${item.item} not found`, 404);
      }

      if (!itemDoc.isActive) {
        return errorResponse(res, `Item "${itemDoc.name}" is not active and cannot be used`, 400);
      }

      const quantity = Number(item.quantity);
      const rate = Number(item.rate || item.price || itemDoc.sellingPrice);
      const taxRate = Number(item.tax || item.taxRate || 0);

      if (quantity <= 0.01) {
        return errorResponse(res, 'Item quantity must be greater than 0', 400);
      }

      if (rate < 0) {
        return errorResponse(res, 'Item rate cannot be negative', 400);
      }

      const amount = quantity * rate;
      const taxAmount = amount * (taxRate / 100);

      subTotal += amount;
      taxTotal += taxAmount;

      processedItems.push({
        item: itemDoc._id,
        itemDetails: {
          name: itemDoc.name,
          description: itemDoc.description,
          type: itemDoc.type,
          sellingPrice: itemDoc.sellingPrice
        },
        quantity,
        rate,
        tax: taxRate,
        amount
      });
    }

    const validDiscount = Math.max(0, Number(discount) || 0);
    const validShipping = Math.max(0, Number(shippingCharges) || 0);
    const total = subTotal + taxTotal + validShipping - validDiscount;

    // ✅ FIX #5: Get company ID BEFORE using it
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId && req.user.role !== 'super_admin') {
      return errorResponse(res, 'Company association required', 400);
    }

    // Generate atomic invoice number (Backend Source of Truth)
    // Use company-specific numbering
    const invoiceNumber = await generateInvoiceNumber(companyId);

    // Create invoice
    const invoice = await Invoice.create({
      customer,
      customerDetails: {
        name: customerDoc.fullName,
        phone: customerDoc.phone
      },
      invoiceNumber,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || new Date(),
      terms,
      items: processedItems,
      subTotal,
      discount: validDiscount,
      shippingCharges: validShipping,
      taxTotal,
      total,
      amountPaid: 0,
      balanceDue: total,
      status, // Will be validated by pre-save hook
      notes,
      company: companyId,
      createdBy: req.user.id
    });

    // Create notification
    await createNotification({
      user: req.user.id,
      type: 'invoice',
      title: 'New Invoice Created',
      message: `Invoice #${invoice.invoiceNumber} has been created for ${invoice.customerDetails.name}.`,
      link: `/invoices/${invoice._id}`
    });

    successResponse(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    console.error('[createInvoice] Error:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Invoice, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    // STRICT: Prevent updates on issued (sent), paid, or cancelled invoices
    if (['sent', 'paid', 'cancelled'].includes(invoice.status)) {
      return errorResponse(res, `Cannot update ${invoice.status} invoice. Issued documents are locked for audit integrity.`, 400);
    }

    const {
      customer,
      invoiceDate,
      dueDate,
      terms,
      items,
      discount,
      shippingCharges,
      notes,
      status
    } = req.body;

    // Validate customer if provided (must belong to same company)
    if (customer) {
      const customerDoc = await Customer.findOne({
        _id: customer,
        ...addCompanyFilter({}, req)
      });
      if (!customerDoc) {
        return errorResponse(res, 'Customer not found or access denied', 404);
      }
      invoice.customer = customer;
      invoice.customerDetails = {
        name: customerDoc.fullName,
        phone: customerDoc.phone
      };
    }

    // Validate and Process Items
    if (items) {
      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'Items must be a non-empty array', 400);
      }

      // Batch fetch items
      const itemIds = items.map(i => i.item);
      // ✅ FIX: Add company filter to prevent cross-company item access
      const itemDocs = await Item.find({ 
        _id: { $in: itemIds },
        ...addCompanyFilter({}, req)
      });
      const itemMap = new Map(itemDocs.map(i => [i._id.toString(), i]));

      const processedItems = [];
      let subTotal = 0;
      let taxTotal = 0;

      for (const item of items) {
        const itemDoc = itemMap.get(item.item);
        if (!itemDoc) {
          return errorResponse(res, `Item ${item.item} not found`, 404);
        }

        // Only check active status if item is changing or new
        if (!itemDoc.isActive) {
          return errorResponse(res, `Item "${itemDoc.name}" is no longer active`, 400);
        }

        const quantity = Number(item.quantity);
        const rate = Number(item.rate || item.price || itemDoc.sellingPrice);
        const taxRate = Number(item.tax || item.taxRate || 0);

        if (quantity <= 0.01) {
          return errorResponse(res, 'Item quantity must be greater than 0', 400);
        }

        if (rate < 0) {
          return errorResponse(res, 'Item rate cannot be negative', 400);
        }

        const amount = quantity * rate;
        const taxAmount = amount * (taxRate / 100);

        subTotal += amount;
        taxTotal += taxAmount;

        processedItems.push({
          item: itemDoc._id,
          itemDetails: {
            name: itemDoc.name,
            description: itemDoc.description,
            type: itemDoc.type,
            sellingPrice: itemDoc.sellingPrice
          },
          quantity,
          rate,
          tax: taxRate,
          amount
        });
      }

      invoice.items = processedItems;
      invoice.subTotal = subTotal;
      invoice.taxTotal = taxTotal;
    }

    // Update other fields
    if (invoiceDate) invoice.invoiceDate = invoiceDate;
    if (dueDate) invoice.dueDate = dueDate;
    if (terms !== undefined) invoice.terms = terms;
    if (notes !== undefined) invoice.notes = notes;

    // Status update rules:
    if (status) {
      if (status === 'paid') {
        return errorResponse(res, 'Cannot manually set status to Paid. Please record a payment.', 400);
      }
      if (status === 'cancelled' && invoice.amountPaid > 0) {
        // Allow cancellation but warn? For now just allow it, pre-save hook handles logic
      }
      invoice.status = status;
    }

    // Recalculate Final Totals (Always based on current state)
    const currentSubTotal = invoice.subTotal;
    const currentTaxTotal = invoice.taxTotal;
    const currentDiscount = discount !== undefined ? Math.max(0, Number(discount)) : invoice.discount;
    const currentShipping = shippingCharges !== undefined ? Math.max(0, Number(shippingCharges)) : invoice.shippingCharges;

    invoice.discount = currentDiscount;
    invoice.shippingCharges = currentShipping;
    invoice.total = currentSubTotal + currentTaxTotal + currentShipping - currentDiscount;

    invoice.updatedBy = req.user.id;
    await invoice.save();

    successResponse(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    console.error('[updateInvoice] Error:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.downloadInvoice = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Invoice, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    })
      .populate('customer')
      .populate('items.item');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const pdfGenerator = new PDFGenerator();
    const fileName = `invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    pdfGenerator.generateInvoice(invoice, invoice.customer, invoice.items, filePath);

    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        res.download(filePath, fileName, (err) => {
          if (err) {
            errorResponse(res, 'Error downloading file', 500);
          }
        });
      } else {
        errorResponse(res, 'PDF generation failed', 500);
      }
    }, 800);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Admin only)
exports.deleteInvoice = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Invoice, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return errorResponse(res, 'Only draft invoices can be deleted', 400);
    }

    await invoice.deleteOne();

    successResponse(res, 'Invoice deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Mark invoice as sent
// @route   PATCH /api/invoices/:id/send
// @access  Private
exports.markAsSent = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Invoice, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    if (invoice.status !== 'draft') {
      return errorResponse(res, `Invoice is already ${invoice.status}`, 400);
    }

    invoice.status = 'sent';
    invoice.sentDate = new Date();
    await invoice.save();

    successResponse(res, 'Invoice marked as sent', invoice);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Record payment (Non-Transactional - MongoDB Standalone)
// @route   POST /api/invoices/:id/payments
// @access  Private
// 
// REFACTORED: Works without MongoDB transactions for standalone deployments
// Uses sequential operations with validation to ensure data consistency
exports.recordPayment = async (req, res) => {
  // Extract companyId from user (never trust req.body.company)
  const companyId = req.user.company?._id || req.user.company;
  const userId = req.user._id;
  const invoiceId = req.params.id;

  try {
    // ============================================
    // STEP 1: Fetch invoice with company filter
    // ============================================
    // Multi-tenancy: Always filter by company to prevent cross-company access
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      ...addCompanyFilter({}, req)
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    // ============================================
    // STEP 2: Validate invoice status
    // ============================================
    // Strict accounting: Cannot pay draft or cancelled invoices
    if (['draft', 'cancelled'].includes(invoice.status)) {
      return errorResponse(res, `Cannot record payment for ${invoice.status} invoices. Please send the invoice first.`, 400);
    }

    // Check if already fully paid
    const { FINANCIAL_TOLERANCE } = require('../utils/financialConstants');
    if (invoice.status === 'paid' && invoice.balanceDue <= FINANCIAL_TOLERANCE) {
      return errorResponse(res, 'This invoice is already fully paid.', 400);
    }

    // ============================================
    // STEP 3: Payment validation & idempotency
    // ============================================
    const { amount, paymentMethod, paymentDate, notes, idempotencyKey } = req.body;
    
    // ✅ CRITICAL FIX: Idempotency check - prevent duplicate payments
    if (idempotencyKey) {
      const existingPayment = invoice.payments.find(p => 
        p.idempotencyKey === idempotencyKey
      );
      if (existingPayment) {
        return successResponse(res, 'Payment already recorded (idempotent)', invoice);
      }
    }
    
    // ✅ CRITICAL FIX: Duplicate payment detection (heuristic check)
    // Check for similar payment within last 5 minutes (same amount, method, date)
    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentDuplicate = invoice.payments.find(p => {
      const pDate = new Date(p.date);
      return Math.abs(p.amount - Number(amount)) < 0.01 && // Same amount (within 1 cent)
             p.method === (paymentMethod || 'cash') &&
             pDate >= fiveMinutesAgo && // Within last 5 minutes
             Math.abs(pDate - paymentDateObj) < 60000; // Within 1 minute of each other
    });
    
    if (recentDuplicate) {
      return errorResponse(res, 
        'A similar payment was recently recorded. If this is intentional, please wait a moment and try again with a different amount or method.', 
        400
      );
    }
    
    // Validate payment amount is a number
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount)) {
      return errorResponse(res, 'Payment amount must be a valid number.', 400);
    }
    
    // Reject zero or negative payments
    if (paymentAmount <= 0) {
      return errorResponse(res, 'Payment amount must be greater than zero.', 400);
    }

    // Recalculate balance to prevent overpayment
    const total = Number(invoice.total);
    const paid = Number(invoice.amountPaid);
    const currentBalance = total - paid;

    // Prevent overpayment (with financial tolerance for floating-point errors)
    if (paymentAmount > currentBalance + FINANCIAL_TOLERANCE) {
      return errorResponse(res, `Payment amount ($${paymentAmount.toFixed(2)}) exceeds the remaining balance ($${currentBalance.toFixed(2)}).`, 400);
    }

    // ============================================
    // STEP 4: Update invoice (amountPaid and status)
    // ============================================
    // Update amount paid
    invoice.amountPaid = paid + paymentAmount;

    // ✅ CRITICAL FIX: Add payment record with idempotency key
    invoice.payments.push({
      amount: paymentAmount,
      method: paymentMethod || 'cash',
      date: paymentDate || new Date(),
      note: notes,
      idempotencyKey: idempotencyKey || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate if not provided
    });

    // Save invoice (pre-save hook will update balanceDue and status automatically)
    await invoice.save();

    // If invoice save fails, error will be caught and payment won't be recorded
    // This ensures consistency: invoice state and payment record are updated together

    // ============================================
    // STEP 5: Create notification (non-blocking)
    // ============================================
    // Best-effort notification creation
    // If this fails, payment is still recorded (notification is not critical)
    createNotification({
      user: userId,
      type: 'payment',
      title: 'Payment Recorded',
      message: `Payment of $${paymentAmount.toFixed(2)} recorded for Invoice #${invoice.invoiceNumber}.`,
      link: `/invoices/${invoice._id}`
    }).catch(err => {
      console.warn('[recordPayment] Failed to create notification:', err.message);
      // Don't throw - notification failure shouldn't break payment
    });

    // ============================================
    // STEP 6: Audit log (best-effort, non-blocking)
    // ============================================
    // Activity logging is handled by middleware, but we can add payment-specific log
    // This is non-blocking - payment succeeds even if logging fails
    const ActivityLog = require('../models/ActivityLog');
    ActivityLog.create({
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      company: companyId,
      action: 'payment_recorded',
      entityType: 'invoice',
      entityId: invoiceId,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount: paymentAmount,
        paymentMethod: paymentMethod || 'cash',
        previousBalance: currentBalance,
        newBalance: currentBalance - paymentAmount
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(err => {
      console.warn('[recordPayment] Failed to create activity log:', err.message);
      // Don't throw - audit log failure shouldn't break payment
    });

    // ============================================
    // SUCCESS: Return updated invoice
    // ============================================
    successResponse(res, `Payment of $${paymentAmount.toFixed(2)} recorded for Invoice #${invoice.invoiceNumber}.`, invoice);

  } catch (error) {
    // ✅ CRITICAL FIX: Always log full error server-side (never expose stack in response)
    console.error('[recordPayment] Error:', {
      invoiceId,
      userId,
      companyId,
      endpoint: req.path,
      method: req.method,
      error: error.message,
      stack: error.stack // ✅ Always log stack server-side only
    });

    // Return appropriate error response (never expose stack)
    if (error.name === 'ValidationError') {
      return errorResponse(res, error.message, 400);
    }
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid invoice ID', 400);
    }

    // Generic server error (safe message, no stack trace)
    errorResponse(res, 'Failed to record payment. Please try again.', 500);
  }
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats/overview
// @access  Private
exports.getInvoiceStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.invoiceDate = {};
      if (startDate) matchStage.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.invoiceDate.$lte = end;
      }
    }

    // Exclude cancelled invoices from stats
    matchStage.status = { $ne: 'cancelled' };
    
    // Add company filter (unless super admin)
    if (req.user.role !== 'super_admin' && req.user.company) {
      matchStage.company = req.user.company._id || req.user.company;
    }

    // Determine trend grouping format
    let trendGroupFormat = "%Y-%m";
    if (groupBy === 'day') trendGroupFormat = "%Y-%m-%d";
    if (groupBy === 'year') trendGroupFormat = "%Y";

    const stats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalInvoices: [
            { $count: 'count' }
          ],
          totalRevenue: [
            {
              $group: {
                _id: null,
                // FIX ISSUE #1: Exclude draft and cancelled from totalInvoiced
                // Only count invoices that represent real business activity
                totalInvoiced: {
                  $sum: {
                    $cond: [
                      { $not: [{ $in: ['$status', ['draft', 'cancelled']] }] },
                      '$total',
                      0
                    ]
                  }
                },
                paid: { $sum: '$amountPaid' },
                // FIX: Only include sent, partially_paid, and overdue in outstanding
                // Draft invoices are NOT real Accounts Receivable
                outstanding: {
                  $sum: {
                    $cond: [
                      {
                        $in: ['$status', ['sent', 'partially_paid', 'overdue']]
                      },
                      '$balanceDue',
                      0
                    ]
                  }
                }
              }
            }
          ],
          byStatus: [
            // FIX ISSUE #6: Exclude draft and cancelled from status breakdown
            // These are internal/voided and shouldn't appear in business metrics
            { $match: { status: { $nin: ['draft', 'cancelled'] } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$total' }
              }
            }
          ],
          trend: [
            // CRITICAL: Filter out invoices without invoiceDate before $dateToString
            // Otherwise $dateToString will throw error on null dates (causes 500)
            { $match: { invoiceDate: { $ne: null, $exists: true } } },
            {
              $group: {
                _id: { $dateToString: { format: trendGroupFormat, date: "$invoiceDate" } },
                count: { $sum: 1 },
                revenue: { $sum: "$amountPaid" }
              }
            },
            { $sort: { "_id": 1 } },
            {
              $project: {
                _id: 0,
                date: "$_id",
                count: 1,
                revenue: 1
              }
            }
          ]
        }
      }
    ]);

    successResponse(res, 'Invoice statistics retrieved', stats[0]);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export invoices
// @route   GET /api/invoices/export/csv
// @access  Private
exports.exportInvoices = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let query = addCompanyFilter({}, req);
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }
    if (status) query.status = status;



    const invoices = await Invoice.find(query)
      .populate('customer', 'fullName')
      .select('invoiceNumber invoiceDate dueDate customer total status amountPaid balanceDue')
      .sort('invoiceDate');

    // Convert to CSV
    const csvHeader = 'Invoice Number,Invoice Date,Due Date,Customer,Total,Status,Amount Paid,Balance Due\n';
    const csvRows = invoices.map(invoice => {
      return [
        invoice.invoiceNumber,
        new Date(invoice.invoiceDate).toLocaleDateString(),
        new Date(invoice.dueDate).toLocaleDateString(),
        `"${invoice.customer?.fullName || ''}"`,
        invoice.total,
        invoice.status,
        invoice.amountPaid,
        invoice.balanceDue
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;


    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csv);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};