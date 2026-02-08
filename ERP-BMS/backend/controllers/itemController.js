const Item = require('../models/Item');
const {
  successResponse,
  errorResponse,
  paginatedResponse
} = require('../utils/response');
const { addCompanyFilter, validateCompanyOwnership } = require('../middleware/companyScope');

/**
 * GET ALL ITEMS
 */
exports.getAllItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      type,
      isActive
    } = req.query;

    // Build query
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Add company filter
    const companyFilteredQuery = addCompanyFilter(query, req);

    // Execute query
    const items = await Item.find(companyFilteredQuery)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name');

    // Get total count
    const total = await Item.countDocuments(companyFilteredQuery);

    // Calculate pagination
    paginatedResponse(res, 'Items retrieved successfully', items, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * GET SINGLE ITEM
 */
exports.getItem = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Item, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Item not found', 404);
    }

    const item = await Item.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    })
      .populate('createdBy', 'name');

    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }

    successResponse(res, 'Item retrieved successfully', item);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * CREATE ITEM
 */
exports.createItem = async (req, res) => {
  try {
    const { type, name, description, sellingPrice } = req.body;

    // Get company ID
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId && req.user.role !== 'super_admin') {
      return errorResponse(res, 'Company association required', 400);
    }

    const item = await Item.create({
      type: type || 'Goods',
      name,
      description,
      sellingPrice,
      company: companyId,
      createdBy: req.user.id
    });

    successResponse(res, 'Item created successfully', item, 201);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * UPDATE ITEM
 */
exports.updateItem = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Item, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Item not found', 404);
    }

    const item = await Item.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }

    // Update fields
    const { type, name, description, sellingPrice, isActive } = req.body;
    
    if (type !== undefined) item.type = type;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (sellingPrice !== undefined) item.sellingPrice = sellingPrice;
    if (isActive !== undefined) item.isActive = isActive;

    await item.save();

    successResponse(res, 'Item updated successfully', item);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * DELETE ITEM
 */
exports.deleteItem = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Item, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Item not found', 404);
    }

    const item = await Item.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }

    await item.deleteOne();
    successResponse(res, 'Item deleted successfully');
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * TOGGLE ITEM STATUS
 */
exports.toggleItemStatus = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Item, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Item not found', 404);
    }

    const item = await Item.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!item) {
      return errorResponse(res, 'Item not found', 404);
    }

    item.isActive = !item.isActive;
    await item.save();

    successResponse(res, 'Item status updated', {
      isActive: item.isActive
    });
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * ITEM STATISTICS (FIXED - removed stockQuantity reference)
 */
exports.getItemStats = async (req, res) => {
  try {
    // Add company match stage
    const companyMatch = req.user.role === 'super_admin' ? {} : { company: req.user.company._id || req.user.company };

    const stats = await Item.aggregate([
      { $match: companyMatch },
      {
        $facet: {
          totalItems: [
            { $count: 'count' }
          ],
          activeItems: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    successResponse(res, 'Item statistics retrieved', stats[0]);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};

/**
 * EXPORT ITEMS CSV
 */
exports.exportItems = async (req, res) => {
  try {
    const items = await Item.find(addCompanyFilter({}, req))
      .select('type name description sellingPrice isActive')
      .sort('type name');

    const csv =
      'Type,Name,Description,Selling Price,Status\n' +
      items.map(i =>
        `"${i.type}","${i.name}","${i.description || ''}",${i.sellingPrice},${i.isActive ? 'Active' : 'Inactive'}`
      ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=items.csv');
    res.send(csv);
  } catch (err) {
    errorResponse(res, err.message, 500);
  }
};