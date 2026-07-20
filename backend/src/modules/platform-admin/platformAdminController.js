import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';

// GET /api/platform-admin/stats
export async function getStats(req, res, next) {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses, totalUsers, activeUsers,
      newBusinessesThisWeek, newUsersThisWeek,
      newBusinessesThisMonth, newUsersThisMonth,
    ] = await Promise.all([
      Business.countDocuments(),
      AppUser.countDocuments(),
      AppUser.countDocuments({ status: 'Active' }),
      Business.countDocuments({ createdAt: { $gte: startOfWeek } }),
      AppUser.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Business.countDocuments({ createdAt: { $gte: startOfMonth } }),
      AppUser.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    res.json({
      totalBusinesses,
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newBusinessesThisWeek,
      newUsersThisWeek,
      newBusinessesThisMonth,
      newUsersThisMonth,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/platform-admin/businesses
export async function listBusinesses(req, res, next) {
  try {
    const businesses = await Business.find({}).sort({ createdAt: -1 }).lean();
    const businessIds = businesses.map((b) => b._id);

    const users = await AppUser.find({ businessId: { $in: businessIds } })
      .select('businessId name email role status lastLogin')
      .lean();

    const usersByBusiness = new Map();
    for (const u of users) {
      const key = String(u.businessId);
      if (!usersByBusiness.has(key)) usersByBusiness.set(key, []);
      usersByBusiness.get(key).push(u);
    }

    const result = businesses.map((b) => {
      const bizUsers = usersByBusiness.get(String(b._id)) ?? [];
      const owner = bizUsers.find((u) => u.role === 'Super Admin') ?? bizUsers[0];
      const lastActivity = bizUsers.reduce((latest, u) => (
        u.lastLogin && u.lastLogin > latest ? u.lastLogin : latest
      ), '');

      return {
        id: b._id,
        name: b.name,
        createdAt: b.createdAt,
        userCount: bizUsers.length,
        ownerName: owner?.name ?? '',
        ownerEmail: owner?.email ?? '',
        lastActivity: lastActivity || null,
      };
    });

    res.json({ businesses: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/platform-admin/users?search=
export async function listUsers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const users = await AppUser.find(filter).sort({ createdAt: -1 }).lean();
    const businessIds = [...new Set(users.map((u) => String(u.businessId)).filter(Boolean))];
    const businesses = await Business.find({ _id: { $in: businessIds } }).select('name category').lean();
    const businessNameById = new Map(businesses.map((b) => [String(b._id), b.name]));
    const businessCategoryById = new Map(businesses.map((b) => [String(b._id), b.category]));

    const result = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      businessId: u.businessId,
      businessName: u.businessId ? (businessNameById.get(String(u.businessId)) ?? '') : '',
      category: u.businessId ? (businessCategoryById.get(String(u.businessId)) ?? '') : (u.category || ''),
      signupMethod: u.googleId ? 'Google' : 'Email',
      lastLogin: u.lastLogin || null,
      createdAt: u.createdAt,
    }));

    res.json({ users: result });
  } catch (err) {
    next(err);
  }
}
