import { client } from "../sanity/client.js";

export const getDashboardStats = async (req, res) => {
    try {
        // Get current date and calculate date ranges
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 5); // 5 because we want 6 months total
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

        // Fetch member statistics
        const stats = await client.fetch(`
            {
                "total": count(*[_type == "member"]),
                "active": count(*[_type == "member" && membershipStatus == "Active"]),
                "suspended": count(*[_type == "member" && membershipStatus == "Suspended"]),
                "inactive": count(*[_type == "member" && membershipStatus == "Inactive"])
            }
        `);

        // Fetch monthly registrations
        const monthlyRegistrations = await client.fetch(`
            *[_type == "member" && _createdAt >= $sixMonthsAgo] | 
            order(_createdAt asc) {
                "month": dateTime(_createdAt).month,
                "year": dateTime(_createdAt).year
            }
        `, { sixMonthsAgo: sixMonthsAgo.toISOString() })
            .then(results => {
                // Group by month and count
                const monthCounts = results.reduce((acc, { month, year }) => {
                    const monthYear = `${year}-${String(month).padStart(2, '0')}`;
                    acc[monthYear] = (acc[monthYear] || 0) + 1;
                    return acc;
                }, {});

                // Format for chart (last 6 months)
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const lastSixMonths = [];

                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const month = date.getMonth() + 1; // JS months are 0-indexed
                    const year = date.getFullYear();
                    const monthYear = `${year}-${String(month).padStart(2, '0')}`;

                    lastSixMonths.push({
                        month: monthNames[date.getMonth()],
                        count: monthCounts[monthYear] || 0
                    });
                }

                return lastSixMonths;
            });
        const transactionData = await client.fetch(`
            *[_type == "transaction"]
        `);
        const completedTransactions = transactionData.filter((tx) => tx.status === 'success');
        const totalRevenue = completedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const completedCount = completedTransactions.length;

        // Fetch transaction statistics
        const transactionStats = {
            totalRevenue: parseFloat(
                transactionData
                    .filter((tx) => tx.status === 'success')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0)
                    .toFixed(2)
            ),
            totalTransactions: transactionData.length,
            averageTransaction: completedCount > 0
                ? parseFloat((totalRevenue / completedCount).toFixed(2))
                : 0,
            success: transactionData.filter((tx) => tx.status === 'success').length,
            pending: transactionData.filter((tx) => tx.status === 'pending').length,
            failed: transactionData.filter((tx) => tx.status === 'failed').length
        };

        // Fetch recent transactions (last 5)
        const recentTransactions = await client.fetch(`
            *[_type == "transaction"] | order(_createdAt desc)[0...5] {
                _id,
                amount,
                type,
                status,
                "date": _createdAt,
                name,
            }
        `);

        // 1. Get current date minus one year
        // const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // 2. Fetch monthly transactions for the last year
        const monthlyTransactions = await client.fetch(
            `
    *[_type == "transaction" && transactionDate >= $oneYearAgo] {
      "month": dateTime(transactionDate).month,
      "year": dateTime(transactionDate).year,
      amount,
      status
    }
  `,
            { oneYearAgo: oneYearAgo.toISOString() }
        ).then(results => {
            // 3. Group by month-year key and sum amounts of successful transactions
            const monthlySums = results.reduce((acc, { month, year, amount, status }) => {
                if (status !== 'success') return acc;

                const monthYear = `${year}-${String(month).padStart(2, '0')}`;
                acc[monthYear] = (acc[monthYear] || 0) + amount;
                return acc;
            }, {});

            // 4. Build chart data for the last 12 months
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const lastTwelveMonths = [];

            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);

                const month = date.getMonth() + 1; // JS months are 0-indexed
                const year = date.getFullYear();
                const key = `${year}-${String(month).padStart(2, '0')}`;

                lastTwelveMonths.push({
                    month: monthNames[month - 1],
                    total: monthlySums[key] ? parseFloat(monthlySums[key].toFixed(2)) : 0,
                });
            }

            return lastTwelveMonths;
        });


        res.status(200).json({
            success: true,
            stats: {
                members: stats,
                transactions: transactionStats
            },
            monthlyRegistrations: monthlyRegistrations,
            monthlyTransactions: monthlyTransactions,
            recentTransactions: recentTransactions.map(tx => ({
                id: tx._id,
                name: tx.name || 'Unknown',
                amount: tx.amount,
                type: tx.type,
                date: tx.date,
                status: tx.status
            }))
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