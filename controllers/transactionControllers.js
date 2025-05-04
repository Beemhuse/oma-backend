import { client } from "../sanity/client.js";



// View Transactions
export const getTransactions = async (req, res) => {
  try {
    const transactions = await client.fetch(`*[_type == "transaction"]`);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching transactions' });
  }
};

export const getTransactionById = async (req, res) => {
    const { id } = req.params;
  
    try {
      // First try to find by the transaction's ID field
      let transaction = await client.fetch(
        `*[_type == "transaction" && id == $id][0]`,
        { id }
      );
  
      // If not found by ID, try by _id
      if (!transaction) {
        transaction = await client.fetch(
          `*[_type == "transaction" && _id == $id][0]`,
          { id }
        );
      }
  
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
  
      // Format dates to ISO strings for consistency
      const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toISOString();
      };
  
      const formattedTransaction = {
        ...transaction,
        transactionDate: formatDate(transaction.transactionDate),
        _createdAt: formatDate(transaction._createdAt),
        _updatedAt: formatDate(transaction._updatedAt)
      };
  
      res.status(200).json({
        success: true,
        ...formattedTransaction
      });
  
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };