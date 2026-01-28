const Item = require('../models/Item');
const {
  successResponse,
  errorResponse,
  paginatedResponse
} = require('../utils/response');

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

    // Execute query
    const items = await Item.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name');

    // Get total count
    const total = await Item.countDocuments(query);

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
    const item = await Item.findById(req.params.id)
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

    const item = await Item.create({
      type: type || 'Goods',
      name,
      description,
      sellingPrice,
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
    const item = await Item.findById(req.params.id);

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
    const item = await Item.findById(req.params.id);

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
    const item = await Item.findById(req.params.id);

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
    const stats = await Item.aggregate([
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
    const items = await Item.find()
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