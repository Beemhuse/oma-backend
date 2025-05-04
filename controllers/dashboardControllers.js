import { client } from "../sanity/client.js";

export const getDashboardStats = async (req, res) => {
    try {
      // Get current date and calculate date 6 months ago
      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 5); // 5 because we want 6 months total
      
      // Fetch member statistics
      const stats = await client.fetch(`
        {
          "total": count(*[_type == "member"]),
          "active": count(*[_type == "member" && membershipStatus == "Active"]),
          "suspended": count(*[_type == "member" && membershipStatus == "Suspended"]),
          "inactive": count(*[_type == "member" && membershipStatus == "Inactive"])
        }
      `);
  console.log(stats)
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
  
      res.status(200).json({
        success: true,
          stats: stats,
          monthlyRegistrations: monthlyRegistrations
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