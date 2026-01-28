const SalesReceipt = require('../models/SalesReceipt');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Invoice = require('../models/Invoice');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { generateReceiptNumber } = require('../utils/generateId');
const withOptionalTransaction = require('../utils/withOptionalTransaction');
const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notificationController');

// @desc    Get all sales receipts
// @route   GET /api/receipts
// @access  Private
exports.getAllReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-receiptDate',
      search,
      status,
      customerId,
      paymentMethod,
      startDate,
      endDate
    } = req.query;

    // Build query
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { salesReceiptNumber: { $regex: search, $options: 'i' } },
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

    // Filter by payment method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.receiptDate = {};
      if (startDate) {
        query.receiptDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.receiptDate.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const receipts = await SalesReceipt.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'fullName email phone')
      .populate('createdBy', 'name email');

    // Get total count
    const total = await SalesReceipt.countDocuments(query);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Sales receipts retrieved successfully', receipts, pagination);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single receipt
// @route   GET /api/receipts/:id
// @access  Private
exports.getReceipt = async (req, res) => {
  try {
    const receipt = await SalesReceipt.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name email')
      .populate('items.item', 'name description sellingPrice');

    if (!receipt) {
      return errorResponse(res, 'Sales receipt not found', 404);
    }

    successResponse(res, 'Sales receipt retrieved successfully', receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create sales receipt
// @route   POST /api/receipts
// @access  Private
exports.createReceipt = async (req, res) => {
  try {
    const {
      customer,
      receiptDate,
      items,
      subTotal,
      discount,
      shippingCharges,
      taxTotal,
      total,
      paymentMethod,
      paymentReference,
      notes,
      invoice, // Capturing to block
      invoiceId // Capturing to block
    } = req.body;

    // SECURITY GUARD: Block any attempt to link to an invoice
    if (invoice || invoiceId) {
      return errorResponse(res, 'Sales receipts are for standalone POS transactions only and cannot be linked to invoices. Use "Record Payment" on the Invoice page instead.', 400);
    }

    // Customer is now optional for walk-in sales
    let customerDoc = null;
    if (customer) {
      customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return errorResponse(res, 'Customer not found', 404);
      }
    }

    // Validate items and populate itemDetails according to schema
    const validatedItems = [];
    for (const item of items) {
      const itemDoc = await Item.findById(item.item);
      if (!itemDoc) {
        return errorResponse(res, `Item ${item.item} not found`, 404);
      }

      // Build item object matching receiptItemSchema exactly
      const itemDetails = {
        name: itemDoc.name || '',
        description: itemDoc.description || '',
        type: itemDoc.type || 'Goods',
        sellingPrice: Number(itemDoc.sellingPrice) || 0
      };

      validatedItems.push({
        item: item.item, // ObjectId - required
        quantity: Number(item.quantity), // Number - required, min 0.01
        rate: Number(item.rate), // Number - required, min 0
        tax: Number(item.tax) || 0, // Number - default 0
        amount: Number(item.amount), // Number - required, min 0
        discount: Number(item.discount) || 0, // Number - default 0
        itemDetails
      });
    }

    // Generate receipt number
    const salesReceiptNumber = await generateReceiptNumber();

    // Create receipt matching salesReceiptSchema exactly
    const receipt = await SalesReceipt.create({
      customer: customer || undefined, // Optional for walk-in sales
      customerDetails: customerDoc ? {
        name: customerDoc.fullName || '',
        phone: customerDoc.phone || ''
      } : {
        name: 'Walk-in Customer',
        phone: ''
      },
      salesReceiptNumber,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      items: validatedItems,
      subTotal: Number(subTotal),
      discount: Number(discount) || 0,
      shippingCharges: Number(shippingCharges) || 0,
      taxTotal: Number(taxTotal) || 0,
      total: Number(total),
      paymentMethod: paymentMethod || 'cash',
      paymentReference: paymentReference || undefined,
      notes: notes || undefined,
      status: 'completed', // Force completed for real revenue
      source: 'pos', // Force POS only
      createdBy: req.user.id
    });

    // Create notification
    await createNotification({
      user: req.user.id,
      type: 'payment',
      title: 'New Receipt Created',
      message: `Receipt #${receipt.salesReceiptNumber} has been created manually.`,
      link: `/receipts/${receipt._id}`
    });

    successResponse(res, 'Sales receipt created successfully', receipt, 201);
  } catch (error) {
    console.error('Error creating receipt:', error);
    errorResponse(res, error.message || 'Failed to create receipt', 500);
  }
};

// @desc    Update sales receipt
// @route   PUT /api/receipts/:id
// @access  Private
exports.updateReceipt = async (req, res) => {
  try {
    const receipt = await SalesReceipt.findById(req.params.id);

    if (!receipt) {
      return errorResponse(res, 'Sales receipt not found', 404);
    }

    // Prevent updates on cancelled receipts
    if (receipt.status === 'cancelled') {
      return errorResponse(res, 'Cannot update cancelled receipt', 400);
    }

    const {
      customer,
      receiptDate,
      items,
      subTotal,
      discount,
      shippingCharges,
      taxTotal,
      total,
      paymentMethod,
      paymentReference,
      notes,
      status
    } = req.body;

    // Update customer/customerDetails
    if (customer !== undefined) {
      const customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return errorResponse(res, 'Customer not found', 404);
      }
      receipt.customer = customer;
      receipt.customerDetails = {
        name: customerDoc.fullName || '',
        phone: customerDoc.phone || ''
      };
    }

    // Update items (and rebuild itemDetails)
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'Items are required', 400);
      }

      const validatedItems = [];
      for (const item of items) {
        const itemDoc = await Item.findById(item.item);
        if (!itemDoc) {
          return errorResponse(res, `Item ${item.item} not found`, 404);
        }

        const itemDetails = {
          name: itemDoc.name || '',
          description: itemDoc.description || '',
          type: itemDoc.type || 'Goods',
          sellingPrice: Number(itemDoc.sellingPrice) || 0
        };

        validatedItems.push({
          item: item.item,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          tax: Number(item.tax) || 0,
          amount: Number(item.amount),
          discount: Number(item.discount) || 0,
          itemDetails
        });
      }

      receipt.items = validatedItems;
    }

    if (receiptDate !== undefined) {
      receipt.receiptDate = receiptDate ? new Date(receiptDate) : receipt.receiptDate;
    }
    if (subTotal !== undefined) receipt.subTotal = Number(subTotal);
    if (discount !== undefined) receipt.discount = Number(discount) || 0;
    if (shippingCharges !== undefined) receipt.shippingCharges = Number(shippingCharges) || 0;
    if (taxTotal !== undefined) receipt.taxTotal = Number(taxTotal) || 0;
    if (total !== undefined) receipt.total = Number(total);
    if (paymentMethod !== undefined) receipt.paymentMethod = paymentMethod;
    if (paymentReference !== undefined) receipt.paymentReference = paymentReference;
    if (notes !== undefined) receipt.notes = notes;
    if (status !== undefined) {
      // Only allow 'completed' or 'cancelled'
      receipt.status = ['completed', 'cancelled'].includes(status) ? status : 'completed';
    } else {
      receipt.status = 'completed';
    }

    receipt.source = 'pos'; // Enforce POS source

    receipt.updatedBy = req.user.id;
    await receipt.save();

    successResponse(res, 'Sales receipt updated successfully', receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete sales receipt
// @route   DELETE /api/receipts/:id
// @access  Private (Admin only)
exports.deleteReceipt = async (req, res) => {
  try {
    const receipt = await SalesReceipt.findById(req.params.id);

    if (!receipt) {
      return errorResponse(res, 'Sales receipt not found', 404);
    }

    await receipt.deleteOne();

    successResponse(res, 'Sales receipt deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Download receipt PDF
// @route   GET /api/receipts/:id/download
// @access  Private
exports.downloadReceipt = async (req, res) => {
  try {
    const receipt = await SalesReceipt.findById(req.params.id)
      .populate('customer')
      .populate('items.item');

    if (!receipt) {
      return errorResponse(res, 'Sales receipt not found', 404);
    }

    // Generate PDF (similar to invoice)
    const pdfGenerator = new PDFGenerator();
    const fileName = `receipt-${receipt.salesReceiptNumber}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    // Modify PDF generator for receipt or use same
    pdfGenerator.generateInvoice(receipt, receipt.customer, receipt.items, filePath);

    // Send file after generation
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
    }, 1000);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get receipt statistics
// @route   GET /api/receipts/stats/overview
// @access  Private
exports.getReceiptStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.receiptDate = {};
      if (startDate) matchStage.receiptDate.$gte = new Date(startDate);
      if (endDate) matchStage.receiptDate.$lte = new Date(endDate);
    }

    const stats = await SalesReceipt.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalReceipts: [
            { $count: 'count' }
          ],
          totalAmount: [
            {
              $group: {
                _id: null,
                total: { $sum: '$total' }
              }
            }
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                amount: { $sum: '$total' }
              }
            }
          ],
          recentReceipts: [
            { $sort: { receiptDate: -1 } },
            { $limit: 5 },
            {
              $project: {
                salesReceiptNumber: 1,
                customerDetails: 1,
                total: 1,
                paymentMethod: 1,
                receiptDate: 1
              }
            }
          ]
        }
      }
    ]);

    successResponse(res, 'Receipt statistics retrieved', stats[0]);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export receipts
// @route   GET /api/receipts/export/csv
// @access  Private
exports.exportReceipts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.receiptDate = {};
      if (startDate) query.receiptDate.$gte = new Date(startDate);
      if (endDate) query.receiptDate.$lte = new Date(endDate);
    }

    const receipts = await SalesReceipt.find(query)
      .populate('customer', 'fullName')
      .select('salesReceiptNumber receiptDate customer total paymentMethod status')
      .sort('receiptDate');

    // Convert to CSV
    const csvHeader = 'Receipt Number,Date,Customer,Total,Payment Method,Status\n';
    const csvRows = receipts.map(receipt => {
      return [
        receipt.salesReceiptNumber,
        new Date(receipt.receiptDate).toLocaleDateString(),
        `"${receipt.customer?.fullName || ''}"`,
        receipt.total,
        receipt.paymentMethod,
        receipt.status
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=receipts.csv');
    res.send(csv);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};