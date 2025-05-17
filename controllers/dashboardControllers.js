// controllers/dashboardController.js
import { client } from "../sanity/client.js";
import { cachedFetch } from "../utils/cache.js";

const CACHE_DURATION = 5 * 60 * 1000; 

// Cache keys
const CACHE_KEYS = {
  MEMBER_STATS: 'member-stats',
  MONTHLY_REGISTRATIONS: 'monthly-registrations',
  TRANSACTION_STATS: 'transaction-stats',
  MONTHLY_TRANSACTIONS: 'monthly-transactions',
  RECENT_TRANSACTIONS: 'recent-transactions'
};

export const getDashboardStats = async (req, res) => {
    try {
        // Get current date and calculate date ranges
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(currentDate.getFullYear() - 1);
        oneYearAgo.setHours(0, 0, 0, 0);

        // 1. Fetch member statistics with caching
        const stats = await cachedFetch(CACHE_KEYS.MEMBER_STATS, async () => {
            return client.fetch(`
                {
                    "total": count(*[_type == "member"]),
                    "active": count(*[_type == "member" && membershipStatus == "Active"]),
                    "suspended": count(*[_type == "member" && membershipStatus == "Suspended"]),
                    "inactive": count(*[_type == "member" && membershipStatus == "Inactive"])
                }
            `);
        });

        // 2. Fetch monthly registrations with caching
        const registrationData = await cachedFetch(CACHE_KEYS.MONTHLY_REGISTRATIONS, async () => {
            return client.fetch(`
                *[_type == "member" && defined(_createdAt) && _createdAt >= $sixMonthsAgo] {
                    "createdAt": _createdAt
                }
            `, { sixMonthsAgo: sixMonthsAgo.toISOString() });
        });

        const monthlyRegistrations = processMonthlyData(
            registrationData, 
            'createdAt', 
            6,
            false
        );

        // 3. Fetch transaction statistics with caching
        const transactionData = await cachedFetch(CACHE_KEYS.TRANSACTION_STATS, async () => {
            return client.fetch(`*[_type == "transaction" && defined(transactionDate)]`);
        });
        
        const completedTransactions = transactionData.filter(tx => tx.status === 'success');
        const totalRevenue = completedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const completedCount = completedTransactions.length;

        const transactionStats = {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalTransactions: transactionData.length,
            averageTransaction: completedCount > 0
                ? parseFloat((totalRevenue / completedCount).toFixed(2))
                : 0,
            success: completedCount,
            pending: transactionData.filter(tx => tx.status === 'pending').length,
            failed: transactionData.filter(tx => tx.status === 'failed').length
        };

        // 4. Fetch monthly transactions with caching
        const transactionMonthlyData = await cachedFetch(CACHE_KEYS.MONTHLY_TRANSACTIONS, async () => {
            return client.fetch(`
                *[_type == "transaction" && defined(transactionDate) && transactionDate >= $oneYearAgo] {
                    transactionDate,
                    amount,
                    status
                }
            `, { oneYearAgo: oneYearAgo.toISOString() });
        });

        const monthlyTransactions = processMonthlyData(
            transactionMonthlyData,
            'transactionDate',
            12,
            true,
            tx => tx.status === 'success' ? tx.amount : 0
        );

        // 5. Fetch recent transactions with caching
        const recentTransactions = await cachedFetch(CACHE_KEYS.RECENT_TRANSACTIONS, async () => {
            return client.fetch(`
                *[_type == "transaction"] | order(_createdAt desc)[0...5] {
                    _id,
                    amount,
                    type,
                    status,
                    "date": _createdAt,
                    name,
                }
            `);
        });

        res.status(200).json({
            success: true,
            stats: {
                members: stats,
                transactions: transactionStats
            },
            monthlyRegistrations,
            monthlyTransactions,
            recentTransactions: recentTransactions.map(tx => ({
                id: tx._id,
                name: tx.name || 'Unknown',
                amount: tx.amount,
                type: tx.type,
                date: tx.date,
                status: tx.status
            })),
            cacheInfo: {
                cached: true,
                expiresIn: `${CACHE_DURATION / (60 * 1000)} minutes`
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};

// Helper function to process monthly data
function processMonthlyData(data, dateField, monthsBack, isAmount = false, valueFn = () => 1) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create a map for all months in range
    const resultMap = {};
    const now = new Date();
    
    for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        resultMap[key] = {
            month: monthNames[month],
            year,
            value: 0
        };
    }

    // Process each data item
    data.forEach(item => {
        const date = new Date(item[dateField]);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${year}-${String(month).padStart(2, '0')}`;
        
        if (resultMap[key]) {
            resultMap[key].value += isAmount ? valueFn(item) : 1;
        }
    });

    // Convert to array and format
    return Object.values(resultMap).map(entry => ({
        month: entry.month,
        [isAmount ? 'total' : 'count']: isAmount 
            ? parseFloat(entry.value.toFixed(2)) 
            : entry.value
    }));
}