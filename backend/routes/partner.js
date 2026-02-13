const express = require('express');
const router = express.Router();

const getApiKey = (req) =>
  req.headers['x-api-key'] || req.query.apiKey || req.body?.apiKey;

/**
 * GET /api/partner/causes
 * List causes (used by Causes page and widget).
 */
router.get('/causes', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    res.json({
      success: true,
      page,
      limit,
      causes: [],
    });
  } catch (error) {
    console.error('Partner causes error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch causes' });
  }
});

/**
 * POST /api/partner/sponsorships
 * Create a sponsorship (widget or direct). Per api_integration_guide.
 * Body: causeId, sponsorName, sponsorEmail, amount?, affiliateId?
 * Headers: X-API-Key (optional)
 */
router.post('/sponsorships', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const { causeId, sponsorName, sponsorEmail, amount, affiliateId } = req.body || {};

    if (!causeId) {
      return res.status(400).json({
        success: false,
        message: 'causeId is required',
      });
    }

    const sponsorshipId = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    res.status(201).json({
      success: true,
      sponsorshipId,
      message: 'Sponsorship created',
      ...(affiliateId && { affiliateId }),
    });
  } catch (error) {
    console.error('Partner sponsorships error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create sponsorship',
    });
  }
});

module.exports = router;
